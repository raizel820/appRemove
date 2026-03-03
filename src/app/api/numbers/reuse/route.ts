/**
 * POST /api/numbers/reuse
 * Reserve a specific reusable number for a given year
 * Uses YearAwareOrderNumberingService
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

    const service = getYearAwareOrderNumberingService();
    const result = await service.reserveSpecificForYear(year, seq, reservedBy);

    return NextResponse.json({
      success: true,
      seq: result.seq,
      year: result.year,
      reservationId: result.reservationId,
      expiresAt: result.expiresAt, // Already a string from the service
    });
  } catch (error: any) {
    console.error('Error reserving number:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to reserve number',
      },
      { status: 500 }
    );
  }
}
