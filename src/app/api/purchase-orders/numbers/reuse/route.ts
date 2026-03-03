/**
 * POST /api/purchase-orders/numbers/reuse - Reserve a specific reusable purchase order number
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPurchaseOrderNumberingService } from '@/server/services/purchaseOrderNumberingService';
import { z } from 'zod';

const ReuseInput = z.object({
  year: z.number().int().min(2020).max(2100),
  seq: z.number().int().min(1),
  reservedBy: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = ReuseInput.parse(body);

    const service = getPurchaseOrderNumberingService();
    const result = await service.reserveSpecificForYear(
      input.year,
      input.seq,
      input.reservedBy
    );

    return NextResponse.json({
      seq: result.seq,
      year: result.year,
      reservationId: result.reservationId,
      expiresAt: result.expiresAt,
      fullNumber: `PO-${String(result.seq).padStart(3, '0')}/${result.year}`,
    });
  } catch (error: any) {
    console.error('Error reserving reusable purchase order number:', error);

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
