/**
 * Backup [id] API Routes
 * GET - Download backup file
 * DELETE - Delete backup
 */

import { NextRequest, NextResponse } from 'next/server';
import { deleteBackup, getBackupFilePath } from '@/server/services/backupService';
import { db } from '@/lib/db';
import { readFile } from 'fs/promises';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get backup record
    const backup = await db.backup.findUnique({ where: { id } });
    if (!backup) {
      return NextResponse.json(
        { success: false, error: 'Backup not found' },
        { status: 404 }
      );
    }

    // Check if file exists
    const filePath = getBackupFilePath(backup.filename);
    if (!filePath) {
      return NextResponse.json(
        { success: false, error: 'Backup file not found on disk' },
        { status: 404 }
      );
    }

    // Read file content
    const fileContent = await readFile(filePath, 'utf-8');

    // Return as downloadable file
    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${backup.filename}"`,
        'Content-Length': String(backup.fileSize),
      },
    });
  } catch (error: any) {
    console.error('Error downloading backup:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to download backup' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete backup
    const deleted = await deleteBackup(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Backup not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Backup deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting backup:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete backup' },
      { status: 500 }
    );
  }
}
