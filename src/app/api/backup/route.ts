/**
 * Backup API Routes
 * GET - Get backup history
 * POST - Create a new backup
 */

import { NextRequest, NextResponse } from 'next/server';
import { createBackup, getBackupHistory, getDataTypeStats } from '@/server/services/backupService';
import { z } from 'zod';

// Validation schema for creating backup
const CreateBackupSchema = z.object({
  description: z.string().optional(),
  dataTypes: z.array(z.string()).min(1, 'At least one data type must be selected'),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'stats') {
      // Get data type statistics
      const stats = await getDataTypeStats();
      return NextResponse.json({ success: true, stats });
    }

    // Get backup history
    const history = await getBackupHistory();
    return NextResponse.json({ success: true, backups: history });
  } catch (error: any) {
    console.error('Error fetching backup data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch backup data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validated = CreateBackupSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validated.error.errors },
        { status: 400 }
      );
    }

    const { description, dataTypes, dateFrom, dateTo } = validated.data;

    // Create backup
    const result = await createBackup({
      description,
      dataTypes: dataTypes as any,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Backup created successfully',
      backup: result,
    });
  } catch (error: any) {
    console.error('Error creating backup:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create backup' },
      { status: 500 }
    );
  }
}
