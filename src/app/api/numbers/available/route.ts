/**
 * GET /api/numbers/available
 * Get list of reusable numbers for a specific year
 * Uses YearAwareOrderNumberingService
 */

import { NextRequest, NextResponse } from 'next/server';
import { getYearAwareOrderNumberingService } from '@/server/services/yearAwareOrderNumberingService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');

    // Year is now required
    if (!yearParam || typeof yearParam !== 'string') {
      return NextResponse.json(
        { error: 'year is required and must be a number' },
        { status: 400 }
      );
    }

    const year = parseInt(yearParam);

    const service = getYearAwareOrderNumberingService();
    const numbers = await service.getReusableNumbers(year);

    return NextResponse.json({
      success: true,
      numbers: numbers.map(n => ({
        seq: n.seq,
        year: n.year,
        originalOrderId: null, // No original order tracking for reusable numbers
        deletedAt: n.reservedAt,
        notes: null,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching available numbers:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch available numbers',
      },
      { status: 500 }
    );
  }
}
