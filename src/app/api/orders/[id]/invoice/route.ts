/**
 * POST /api/orders/[id]/invoice - Create/Update invoice for an order
 * GET /api/orders/[id]/invoice - Get invoice info for an order
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { getInvoiceNumberingService } from '@/server/services/invoiceNumberingService';

const CreateInvoiceInput = z.object({
  invoiceDate: z.string().min(1, 'Invoice date required'),
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
        invoiceNumber: true,
        invoiceYear: true,
        invoiceSequence: true,
        invoiceFullNumber: true,
        invoiceDate: true,
        invoiceStatus: true,
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
      invoice: order.invoiceFullNumber ? {
        number: order.invoiceNumber,
        year: order.invoiceYear,
        sequence: order.invoiceSequence,
        fullNumber: order.invoiceFullNumber,
        date: order.invoiceDate,
        status: order.invoiceStatus,
      } : null,
    });
  } catch (error: any) {
    console.error('Error fetching invoice info:', error);
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
    const input = CreateInvoiceInput.parse(body);

    // Check if order exists
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        fullNumber: true,
        invoiceNumber: true,
        invoiceFullNumber: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if invoice already exists for this order
    if (order.invoiceFullNumber) {
      return NextResponse.json(
        { error: 'Invoice already exists for this order' },
        { status: 400 }
      );
    }

    const invoiceDate = new Date(input.invoiceDate);
    const year = invoiceDate.getFullYear();

    let seq: number;
    let fullNumber: string;

    const service = getInvoiceNumberingService();

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
      const reservation = await service.reserveNextForYear(year, `auto-invoice-${Date.now()}`);
      await service.finalizeReservation(
        reservation.year,
        reservation.seq,
        reservation.reservationId,
        orderId
      );
      seq = reservation.seq;
    }

    // Format: INV-001/2026
    const seqStr = String(seq).padStart(3, '0');
    fullNumber = `INV-${seqStr}/${year}`;

    // Update order with invoice info
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: {
        invoiceYear: year,
        invoiceSequence: seq,
        invoiceFullNumber: fullNumber,
        invoiceDate: invoiceDate.toISOString(),
        invoiceStatus: 'ISSUED',
        status: 'ACTIVE_ORDER',
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
          action: 'invoice_created',
          invoiceNumber: fullNumber,
          invoiceDate: invoiceDate.toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      invoice: {
        year,
        sequence: seq,
        fullNumber,
        date: invoiceDate,
        status: 'ISSUED',
      },
      order: {
        id: updatedOrder.id,
        fullNumber: updatedOrder.fullNumber,
      },
    });
  } catch (error: any) {
    console.error('Error creating invoice:', error);
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
