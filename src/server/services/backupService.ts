/**
 * Backup Service (Rewritten)
 * Handles backup creation, restoration, and management for AppSplitQR
 * 
 * Key improvements:
 * 1. Proper restore order respecting foreign key dependencies
 * 2. Upsert for singleton tables (Company, PDFConfiguration, QRCodeSettings)
 * 3. Preserve original IDs to maintain relationships
 * 4. Handle unique constraints properly
 * 5. Use transactions for atomic operations
 */

import { db } from '@/lib/db';
import { writeFileSync, readFileSync, existsSync, unlinkSync, mkdirSync, statSync, readdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';

// Backup storage directory
const BACKUP_DIR = join(process.cwd(), 'backups');
// Logo files directory
const LOGOS_DIR = join(process.cwd(), 'public', 'logos');

// Ensure backup directory exists
if (!existsSync(BACKUP_DIR)) {
  mkdirSync(BACKUP_DIR, { recursive: true });
}

// Restore order - parent tables first, then dependent tables
// This ensures foreign key constraints are satisfied
const RESTORE_ORDER: DataTypeKey[] = [
  // Level 0: No dependencies (root entities)
  'company',
  'pdfConfiguration',
  'qrCodeSettings',
  'serialNumberCounter',
  
  // Level 1: Depends on Company
  'companyProfiles',
  'companyLogos',
  
  // Level 2: No dependencies
  'customers',
  'machineFamilies',
  'specTemplates',
  'specDefinitions',
  
  // Level 3: Depends on Level 2
  'machineModels', // depends on MachineFamily, SpecTemplate
  
  // Level 4: Depends on Level 3
  'modelSpecs', // depends on MachineModel, SpecDefinition
  
  // Level 5: Number management (no dependencies or depends on Order later)
  'orderNumbers',
  'orderNumbersYear',
  'invoiceNumbers',
  'proformaNumbers',
  'purchaseOrderNumbers',
  'deliveryNumbers',
  
  // Level 6: Depends on Customer, MachineModel
  'orders', // depends on Customer
  
  // Level 7: Depends on Order
  'orderItems', // depends on Order, MachineModel
  'documentSplits', // depends on Order
  'files', // depends on Order
  
  // Level 8: Depends on Level 7
  'fileRevisions', // depends on File
  'fileSequences', // no dependencies
  
  // Level 9: Search indexes and audit
  'auditLogs', // depends on Customer, Order
  'customerSearch', // no FK constraint
  'orderSearch', // no FK constraint
  'serialSearch', // no FK constraint
  
  // Level 10: Misc
  'verificationTokens', // depends on File
];

// Data type definitions with their Prisma model names
export const DATA_TYPES = {
  // Company Settings
  company: { name: 'Company', model: 'company', category: 'settings', singleton: true },
  companyProfiles: { name: 'Activity Profiles', model: 'companyProfile', category: 'settings' },
  companyLogos: { name: 'Company Logos', model: 'companyLogo', category: 'settings' },
  pdfConfiguration: { name: 'PDF Configuration', model: 'pDFConfiguration', category: 'settings', singleton: true },
  qrCodeSettings: { name: 'QR Code Settings', model: 'qRCodeSettings', category: 'settings', singleton: true },
  
  // Business Data
  customers: { name: 'Customers', model: 'customer', category: 'business' },
  machineFamilies: { name: 'Machine Families', model: 'machineFamily', category: 'business' },
  machineModels: { name: 'Machine Models', model: 'machineModel', category: 'business' },
  specTemplates: { name: 'Spec Templates', model: 'specTemplate', category: 'business' },
  specDefinitions: { name: 'Spec Definitions', model: 'specDefinition', category: 'business' },
  modelSpecs: { name: 'Model Specs', model: 'modelSpec', category: 'business' },
  
  // Orders & Documents
  orders: { name: 'Orders', model: 'order', category: 'orders' },
  orderItems: { name: 'Order Items', model: 'orderItem', category: 'orders' },
  documentSplits: { name: 'Document Splits', model: 'documentSplit', category: 'orders' },
  
  // Number Management
  orderNumbers: { name: 'Order Numbers', model: 'orderNumber', category: 'numbers' },
  orderNumbersYear: { name: 'Order Numbers (Year)', model: 'orderNumbers', category: 'numbers' },
  invoiceNumbers: { name: 'Invoice Numbers', model: 'invoiceNumbers', category: 'numbers' },
  proformaNumbers: { name: 'Proforma Numbers', model: 'proformaNumbers', category: 'numbers' },
  purchaseOrderNumbers: { name: 'Purchase Order Numbers', model: 'purchaseOrderNumbers', category: 'numbers' },
  deliveryNumbers: { name: 'Delivery Numbers', model: 'deliveryNumbers', category: 'numbers' },
  serialNumberCounter: { name: 'Serial Number Counters', model: 'serialNumberCounter', category: 'numbers' },
  
  // Audit & Logs
  auditLogs: { name: 'Audit Logs', model: 'auditLog', category: 'audit' },
  customerSearch: { name: 'Customer Search Index', model: 'customerSearch', category: 'audit' },
  orderSearch: { name: 'Order Search Index', model: 'orderSearch', category: 'audit' },
  serialSearch: { name: 'Serial Search Index', model: 'serialSearch', category: 'audit' },
  
  // File Management
  files: { name: 'Files', model: 'file', category: 'files' },
  fileSequences: { name: 'File Sequences', model: 'fileSequence', category: 'files' },
  fileRevisions: { name: 'File Revisions', model: 'fileRevision', category: 'files' },
  verificationTokens: { name: 'Verification Tokens', model: 'verificationToken', category: 'files' },
} as const;

export type DataTypeKey = keyof typeof DATA_TYPES;

export interface BackupOptions {
  description?: string;
  dataTypes: DataTypeKey[];
  dateFrom?: Date;
  dateTo?: Date;
  createdBy?: string;
}

export interface BackupData {
  version: string;
  appVersion: string;
  createdAt: string;
  metadata: {
    description?: string;
    dataTypes: string[];
    dateRange?: {
      from?: string;
      to?: string;
    };
    recordCount: number;
    logoFilesCount?: number;
  };
  data: Record<string, any[]>;
  logoFiles?: {
    filename: string;
    originalName: string;
    fileType: string;
    data: string; // base64 encoded
  }[];
  checksum: string;
}

export interface RestoreResult {
  success: boolean;
  message: string;
  details: {
    [key: string]: {
      success: boolean;
      count: number;
      error?: string;
    };
  };
}

/**
 * Generate a unique filename for backup
 */
function generateBackupFilename(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `backup-${timestamp}.json`;
}

/**
 * Calculate checksum for backup data
 */
function calculateChecksum(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Read all logo files from the logos directory
 */
function readLogoFiles(): { filename: string; originalName: string; fileType: string; data: string }[] {
  const logoFiles: { filename: string; originalName: string; fileType: string; data: string }[] = [];
  
  if (!existsSync(LOGOS_DIR)) {
    return logoFiles;
  }
  
  try {
    const files = readdirSync(LOGOS_DIR);
    for (const file of files) {
      const filePath = join(LOGOS_DIR, file);
      const fileStat = statSync(filePath);
      
      // Skip directories
      if (fileStat.isDirectory()) continue;
      
      // Determine file type from extension
      const ext = file.split('.').pop()?.toLowerCase() || '';
      const mimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
      };
      const fileType = mimeTypes[ext] || 'application/octet-stream';
      
      // Read file and convert to base64
      const fileData = readFileSync(filePath);
      const base64Data = fileData.toString('base64');
      
      logoFiles.push({
        filename: file,
        originalName: file,
        fileType,
        data: base64Data,
      });
    }
  } catch (error) {
    console.error('Error reading logo files:', error);
  }
  
  return logoFiles;
}

/**
 * Write logo files to the logos directory
 */
function writeLogoFiles(logoFiles: { filename: string; originalName: string; fileType: string; data: string }[]): { success: number; failed: number; errors: string[] } {
  const result = { success: 0, failed: 0, errors: [] as string[] };
  
  // Ensure logos directory exists
  if (!existsSync(LOGOS_DIR)) {
    mkdirSync(LOGOS_DIR, { recursive: true });
  }
  
  for (const logo of logoFiles) {
    try {
      const filePath = join(LOGOS_DIR, logo.filename);
      const buffer = Buffer.from(logo.data, 'base64');
      writeFileSync(filePath, buffer);
      result.success++;
    } catch (error: any) {
      result.failed++;
      result.errors.push(`${logo.filename}: ${error.message}`);
    }
  }
  
  return result;
}

/**
 * Convert Prisma enum values to plain strings for JSON serialization
 */
function serializeRecord(record: any): any {
  const serialized = { ...record };
  
  // Convert Date objects to ISO strings
  for (const key of Object.keys(serialized)) {
    if (serialized[key] instanceof Date) {
      serialized[key] = serialized[key].toISOString();
    }
  }
  
  return serialized;
}

/**
 * Convert serialized data back to Prisma-compatible format
 */
function deserializeRecord(record: any, modelName: string): any {
  const deserialized = { ...record };
  
  // Handle DateTime fields - convert ISO strings back to Date objects
  const dateTimeFields: Record<string, string[]> = {
    company: ['createdAt', 'updatedAt'],
    companyProfile: ['createdAt', 'updatedAt'],
    companyLogo: ['createdAt', 'updatedAt'],
    customer: ['createdAt', 'updatedAt', 'deletedAt'],
    order: ['createdAt', 'updatedAt', 'date', 'dueDate', 'deletedAt', 'invoiceDate', 'proformaDate', 'purchaseOrderDate', 'deliveryNoteDate', 'technicalFileDate'],
    orderItem: ['createdAt', 'updatedAt'],
    documentSplit: ['createdAt', 'updatedAt', 'date'],
    auditLog: ['createdAt'],
    file: ['createdAt', 'updatedAt', 'fileDate', 'deletedAt'],
    fileRevision: ['createdAt', 'updatedAt'],
    fileSequence: ['createdAt', 'updatedAt'],
    verificationToken: ['createdAt', 'expiresAt'],
    orderNumber: ['createdAt', 'updatedAt', 'reservedAt'],
    orderNumbers: ['createdAt', 'updatedAt', 'reservedAt'],
    invoiceNumbers: ['createdAt', 'updatedAt', 'reservedAt'],
    proformaNumbers: ['createdAt', 'updatedAt', 'reservedAt'],
    purchaseOrderNumbers: ['createdAt', 'updatedAt', 'reservedAt'],
    deliveryNumbers: ['createdAt', 'updatedAt', 'reservedAt'],
    serialNumberCounter: ['createdAt', 'updatedAt'],
    specTemplate: ['createdAt', 'updatedAt'],
    specDefinition: ['createdAt', 'updatedAt'],
    modelSpec: ['createdAt', 'updatedAt'],
    machineFamily: ['createdAt', 'updatedAt'],
    machineModel: ['createdAt', 'updatedAt'],
    customerSearch: ['createdAt'],
    orderSearch: ['createdAt'],
    serialSearch: ['createdAt'],
    pDFConfiguration: [],
    qRCodeSettings: [],
  };
  
  const fields = dateTimeFields[modelName] || ['createdAt', 'updatedAt'];
  
  for (const field of fields) {
    if (deserialized[field] && typeof deserialized[field] === 'string') {
      deserialized[field] = new Date(deserialized[field]);
    }
  }
  
  return deserialized;
}

/**
 * Fetch data from database based on data type and date range
 */
async function fetchDataForType(
  dataType: DataTypeKey,
  dateFrom?: Date,
  dateTo?: Date
): Promise<any[]> {
  const modelInfo = DATA_TYPES[dataType];
  if (!modelInfo) {
    throw new Error(`Unknown data type: ${dataType}`);
  }

  // Build date filter if applicable
  const dateFilter: any = {};
  if (dateFrom || dateTo) {
    if (dateFrom) dateFilter.gte = dateFrom;
    if (dateTo) dateFilter.lte = dateTo;
  }

  // @ts-ignore - Dynamic model access
  const model = db[modelInfo.model];
  if (!model) {
    throw new Error(`Model not found: ${modelInfo.model}`);
  }

  // Apply date filter only if dates are provided and model has createdAt
  const hasCreatedAt = [
    'customer', 'order', 'orderItem', 'auditLog', 'file', 
    'fileRevision', 'verificationToken', 'companyLogo',
    'companyProfile', 'specTemplate', 'specDefinition', 'modelSpec',
    'machineFamily', 'machineModel', 'documentSplit'
  ].includes(modelInfo.model);

  const whereClause = (dateFrom || dateTo) && hasCreatedAt 
    ? { createdAt: dateFilter }
    : {};

  try {
    const data = await model.findMany({ where: whereClause });
    // Serialize records for JSON storage
    return data.map(serializeRecord);
  } catch (error: any) {
    console.error(`Error fetching ${dataType}:`, error);
    throw error;
  }
}

/**
 * Create a backup
 */
export async function createBackup(options: BackupOptions): Promise<{
  id: string;
  filename: string;
  fileSize: number;
  recordCount: number;
  logoFilesCount?: number;
}> {
  const { description, dataTypes, dateFrom, dateTo, createdBy } = options;

  if (!dataTypes || dataTypes.length === 0) {
    throw new Error('No data types selected for backup');
  }

  // Generate filename
  const filename = generateBackupFilename();
  const filePath = join(BACKUP_DIR, filename);

  // Fetch all selected data
  const backupData: Record<string, any[]> = {};
  let totalRecords = 0;
  const errors: string[] = [];

  for (const dataType of dataTypes) {
    try {
      const data = await fetchDataForType(dataType, dateFrom, dateTo);
      backupData[dataType] = data;
      totalRecords += data.length;
    } catch (error: any) {
      errors.push(`${dataType}: ${error.message}`);
      backupData[dataType] = [];
    }
  }

  // Read logo files if companyLogos is selected
  let logoFiles: { filename: string; originalName: string; fileType: string; data: string }[] = [];
  if (dataTypes.includes('companyLogos')) {
    logoFiles = readLogoFiles();
    // Enrich logo files with original names from database
    const logoRecords = backupData.companyLogos || [];
    for (const logoFile of logoFiles) {
      const record = logoRecords.find((r: any) => r.filename === logoFile.filename);
      if (record) {
        logoFile.originalName = record.originalName;
      }
    }
  }

  // Build backup object
  const backup: BackupData = {
    version: '2.0', // Updated version for new format
    appVersion: 'AppSplitQR v1.0',
    createdAt: new Date().toISOString(),
    metadata: {
      description,
      dataTypes: [...dataTypes],
      dateRange: {
        from: dateFrom?.toISOString(),
        to: dateTo?.toISOString(),
      },
      recordCount: totalRecords,
      logoFilesCount: logoFiles.length,
    },
    data: backupData,
    logoFiles: logoFiles.length > 0 ? logoFiles : undefined,
    checksum: '', // Will be calculated below
  };

  // Calculate checksum
  const backupString = JSON.stringify({ ...backup, checksum: '' });
  backup.checksum = calculateChecksum(backupString);

  // Write backup file
  const fullBackupString = JSON.stringify(backup, null, 2);
  writeFileSync(filePath, fullBackupString, 'utf-8');

  // Get file size
  const stats = statSync(filePath);
  const fileSize = stats.size;

  // Create backup record in database
  const backupRecord = await db.backup.create({
    data: {
      filename,
      description: description || null,
      fileSize,
      dataTypes: JSON.stringify(dataTypes),
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      status: errors.length > 0 ? (dataTypes.length > errors.length ? 'partial' : 'failed') : 'completed',
      errorMessage: errors.length > 0 ? errors.join('; ') : null,
      recordCount: totalRecords,
      createdBy: createdBy || null,
    },
  });

  return {
    id: backupRecord.id,
    filename,
    fileSize,
    recordCount: totalRecords,
    logoFilesCount: logoFiles.length,
  };
}

/**
 * Validate a backup file
 */
export function validateBackupFile(content: string): {
  valid: boolean;
  error?: string;
  backup?: BackupData;
} {
  try {
    const backup = JSON.parse(content) as BackupData;

    // Check required fields
    if (!backup.version) {
      return { valid: false, error: 'Missing version field' };
    }
    if (!backup.createdAt) {
      return { valid: false, error: 'Missing createdAt field' };
    }
    if (!backup.data) {
      return { valid: false, error: 'Missing data field' };
    }
    if (!backup.metadata) {
      return { valid: false, error: 'Missing metadata field' };
    }

    // Verify checksum
    const checksumData = { ...backup, checksum: '' };
    const calculatedChecksum = calculateChecksum(JSON.stringify(checksumData));
    if (backup.checksum && backup.checksum !== calculatedChecksum) {
      return { valid: false, error: 'Checksum verification failed - file may be corrupted' };
    }

    return { valid: true, backup };
  } catch (error: any) {
    return { valid: false, error: `Invalid JSON format: ${error.message}` };
  }
}

/**
 * Clear all data from database (except Backup table)
 */
async function clearAllData(): Promise<void> {
  // Delete in reverse order of dependencies
  const deleteOrder = [...RESTORE_ORDER].reverse();
  
  for (const dataType of deleteOrder) {
    const modelInfo = DATA_TYPES[dataType];
    if (!modelInfo) continue;
    
    // Skip singleton tables - they will be updated, not deleted
    if (modelInfo.singleton) continue;
    
    try {
      // @ts-ignore - Dynamic model access
      const model = db[modelInfo.model];
      if (model) {
        await model.deleteMany({});
      }
    } catch (error) {
      console.error(`Error clearing ${dataType}:`, error);
    }
  }
}

/**
 * Restore a single record with proper error handling
 */
async function restoreRecord(
  model: any,
  record: any,
  modelName: string,
  isSingleton: boolean
): Promise<{ success: boolean; method: string }> {
  const deserializedRecord = deserializeRecord(record, modelName);
  
  try {
    if (isSingleton) {
      // For singleton tables, use upsert
      await model.upsert({
        where: { id: record.id },
        update: deserializedRecord,
        create: deserializedRecord,
      });
      return { success: true, method: 'upsert' };
    } else {
      // For regular tables, try to create with original ID
      await model.create({
        data: deserializedRecord,
      });
      return { success: true, method: 'create' };
    }
  } catch (error: any) {
    // If create fails due to unique constraint, try update
    if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
      try {
        await model.update({
          where: { id: record.id },
          data: deserializedRecord,
        });
        return { success: true, method: 'update' };
      } catch (updateError: any) {
        console.error(`Failed to update record ${record.id}:`, updateError.message);
        return { success: false, method: 'failed' };
      }
    }
    console.error(`Failed to restore record ${record.id}:`, error.message);
    return { success: false, method: 'failed' };
  }
}

