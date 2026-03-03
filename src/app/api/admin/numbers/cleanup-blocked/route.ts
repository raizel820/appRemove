/**
 * POST /api/admin/numbers/cleanup-blocked
 * Convert BLOCKED numbers to REUSABLE state
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Find all BLOCKED numbers
    const blockedNumbers = await db.orderNumbers.findMany({
      where: {
        state: 'BLOCKED',
      },
    });

    if (blockedNumbers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No blocked numbers found',
        count: 0,
      });
    }

    // Convert all BLOCKED to REUSABLE
    const result = await db.orderNumbers.updateMany({
      where: {
        state: 'BLOCKED',
      },
      data: {
        state: 'REUSABLE',
      },
    });

    return NextResponse.json({
      success: true,
      message: `Unblocked ${result.count} numbers`,
      count: result.count,
    });
  } catch (error) {
    console.error('Error cleaning up blocked numbers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
