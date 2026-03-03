/**
 * GET /api/admin/delivery-notes/numbers/[number]?year=2025
 * PUT /api/admin/delivery-notes/numbers/[number]?year=2025
 * PATCH /api/admin/delivery-notes/numbers/[number]
 * DELETE /api/admin/delivery-notes/numbers/[number]?year=2025
 * 
 * Manage individual delivery note numbers
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const UpdateStateInput = z.object({
  state: z.enum(['RESERVED', 'USED', 'REUSABLE', 'BLOCKED']),
  year: z.number().int().min(2020).max(2100),
});

const UpdateNotesInput = z.object({
  notes: z.string().nullable(),
});

// GET - Retrieve a specific delivery note number
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const { number } = await params;
    const seq = parseInt(number);
    
    if (isNaN(seq)) {
      return NextResponse.json(
        { error: 'Invalid number' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '');
    
    if (isNaN(year)) {
      return NextResponse.json(
        { error: 'Year is required' },
        { status: 400 }
      );
    }

    // Find the delivery note number
    const deliveryNumber = await db.deliveryNumbers.findFirst({
      where: {
        year: year,
        seq: seq,
      },
    });

    if (!deliveryNumber) {
      return NextResponse.json(
        { error: 'Delivery note number not found' },
        { status: 404 }
      );
    }

    // Fetch linked order if exists
    let orders = [];
    if (deliveryNumber.orderId) {
      const order = await db.order.findUnique({
        where: { id: deliveryNumber.orderId },
        select: {
          id: true,
          type: true,
          fullNumber: true,
          customerName: true,
          date: true,
        },
      });
      if (order) orders.push(order);
    }

    return NextResponse.json({
      number: deliveryNumber.seq,
      year: deliveryNumber.year,
      fullFormattedNumber: `DN-${String(deliveryNumber.seq).padStart(3, '0')}/${deliveryNumber.year}`,
      state: deliveryNumber.state,
      reservedBy: deliveryNumber.reservedBy,
      reservedAt: deliveryNumber.reservedAt?.toISOString() || null,
      createdAt: deliveryNumber.createdAt.toISOString(),
      updatedAt: deliveryNumber.updatedAt.toISOString(),
      notes: null,
      orders: orders,
    });
  } catch (error) {
    console.error('Error fetching delivery note number:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update delivery note number state
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const { number } = await params;
    const seq = parseInt(number);
    
    if (isNaN(seq)) {
      return NextResponse.json(
        { error: 'Invalid number' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '');
    
    if (isNaN(year)) {
      return NextResponse.json(
        { error: 'Year is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const input = UpdateStateInput.parse(body);

    // Find the delivery note number using the correct unique constraint
    const deliveryNumber = await db.deliveryNumbers.findFirst({
      where: {
        year: year,
        seq: seq,
      },
    });

    if (!deliveryNumber) {
      return NextResponse.json(
        { error: 'Delivery note number not found' },
        { status: 404 }
      );
    }

    // If changing from USED to REUSABLE, we need to handle the orderId
    if (deliveryNumber.state === 'USED' && input.state === 'REUSABLE') {
      await db.deliveryNumbers.update({
        where: { id: deliveryNumber.id },
        data: {
          state: input.state,
          orderId: null, // Unlink the order
        },
      });
    } else {
      await db.deliveryNumbers.update({
        where: { id: deliveryNumber.id },
        data: { state: input.state },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Delivery note number state updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating delivery note number state:', error);
    
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

// PATCH - Update delivery note number notes (if supported in future)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const { number } = await params;
    const seq = parseInt(number);
    
    if (isNaN(seq)) {
      return NextResponse.json(
        { error: 'Invalid number' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const input = UpdateNotesInput.parse(body);

    // Note: DeliveryNumbers doesn't have a notes field, but we keep this for consistency
    return NextResponse.json({
      success: false,
      error: 'Notes not supported for delivery note numbers',
    });
  } catch (error: any) {
    console.error('Error updating delivery note number notes:', error);
    
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

// DELETE - Delete a delivery note number
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const { number } = await params;
    const seq = parseInt(number);
    
    if (isNaN(seq)) {
      return NextResponse.json(
        { error: 'Invalid number' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '');
    
    if (isNaN(year)) {
      return NextResponse.json(
        { error: 'Year is required' },
        { status: 400 }
      );
    }

    // Find the delivery note number using the correct unique constraint
    const deliveryNumber = await db.deliveryNumbers.findFirst({
      where: {
        year: year,
        seq: seq,
      },
    });

    if (!deliveryNumber) {
      return NextResponse.json(
        { error: 'Delivery note number not found' },
        { status: 404 }
      );
    }

    // Check if it's linked to an order
    if (deliveryNumber.orderId) {
      return NextResponse.json(
        { error: 'Cannot delete: delivery note number is linked to an order' },
        { status: 400 }
      );
    }

    // Delete the delivery note number
    await db.deliveryNumbers.deleteMany({
      where: {
        year: year,
        seq: seq,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Delivery note number deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting delivery note number:', error);
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