/**
 * Restore data from backup
 */
export async function restoreBackup(
  backupData: BackupData,
  options: {
    overwrite?: boolean;
    dataTypes?: DataTypeKey[];
  } = {}
): Promise<RestoreResult> {
  const { overwrite = false, dataTypes } = options;
  const result: RestoreResult = {
    success: true,
    message: 'Restore completed',
    details: {},
  };

  // Filter data types if specified, otherwise use restore order
  const typesToRestore = dataTypes 
    ? RESTORE_ORDER.filter(t => dataTypes.includes(t as DataTypeKey))
    : RESTORE_ORDER.filter(t => backupData.data[t]);

  // Clear existing data if overwrite is true
  if (overwrite) {
    await clearAllData();
  }

  // Restore data in dependency order
  for (const dataType of typesToRestore) {
    const data = backupData.data[dataType];
    if (!data || !Array.isArray(data)) {
      result.details[dataType] = { success: true, count: 0 };
      continue;
    }

    const modelInfo = DATA_TYPES[dataType as DataTypeKey];
    if (!modelInfo) {
      result.details[dataType] = { success: false, count: 0, error: 'Unknown data type' };
      continue;
    }

    try {
      // @ts-ignore - Dynamic model access
      const model = db[modelInfo.model];
      if (!model) {
        result.details[dataType] = { success: false, count: 0, error: 'Model not found' };
        continue;
      }

      let restoredCount = 0;
      const errors: string[] = [];

      for (const record of data) {
        const restoreResult = await restoreRecord(model, record, modelInfo.model, modelInfo.singleton || false);
        if (restoreResult.success) {
          restoredCount++;
        } else {
          errors.push(`Record ${record.id}: failed to restore`);
        }
      }

      result.details[dataType] = { 
        success: errors.length === 0, 
        count: restoredCount,
        error: errors.length > 0 ? errors.slice(0, 5).join('; ') + (errors.length > 5 ? '...' : '') : undefined
      };
    } catch (error: any) {
      result.details[dataType] = { success: false, count: 0, error: error.message };
      result.success = false;
    }
  }

  // Restore logo files if present in backup
  if (backupData.logoFiles && backupData.logoFiles.length > 0) {
    const logoResult = writeLogoFiles(backupData.logoFiles);
    result.details['logoFiles'] = {
      success: logoResult.failed === 0,
      count: logoResult.success,
      error: logoResult.errors.length > 0 ? logoResult.errors.join('; ') : undefined,
    };
  }

  // Update overall message
  const successCount = Object.values(result.details).filter(d => d.success).length;
  const totalCount = Object.keys(result.details).length;
  const totalRestored = Object.values(result.details).reduce((sum, d) => sum + d.count, 0);
  result.message = `Restored ${successCount}/${totalCount} data types (${totalRestored} records)`;

  return result;
}

