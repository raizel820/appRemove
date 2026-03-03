/**
 * POST /api/orders/[id]/delivery-note - Create/Update delivery note for an order
 * GET /api/orders/[id]/delivery-note - Get delivery note info for an order
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { getDeliveryNoteNumberingService } from '@/server/services/deliveryNoteNumberingService';

const CreateDeliveryNoteInput = z.object({
  deliveryNoteDate: z.string().min(1, 'Delivery note date required'),
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
        deliveryNoteNumber: true,
        deliveryNoteYear: true,
        deliveryNoteSequence: true,
        deliveryNoteFullNumber: true,
        deliveryNoteDate: true,
        deliveryNoteStatus: true,
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
      deliveryNote: order.deliveryNoteFullNumber ? {
        number: order.deliveryNoteNumber,
        year: order.deliveryNoteYear,
        sequence: order.deliveryNoteSequence,
        fullNumber: order.deliveryNoteFullNumber,
        date: order.deliveryNoteDate,
        status: order.deliveryNoteStatus,
      } : null,
    });
  } catch (error: any) {
    console.error('Error fetching delivery note info:', error);
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
    const input = CreateDeliveryNoteInput.parse(body);

    // Check if order exists
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        fullNumber: true,
        deliveryNoteNumber: true,
        deliveryNoteFullNumber: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if delivery note already exists for this order
    if (order.deliveryNoteFullNumber) {
      return NextResponse.json(
        { error: 'Delivery note already exists for this order' },
        { status: 400 }
      );
    }

    const deliveryNoteDate = new Date(input.deliveryNoteDate);
    const year = deliveryNoteDate.getFullYear();

    let seq: number;
    let fullNumber: string;

    const service = getDeliveryNoteNumberingService();

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
      const reservation = await service.reserveNextForYear(year, `auto-delivery-note-${Date.now()}`);
      await service.finalizeReservation(
        reservation.year,
        reservation.seq,
        reservation.reservationId,
        orderId
      );
      seq = reservation.seq;
    }

    // Format: DN-001/2026
    const seqStr = String(seq).padStart(3, '0');
    fullNumber = `DN-${seqStr}/${year}`;

    // Update order with delivery note info
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: {
        deliveryNoteYear: year,
        deliveryNoteSequence: seq,
        deliveryNoteFullNumber: fullNumber,
        deliveryNoteDate: deliveryNoteDate.toISOString(),
        deliveryNoteStatus: 'ISSUED',
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
          action: 'delivery_note_created',
          deliveryNoteNumber: fullNumber,
          deliveryNoteDate: deliveryNoteDate.toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      deliveryNote: {
        year,
        sequence: seq,
        fullNumber,
        date: deliveryNoteDate,
        status: 'ISSUED',
      },
      order: {
        id: updatedOrder.id,
        fullNumber: updatedOrder.fullNumber,
      },
    });
  } catch (error: any) {
    console.error('Error creating delivery note:', error);
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
