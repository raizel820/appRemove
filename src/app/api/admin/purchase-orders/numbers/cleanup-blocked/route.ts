/**
 * POST /api/admin/purchase-orders/numbers/cleanup-blocked
 * Unblock all blocked purchase order numbers by changing their state to REUSABLE
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Find all blocked purchase order numbers
    const blockedNumbers = await db.purchaseOrderNumbers.findMany({
      where: {
        state: 'BLOCKED',
      },
    });

    if (blockedNumbers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No blocked purchase order numbers found',
        count: 0,
      });
    }

    // Update all blocked numbers to REUSABLE
    await db.purchaseOrderNumbers.updateMany({
      where: {
        state: 'BLOCKED',
      },
      data: {
        state: 'REUSABLE',
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully unblocked ${blockedNumbers.length} purchase order number(s)`,
      count: blockedNumbers.length,
    });
  } catch (error) {
    console.error('Error unblocking purchase order numbers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
