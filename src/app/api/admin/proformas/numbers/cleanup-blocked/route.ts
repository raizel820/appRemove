/**
 * POST /api/admin/proformas/numbers/cleanup-blocked
 * Unblock all blocked proforma numbers by changing their state to REUSABLE
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Find all blocked proforma numbers
    const blockedNumbers = await db.proformaNumbers.findMany({
      where: {
        state: 'BLOCKED',
      },
    });

    if (blockedNumbers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No blocked proforma numbers found',
        count: 0,
      });
    }

    // Update all blocked numbers to REUSABLE
    await db.proformaNumbers.updateMany({
      where: {
        state: 'BLOCKED',
      },
      data: {
        state: 'REUSABLE',
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully unblocked ${blockedNumbers.length} proforma number(s)`,
      count: blockedNumbers.length,
    });
  } catch (error) {
    console.error('Error unblocking proforma numbers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
