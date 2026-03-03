/**
 * POST /api/orders/[id]/purchase-order - Create/Update purchase order for an order
 * GET /api/orders/[id]/purchase-order - Get purchase order info for an order
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { getPurchaseOrderNumberingService } from '@/server/services/purchaseOrderNumberingService';

const CreatePurchaseOrderInput = z.object({
  purchaseOrderDate: z.string().min(1, 'Purchase Order date required'),
  reservedYear: z.number().optional(),
  reservedSeq: z.number().optional(),
  reservationId: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        fullNumber: true,
        purchaseOrderNumber: true,
        purchaseOrderYear: true,
        purchaseOrderSequence: true,
        purchaseOrderFullNumber: true,
        purchaseOrderDate: true,
        purchaseOrderStatus: true,
        status: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      order: {
        id: order.id,
        fullNumber: order.fullNumber,
        status: order.status,
      },
      purchaseOrder: order.purchaseOrderFullNumber ? {
        number: order.purchaseOrderNumber,
        year: order.purchaseOrderYear,
        sequence: order.purchaseOrderSequence,
        fullNumber: order.purchaseOrderFullNumber,
        date: order.purchaseOrderDate,
        status: order.purchaseOrderStatus,
      } : null,
    });
  } catch (error: any) {
    console.error('Error fetching purchase order info:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json();
    const input = CreatePurchaseOrderInput.parse(body);

    // Check if order exists
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        fullNumber: true,
        purchaseOrderNumber: true,
        purchaseOrderFullNumber: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if purchase order already exists for this order
    if (order.purchaseOrderFullNumber) {
      return NextResponse.json(
        { error: 'Purchase Order already exists for this order' },
        { status: 400 }
      );
    }

    const purchaseOrderDate = new Date(input.purchaseOrderDate);
    const year = purchaseOrderDate.getFullYear();

    let seq: number;
    let fullNumber: string;

    const service = getPurchaseOrderNumberingService();

    if (input.reservedYear !== undefined && input.reservedSeq !== undefined && input.reservationId !== undefined) {
      // Finalize the reservation
      await service.finalizeReservation(
        input.reservedYear,
        input.reservedSeq,
        input.reservationId,
        orderId
      );
      seq = input.reservedSeq;
    } else {
      // Reserve and finalize automatically
      const reservation = await service.reserveNextForYear(year, `auto-purchase-order-${Date.now()}`);
      await service.finalizeReservation(
        reservation.year,
        reservation.seq,
        reservation.reservationId,
        orderId
      );
      seq = reservation.seq;
    }

    // Format: PO-001/2026
    const seqStr = String(seq).padStart(3, '0');
    fullNumber = `PO-${seqStr}/${year}`;

    // Update order with purchase order info
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: {
        purchaseOrderYear: year,
        purchaseOrderSequence: seq,
        purchaseOrderFullNumber: fullNumber,
        purchaseOrderDate: purchaseOrderDate.toISOString(),
        purchaseOrderStatus: 'ISSUED',
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'ORDER',
        entityId: orderId,
        orderId: orderId,
        userId: 'system',
        metadata: JSON.stringify({
          action: 'purchase_order_created',
          purchaseOrderNumber: fullNumber,
          purchaseOrderDate: purchaseOrderDate.toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      purchaseOrder: {
        year,
        sequence: seq,
        fullNumber,
        date: purchaseOrderDate,
        status: 'ISSUED',
      },
      order: {
        id: updatedOrder.id,
        fullNumber: updatedOrder.fullNumber,
      },
    });
  } catch (error: any) {
    console.error('Error creating purchase order:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      cause: error.cause,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error: ' + error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error', details: error.meta },
      { status: 500 }
    );
  }
}
