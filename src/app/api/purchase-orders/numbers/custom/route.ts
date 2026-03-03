/**
 * POST /api/purchase-orders/numbers/custom
 * Reserve a specific custom purchase order number for a given year
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
import { getPurchaseOrderNumberingService } from '@/server/services/purchaseOrderNumberingService';
import { z } from 'zod';

const ReserveCustomInput = z.object({
  reservedBy: z.string().min(1),
  year: z.number().int().min(2020).max(2100),
  seq: z.number().int().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = ReserveCustomInput.parse(body);

    const service = getPurchaseOrderNumberingService();
    const result = await service.reserveCustomForYear(input.year, input.seq, input.reservedBy);

    return NextResponse.json({
      success: true,
      seq: result.seq,
      year: result.year,
      reservationId: result.reservationId,
      expiresAt: result.expiresAt,
      fullNumber: `PO-${String(result.seq).padStart(3, '0')}/${result.year}`,
    });
  } catch (error: any) {
    console.error('Error reserving custom purchase order number:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error: ' + error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to reserve custom purchase order number',
      },
      { status: 500 }
    );
  }
}
