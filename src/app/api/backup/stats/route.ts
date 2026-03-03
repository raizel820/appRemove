/**
 * Backup Stats API Route
 * GET - Get statistics for each data type
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBackupStats, DATA_TYPES } from '@/server/services/backupService';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const detailed = searchParams.get('detailed') === 'true';

    // Get counts for each data type
    const stats: { [key: string]: { count: number } } = {};

    for (const [key, modelInfo] of Object.entries(DATA_TYPES)) {
      try {
        // @ts-ignore - Dynamic model access
        const model = db[modelInfo.model];
        if (model && typeof model.count === 'function') {
          const count = await model.count();
          stats[key] = { count };
        } else {
          stats[key] = { count: 0 };
        }
      } catch (err) {
        // If model doesn't exist, set count to 0
        stats[key] = { count: 0 };
      }
    }

    // Get backup statistics
    let backupStats = { totalBackups: 0, totalSize: 0, lastBackup: null };
    try {
      // @ts-ignore - Dynamic model access
      if (db.backup && typeof db.backup.findMany === 'function') {
        backupStats = await getBackupStats();
      }
    } catch (err) {
      console.log('Backup table not available yet');
    }

    if (detailed) {
      return NextResponse.json({
        success: true,
        stats,
        backupStats,
        categories: {
          settings: 'Company Settings',
          business: 'Business Data',
          orders: 'Orders & Documents',
          numbers: 'Number Management',
          audit: 'Audit & Logs',
          files: 'File Management',
        },
      });
    }

    return NextResponse.json({
      success: true,
      stats,
      backupStats,
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
