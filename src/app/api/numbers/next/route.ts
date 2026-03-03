/**
 * POST /api/numbers/next
 * Reserve the next sequence number for a specific year
 * Uses YearAwareOrderNumberingService for per-year numbering
 */

import { NextRequest, NextResponse } from 'next/server';
import { getYearAwareOrderNumberingService } from '@/server/services/yearAwareOrderNumberingService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reservedBy, year } = body;

    if (!reservedBy || typeof reservedBy !== 'string') {
      return NextResponse.json(
        { error: 'reservedBy is required and must be a string' },
        { status: 400 }
      );
    }

    // Year is now required
    if (!year || typeof year !== 'number') {
      return NextResponse.json(
        { error: 'year is required and must be a number' },
        { status: 400 }
      );
    }

    const service = getYearAwareOrderNumberingService();
    const result = await service.reserveNextForYear(year, reservedBy);

    // Format the full number as seq/year (e.g., "001/2026")
    const fullNumber = `${String(result.seq).padStart(3, '0')}/${result.year}`;

    return NextResponse.json({
      success: true,
      number: fullNumber,
      seq: result.seq,
      year: result.year,
      reservationId: result.reservationId,
      expiresAt: result.expiresAt,
    });
  } catch (error: any) {
    console.error('Error reserving next number:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to reserve next number',
      },
      { status: 500 }
    );
  }
}
