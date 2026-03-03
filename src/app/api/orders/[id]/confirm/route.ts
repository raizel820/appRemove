
/**
 * POST /api/orders/[id]/confirm
 * Confirm an order and generate all documents
 * This is the unified order confirmation pipeline
 */

import { getOrderConfirmationService } from '@/server/services/orderConfirmationService';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const confirmService = getOrderConfirmationService();

    // Extract confirmation options
    const options = {
      generateInvoice: body.generateInvoice ?? undefined,
      generateProforma: body.generateProforma ?? undefined,
      generateDeliveryNote: body.generateDeliveryNote ?? undefined,
      generateNameplates: body.generateNameplates ?? undefined,
    };

    // Confirm order with unified pipeline
    const result = await confirmService.confirmOrder(id, options);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          errors: result.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Order confirmed successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error confirming order:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to confirm order',
      },
      { status: 500 }
    );
  }
}
