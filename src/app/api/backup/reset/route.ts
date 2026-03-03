/**
 * Reset API Routes
 * POST - Reset backup system or reset whole app (except backups)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { existsSync, readdirSync, unlinkSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { defaultQRCodeConfig } from '@/lib/qrCodeUtils';

// Backup storage directory
const BACKUP_DIR = join(process.cwd(), 'backups');
// Logo files directory
const LOGOS_DIR = join(process.cwd(), 'public', 'logos');
// Database file path
const DB_PATH = join(process.cwd(), 'db', 'dev.db');

// Data type definitions with their Prisma model names (in delete order - reverse of restore order)
const DELETE_ORDER = [
  // Level 10: Misc (most dependent first)
  'verificationToken',
  'serialSearch',
  'orderSearch',
  'customerSearch',
  'auditLog',
  
  // Level 8-9: File management
  'fileRevision',
  'fileSequence',
  'file',
  
  // Level 7: Order dependent
  'documentSplit',
  'orderItem',
  'order',
  
  // Level 5-6: Number management
  'deliveryNumbers',
  'purchaseOrderNumbers',
  'proformaNumbers',
  'invoiceNumbers',
  'orderNumbers',
  'orderNumber',
  
  // Level 4: Model specs
  'modelSpec',
  
  // Level 3: Machine models
  'machineModel',
  
  // Level 2: Independent entities
  'specDefinition',
  'specTemplate',
  'machineFamily',
  'customer',
  
  // Level 1: Company dependent
  'companyLogo',
  'companyProfile',
  
  // Level 0: Singleton tables (reset to defaults)
  'serialNumberCounter',
  'qRCodeSettings',
  'pDFConfiguration',
  'company',
];

/**
 * Reset backup system - clear all backups
 */
async function resetBackupSystem(): Promise<{ success: boolean; message: string; details: any }> {
  try {
    // Delete all backup records from database
    const deletedBackups = await db.backup.deleteMany({});
    
    // Delete all backup files from filesystem
    let deletedFiles = 0;
    let failedFiles = 0;
    
    if (existsSync(BACKUP_DIR)) {
      const files = readdirSync(BACKUP_DIR);
      for (const file of files) {
        try {
          const filePath = join(BACKUP_DIR, file);
          unlinkSync(filePath);
          deletedFiles++;
        } catch (error) {
          failedFiles++;
        }
      }
    }
    
    return {
      success: true,
      message: 'Backup system reset successfully',
      details: {
        deletedRecords: deletedBackups.count,
        deletedFiles,
        failedFiles,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to reset backup system: ${error.message}`,
      details: { error: error.message },
    };
  }
}

/**
 * Reset whole app except backup system
 */
async function resetApp(): Promise<{ success: boolean; message: string; details: any }> {
  try {
    const details: Record<string, { deleted: number; error?: string }> = {};
    
    // Delete all data in correct order (respecting foreign keys)
    for (const modelName of DELETE_ORDER) {
      try {
        // @ts-ignore - Dynamic model access
        const model = db[modelName];
        if (model) {
          const result = await model.deleteMany({});
          details[modelName] = { deleted: result.count };
        }
      } catch (error: any) {
        details[modelName] = { deleted: 0, error: error.message };
      }
    }
    
    // Clear logo files
    let deletedLogos = 0;
    if (existsSync(LOGOS_DIR)) {
      const files = readdirSync(LOGOS_DIR);
      for (const file of files) {
        try {
          const filePath = join(LOGOS_DIR, file);
          unlinkSync(filePath);
          deletedLogos++;
        } catch (error) {
          // Ignore errors
        }
      }
    }
    
    // Re-initialize default company
    const company = await db.company.create({
      data: {
        id: 'default',
        name: 'EURL LA SOURCE',
        address: 'M\'sila, Algeria',
        currency: 'DZD',
        defaultLanguage: 'fr',
      },
    });
    
    // Re-initialize default PDF configuration
    const pdfConfig = await db.pDFConfiguration.create({
      data: {
        id: 'default',
      },
    });
    
    // Re-initialize default QR Code settings
    const qrSettings = await db.qRCodeSettings.create({
      data: {
        config: JSON.stringify(defaultQRCodeConfig),
      },
    });
    
    const totalDeleted = Object.values(details).reduce((sum, d) => sum + d.deleted, 0);
    
    return {
      success: true,
      message: `App reset successfully. ${totalDeleted} records deleted. Default company initialized.`,
      details: {
        ...details,
        deletedLogos,
        initialized: {
          company: company.id,
          pdfConfiguration: pdfConfig.id,
          qrCodeSettings: qrSettings.id,
        },
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to reset app: ${error.message}`,
      details: { error: error.message },
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (action === 'resetBackupSystem') {
      const result = await resetBackupSystem();
      return NextResponse.json(result);
    } else if (action === 'resetApp') {
      const result = await resetApp();
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid action. Use "resetBackupSystem" or "resetApp".' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error in reset:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
