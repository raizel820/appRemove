/**
 * API endpoints for managing individual order numbers
 * GET /api/admin/numbers/[number] - Get specific number
 * PUT /api/admin/numbers/[number] - Update number state
 * DELETE /api/admin/numbers/[number] - Delete number
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: { number: string } }
) {
  try {
    const number = parseInt(params.number);
    const body = await request.json();
    const { state, year } = body;

    // Validate state
    const validStates = ['RESERVED', 'USED', 'REUSABLE', 'BLOCKED'];
    if (!validStates.includes(state)) {
      return NextResponse.json(
        { error: 'Invalid state. Must be one of: ' + validStates.join(', ') },
        { status: 400 }
      );
    }

    // Find the order number by sequence number and year
    const whereClause: any = { seq: number };
    if (year) {
      whereClause.year = year;
    }

    const orderNumber = await db.orderNumbers.findFirst({
      where: whereClause,
      orderBy: {
        year: 'desc',
      },
    });

    if (!orderNumber) {
      return NextResponse.json(
        { error: `Order number #${number}${year ? ` (year ${year})` : ''} not found` },
        { status: 404 }
      );
    }

    // Update state
    const updated = await db.orderNumbers.update({
      where: {
        id: orderNumber.id,
      },
      data: {
        state: state as any,
      },
    });

    return NextResponse.json({
      success: true,
      number: updated.seq,
      year: updated.year,
      state: updated.state,
    });
  } catch (error: any) {
    console.error('Error updating order number:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { number: string } }
) {
  try {
    const number = parseInt(params.number);
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const year = yearParam ? parseInt(yearParam) : null;

    // Find the order number by sequence number and year
    const whereClause: any = { seq: number };
    if (year) {
      whereClause.year = year;
    }

    const orderNumber = await db.orderNumbers.findFirst({
      where: whereClause,
      orderBy: {
        year: 'desc',
      },
    });

    if (!orderNumber) {
      return NextResponse.json(
        { error: `Order number #${number}${year ? ` (year ${year})` : ''} not found` },
        { status: 404 }
      );
    }

    // Check if number has associated orders
    const orderCount = await db.order.count({
      where: {
        numberYear: orderNumber.year,
        numberSequence: orderNumber.seq,
      },
    });

    if (orderCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete number with associated orders' },
        { status: 400 }
      );
    }

    // Delete the order number
    await db.orderNumbers.delete({
      where: {
        id: orderNumber.id,
      },
    });

    return NextResponse.json({
      success: true,
      number,
      year: orderNumber.year,
    });
  } catch (error: any) {
    console.error('Error deleting order number:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
