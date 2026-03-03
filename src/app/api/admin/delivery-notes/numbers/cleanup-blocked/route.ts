/**
 * POST /api/admin/delivery-notes/numbers/cleanup-blocked
 * Unblock all blocked delivery note numbers by changing their state to REUSABLE
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Find all blocked delivery note numbers
    const blockedNumbers = await db.deliveryNumbers.findMany({
      where: {
        state: 'BLOCKED',
      },
    });

    if (blockedNumbers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No blocked delivery note numbers found',
        count: 0,
      });
    }

    // Update all blocked numbers to REUSABLE
    await db.deliveryNumbers.updateMany({
      where: {
        state: 'BLOCKED',
      },
      data: {
        state: 'REUSABLE',
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully unblocked ${blockedNumbers.length} delivery note number(s)`,
      count: blockedNumbers.length,
    });
  } catch (error) {
    console.error('Error unblocking delivery note numbers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
