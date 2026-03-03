/**
 * POST /api/numbers/finalize
 * Finalize a reservation by converting it to USED state
 * Uses YearAwareOrderNumberingService
 */

import { NextRequest, NextResponse } from 'next/server';
import { getYearAwareOrderNumberingService } from '@/server/services/yearAwareOrderNumberingService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, seq, reservationId } = body;

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

    if (!reservationId || typeof reservationId !== 'string') {
      return NextResponse.json(
        { error: 'reservationId is required and must be a string' },
        { status: 400 }
      );
    }

    const service = getYearAwareOrderNumberingService();
    await service.finalizeReservation(year, seq, reservationId);

    return NextResponse.json({
      success: true,
      message: 'Number finalized successfully',
    });
  } catch (error: any) {
    console.error('Error finalizing reservation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to finalize reservation',
      },
      { status: 500 }
    );
  }
}