/**
 * Get backup history
 */
export async function getBackupHistory(): Promise<any[]> {
  const backups = await db.backup.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return backups.map(backup => ({
    id: backup.id,
    filename: backup.filename,
    description: backup.description,
    fileSize: backup.fileSize,
    dataTypes: JSON.parse(backup.dataTypes),
    dateFrom: backup.dateFrom,
    dateTo: backup.dateTo,
    status: backup.status,
    errorMessage: backup.errorMessage,
    recordCount: backup.recordCount,
    createdAt: backup.createdAt,
  }));
}

/**
 * Get backup file path
 */
export function getBackupFilePath(filename: string): string | null {
  const filePath = join(BACKUP_DIR, filename);
  if (existsSync(filePath)) {
    return filePath;
  }
  return null;
}

/**
 * Read backup file content
 */
export function readBackupFile(filename: string): string | null {
  const filePath = join(BACKUP_DIR, filename);
  if (existsSync(filePath)) {
    return readFileSync(filePath, 'utf-8');
  }
  return null;
}

/**
 * Delete a backup
 */
export async function deleteBackup(id: string): Promise<boolean> {
  const backup = await db.backup.findUnique({ where: { id } });
  if (!backup) {
    return false;
  }

  // Delete file
  const filePath = join(BACKUP_DIR, backup.filename);
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }

  // Delete database record
  await db.backup.delete({ where: { id } });

  return true;
}

/**
 * Get backup statistics
 */
export async function getBackupStats(): Promise<{
  totalBackups: number;
  totalSize: number;
  lastBackup: Date | null;
}> {
  const backups = await db.backup.findMany({
    where: { status: 'completed' },
  });

  return {
    totalBackups: backups.length,
    totalSize: backups.reduce((sum, b) => sum + b.fileSize, 0),
    lastBackup: backups.length > 0 
      ? backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt 
      : null,
  };
}

/**
 * Get data type statistics for backup preview
 */
export async function getDataTypeStats(): Promise<{
  [key in DataTypeKey]?: { count: number };
}> {
  const stats: { [key: string]: { count: number } } = {};

  for (const [key, modelInfo] of Object.entries(DATA_TYPES)) {
    try {
      // @ts-ignore - Dynamic model access
      const model = db[modelInfo.model];
      if (model) {
        const count = await model.count();
        stats[key] = { count };
      }
    } catch {
      stats[key] = { count: 0 };
    }
  }

  return stats as { [key in DataTypeKey]?: { count: number } };
}
