/**
 * Filesystem Storage Adapter Implementation
 * Manages file system operations for the invoice app
 */

import { StorageAdapter } from './storageAdapter';
import { mkdir, writeFile, readFile, access, constants } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync } from 'fs';

export class FsStorageAdapter implements StorageAdapter {
  private baseDataPath: string;

  constructor(baseDataPath?: string) {
    // Default base path: ~/EurlLaSource/Data or C:/EurlLaSource/Data on Windows
    const isWindows = process.platform === 'win32';
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';

    if (baseDataPath) {
      this.baseDataPath = baseDataPath;
    } else if (isWindows) {
      this.baseDataPath = 'C:/EurlLaSource/Data';
    } else {
      this.baseDataPath = join(homeDir, 'EurlLaSource/Data');
    }
  }

  getBaseDataPath(): string {
    return this.baseDataPath;
  }

  async ensureDirectory(path: string): Promise<void> {
    if (!existsSync(path)) {
      await mkdir(path, { recursive: true });
    }
  }

  async createCustomerFolder(customerId: string, customerName: string): Promise<string> {
    // Create folder name: CustomerFullName_ID
    const folderName = `${customerName}_${customerId}`;
    const customerPath = join(this.baseDataPath, 'Customers', folderName);

    // Ensure base directories exist
    await this.ensureDirectory(this.baseDataPath);
    await this.ensureDirectory(join(this.baseDataPath, 'Customers'));
    await this.ensureDirectory(customerPath);

    // Create subdirectories
    const subdirs = ['PROFORMAS', 'INVOICES', 'DELIVERY_NOTES', 'PURCHASE_ORDERS', 'MACHINE_NAMEPLATES', 'ATTACHMENTS'];
    for (const subdir of subdirs) {
      await this.ensureDirectory(join(customerPath, subdir));
    }

    return customerPath;
  }

  async savePDF(
    customerId: string,
    pdfType: string,
    numberFormatted: string,
    date: Date,
    customerShort: string,
    pdfBuffer: Buffer
  ): Promise<string> {
    // Generate filename: TYPE_numberFormatted_YYYYMMDD_customerShort.pdf
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const fileName = `${pdfType}_${numberFormatted}_${dateStr}_${customerShort}.pdf`;
    const safeCustomerName = customerName.replace(/[^a-zA-Z0-9_-]/g, '_');

    // Get customer folder path
    const customerFolder = await this.getCustomerFolder(customerId);

    // Map PDF type to directory
    const typeDirMap: Record<string, string> = {
      'INVOICE': 'INVOICES',
      'PROFORMA': 'PROFORMAS',
      'DELIVERY_NOTE': 'DELIVERY_NOTES',
      'PURCHASE_ORDER': 'PURCHASE_ORDERS',
      'NAMEPLATE': 'MACHINE_NAMEPLATES',
    };

    const typeDir = typeDirMap[pdfType] || pdfType.toUpperCase();
    const filePath = join(customerFolder, typeDir, fileName);

    // Write the file
    await writeFile(filePath, pdfBuffer);

    return filePath;
  }

  async saveAttachment(customerId: string, fileName: string, buffer: Buffer): Promise<string> {
    const customerFolder = await this.getCustomerFolder(customerId);
    const attachmentsPath = join(customerFolder, 'ATTACHMENTS', fileName);

    await writeFile(attachmentsPath, buffer);
    return attachmentsPath;
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async readFile(path: string): Promise<Buffer> {
    return readFile(path);
  }

  async deleteFile(path: string): Promise<void> {
    const { unlink } = await import('fs/promises');
    await unlink(path);
  }

  private async getCustomerFolder(customerId: string): Promise<string> {
    // Find customer folder by ID - this is a simplified implementation
    // In a real app, you'd query the database to get the folder path
    const customersPath = join(this.baseDataPath, 'Customers');

    // For now, we'll scan the directory for a folder ending with _customerId
    const { readdir } = await import('fs/promises');
    const entries = await readdir(customersPath);

    for (const entry of entries) {
      if (entry.endsWith(`_${customerId}`)) {
        return join(customersPath, entry);
      }
    }

    throw new Error(`Customer folder not found for ID: ${customerId}`);
  }

  /**
   * Get the customer folder path by customer ID and name
   * This method generates the path without checking if it exists
   */
  getCustomerFolderByInfo(customerId: string, customerName: string): string {
    const folderName = `${customerName}_${customerId}`;
    return join(this.baseDataPath, 'Customers', folderName);
  }
}

// Singleton instance
let storageInstance: FsStorageAdapter | null = null;

export function getStorageAdapter(basePath?: string): FsStorageAdapter {
  if (!storageInstance) {
    storageInstance = new FsStorageAdapter(basePath);
  }
  return storageInstance;
}
