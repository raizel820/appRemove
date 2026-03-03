/**
 * GET /api/delivery-notes/numbers/available - Get reusable delivery note numbers for a year
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDeliveryNoteNumberingService } from '@/server/services/deliveryNoteNumberingService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

    const service = getDeliveryNoteNumberingService();
    const numbers = await service.getReusableNumbers(year);

    return NextResponse.json({
      numbers,
      count: numbers.length,
    });
  } catch (error: any) {
    console.error('Error getting reusable delivery note numbers:', error);

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
