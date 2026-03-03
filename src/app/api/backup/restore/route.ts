/**
 * Backup Restore API Route
 * POST - Restore data from uploaded backup file
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateBackupFile, restoreBackup } from '@/server/services/backupService';
import { z } from 'zod';

// Validation schema for restore options
const RestoreSchema = z.object({
  backupData: z.any(), // Will be validated separately
  overwrite: z.boolean().optional().default(false),
  dataTypes: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate backup data structure
    const validation = validateBackupFile(JSON.stringify(body.backupData));
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid backup file' },
        { status: 400 }
      );
    }

    const backupData = validation.backup!;
    const { overwrite = false, dataTypes } = body;

    // Perform restore
    const result = await restoreBackup(backupData, {
      overwrite,
      dataTypes: dataTypes as any,
    });

    return NextResponse.json({
      success: result.success,
      message: result.message,
      details: result.details,
    });
  } catch (error: any) {
    console.error('Error restoring backup:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to restore backup' },
      { status: 500 }
    );
  }
}

// Validate endpoint - check backup file without restoring
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const backupContent = typeof body.content === 'string' 
      ? body.content 
      : JSON.stringify(body.content);

    const validation = validateBackupFile(backupContent);
    
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: validation.error,
      });
    }

    const backup = validation.backup!;
    
    // Return validation summary
    return NextResponse.json({
      success: true,
      valid: true,
      summary: {
        version: backup.version,
        appVersion: backup.appVersion,
        createdAt: backup.createdAt,
        description: backup.metadata.description,
        dataTypes: backup.metadata.dataTypes,
        recordCount: backup.metadata.recordCount,
        logoFilesCount: backup.metadata.logoFilesCount || backup.logoFiles?.length || 0,
        dateRange: backup.metadata.dateRange,
      },
      dataTypes: Object.keys(backup.data).map(key => ({
        type: key,
        count: backup.data[key]?.length || 0,
      })),
    });
  } catch (error: any) {
    console.error('Error validating backup:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to validate backup' },
      { status: 500 }
    );
  }
}
