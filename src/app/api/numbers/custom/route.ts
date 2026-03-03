/**
 * POST /api/numbers/custom
 * Reserve a specific custom number for a given year
 * Handles both:
 * - New numbers (not in the system yet)
 * - Reusable numbers (previously used and marked as reusable)
 *
 * Rejects:
 * - Used numbers
 * - Currently reserved numbers (not expired)
 * - Blocked numbers
 */

import { NextRequest, NextResponse } from 'next/server';
import { getYearAwareOrderNumberingService } from '@/server/services/yearAwareOrderNumberingService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reservedBy, year, seq } = body;

    if (!reservedBy || typeof reservedBy !== 'string') {
      return NextResponse.json(
        { error: 'reservedBy is required and must be a string' },
        { status: 400 }
      );
    }

    if (!year || typeof year !== 'number') {
      return NextResponse.json(
        { error: 'year is required and must be a number' },
        { status: 400 }
      );
    }

    if (!seq || typeof seq !== 'number') {
      return NextResponse.json(
        { error: 'seq is required and must be a number' },
        { status: 400 }
      );
    }

    if (seq < 1) {
      return NextResponse.json(
        { error: 'seq must be greater than 0' },
        { status: 400 }
      );
    }

    const service = getYearAwareOrderNumberingService();
    const result = await service.reserveCustomForYear(year, seq, reservedBy);

    return NextResponse.json({
      success: true,
      seq: result.seq,
      year: result.year,
      reservationId: result.reservationId,
      expiresAt: result.expiresAt,
    });
  } catch (error: any) {
    console.error('Error reserving custom number:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to reserve custom number',
      },
      { status: 500 }
    );
  }
}
