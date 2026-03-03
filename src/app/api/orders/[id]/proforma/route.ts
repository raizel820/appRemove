/**
 * POST /api/orders/[id]/proforma - Create/Update proforma for an order
 * GET /api/orders/[id]/proforma - Get proforma info for an order
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { getProformaNumberingService } from '@/server/services/proformaNumberingService';

const CreateProformaInput = z.object({
  proformaDate: z.string().min(1, 'Proforma date required'),
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
        proformaNumber: true,
        proformaYear: true,
        proformaSequence: true,
        proformaFullNumber: true,
        proformaDate: true,
        proformaStatus: true,
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
      proforma: order.proformaFullNumber ? {
        number: order.proformaNumber,
        year: order.proformaYear,
        sequence: order.proformaSequence,
        fullNumber: order.proformaFullNumber,
        date: order.proformaDate,
        status: order.proformaStatus,
      } : null,
    });
  } catch (error: any) {
    console.error('Error fetching proforma info:', error);
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
    const input = CreateProformaInput.parse(body);

    // Check if order exists
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        fullNumber: true,
        proformaNumber: true,
        proformaFullNumber: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if proforma already exists for this order
    if (order.proformaFullNumber) {
      return NextResponse.json(
        { error: 'Proforma already exists for this order' },
        { status: 400 }
      );
    }

    const proformaDate = new Date(input.proformaDate);
    const year = proformaDate.getFullYear();

    let seq: number;
    let fullNumber: string;

    const service = getProformaNumberingService();

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
      const reservation = await service.reserveNextForYear(year, `auto-proforma-${Date.now()}`);
      await service.finalizeReservation(
        reservation.year,
        reservation.seq,
        reservation.reservationId,
        orderId
      );
      seq = reservation.seq;
    }

    // Format: PRO-001/2026
    const seqStr = String(seq).padStart(3, '0');
    fullNumber = `PRO-${seqStr}/${year}`;

    // Update order with proforma info
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: {
        proformaYear: year,
        proformaSequence: seq,
        proformaFullNumber: fullNumber,
        proformaDate: proformaDate.toISOString(),
        proformaStatus: 'ISSUED',
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
          action: 'proforma_created',
          proformaNumber: fullNumber,
          proformaDate: proformaDate.toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      proforma: {
        year,
        sequence: seq,
        fullNumber,
        date: proformaDate,
        status: 'ISSUED',
      },
      order: {
        id: updatedOrder.id,
        fullNumber: updatedOrder.fullNumber,
      },
    });
  } catch (error: any) {
    console.error('Error creating proforma:', error);
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
