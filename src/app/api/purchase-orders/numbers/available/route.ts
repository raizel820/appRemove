/**
 * GET /api/purchase-orders/numbers/available - Get reusable purchase order numbers for a year
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPurchaseOrderNumberingService } from '@/server/services/purchaseOrderNumberingService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

    const service = getPurchaseOrderNumberingService();
    const numbers = await service.getReusableNumbers(year);

    return NextResponse.json({
      numbers,
      count: numbers.length,
    });
  } catch (error: any) {
    console.error('Error getting reusable purchase order numbers:', error);

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
