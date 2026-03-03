
/**
 * POST /api/orders/[id]/unconfirm
 * Unconfirm an order and return it to DRAFT status
 * This removes serial numbers and is reversible
 */

import { getOrderConfirmationService } from '@/server/services/orderConfirmationService';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const confirmService = getOrderConfirmationService();

    // Unconfirm order (return to DRAFT status)
    await confirmService.unconfirmOrder(id);

    return NextResponse.json({
      success: true,
      message: 'Order unconfirmed and returned to DRAFT status',
    });
  } catch (error: any) {
    console.error('Error unconfirming order:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to unconfirm order',
      },
      { status: error.message?.includes('not found') ? 404 : 500 }
    );
  }
}
