/**
 * POST /api/orders/[id]/technical-file - Create/Update technical file for an order
 * GET /api/orders/[id]/technical-file - Get technical file info for an order
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const CreateTechnicalFileInput = z.object({
  technicalFileDate: z.string().min(1, 'Technical file date required'),
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
        technicalFileDate: true,
        technicalFileStatus: true,
        technicalFileVerificationToken: true,
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
      technicalFile: order.technicalFileDate ? {
        date: order.technicalFileDate,
        status: order.technicalFileStatus,
        hasVerificationToken: !!order.technicalFileVerificationToken,
      } : null,
    });
  } catch (error: any) {
    console.error('Error fetching technical file info:', error);
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
    const input = CreateTechnicalFileInput.parse(body);

    // Check if order exists
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        fullNumber: true,
        technicalFileDate: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if technical file already exists for this order
    if (order.technicalFileDate) {
      return NextResponse.json(
        { error: 'Technical file already exists for this order' },
        { status: 400 }
      );
    }

    const technicalFileDate = new Date(input.technicalFileDate);

    // Update order with technical file info (no number needed)
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: {
        technicalFileDate: technicalFileDate.toISOString(),
        technicalFileStatus: 'ISSUED',
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
          action: 'technical_file_created',
          technicalFileDate: technicalFileDate.toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      technicalFile: {
        date: technicalFileDate,
        status: 'ISSUED',
      },
      order: {
        id: updatedOrder.id,
        fullNumber: updatedOrder.fullNumber,
      },
    });
  } catch (error: any) {
    console.error('Error creating technical file:', error);
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
