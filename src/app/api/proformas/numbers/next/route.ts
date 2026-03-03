/**
 * POST /api/proformas/numbers/next - Reserve next proforma number
 * GET /api/proformas/numbers/next - Get next proforma number without reserving
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProformaNumberingService } from '@/server/services/proformaNumberingService';
import { z } from 'zod';

const ReserveInput = z.object({
  year: z.number().int().min(2020).max(2100).optional(),
  reservedBy: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = ReserveInput.parse(body);

    // Use current year if not specified
    const year = input.year || new Date().getFullYear();

    const service = getProformaNumberingService();
    const result = await service.reserveNextForYear(year, input.reservedBy);

    return NextResponse.json({
      seq: result.seq,
      year: result.year,
      reservationId: result.reservationId,
      expiresAt: result.expiresAt,
      fullNumber: `PRO-${String(result.seq).padStart(3, '0')}/${result.year}`,
    });
  } catch (error: any) {
    console.error('Error reserving proforma number:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error: ' + error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

    const service = getProformaNumberingService();
    const result = await service.getNextForYear(year);

    return NextResponse.json({
      seq: result.seq,
      year: result.year,
      fullNumber: `PRO-${String(result.seq).padStart(3, '0')}/${result.year}`,
    });
  } catch (error: any) {
    console.error('Error getting next proforma number:', error);

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
