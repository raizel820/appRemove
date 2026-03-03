import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// PUT - Update invoice number state
export async function PUT(
  request: NextRequest,
  { params }: { params: { number: string } }
) {
  try {
    const seq = parseInt(params.number);
    const { state, year } = await request.json();

    if (isNaN(seq)) {
      return NextResponse.json(
        { error: 'Invalid invoice number' },
        { status: 400 }
      );
    }

    if (!state || !year) {
      return NextResponse.json(
        { error: 'State and year are required' },
        { status: 400 }
      );
    }

    const validStates = ['RESERVED', 'USED', 'REUSABLE', 'BLOCKED'];
    if (!validStates.includes(state)) {
      return NextResponse.json(
        { error: 'Invalid state' },
        { status: 400 }
      );
    }

    const invoiceNumber = await db.invoiceNumbers.findUnique({
      where: {
        year_seq: {
          year,
          seq,
        },
      },
    });

    if (!invoiceNumber) {
      return NextResponse.json(
        { error: 'Invoice number not found' },
        { status: 404 }
      );
    }

    // If changing from USED to REUSABLE, check if there are orders
    if (invoiceNumber.state === 'USED' && state === 'REUSABLE') {
      if (invoiceNumber.orderId) {
        const order = await db.order.findUnique({
          where: { id: invoiceNumber.orderId },
        });
        if (order && !order.deletedAt) {
          return NextResponse.json(
            { error: 'Cannot make used invoice number reusable: it has an active order' },
            { status: 400 }
          );
        }
      }
    }

    const updated = await db.invoiceNumbers.update({
      where: {
        year_seq: {
          year,
          seq,
        },
      },
      data: {
        state: state as any,
        reservedBy: state === 'RESERVED' ? 'admin-update' : null,
        reservedAt: state === 'RESERVED' ? new Date() : null,
      },
    });

    // Fetch related order if exists
    const order = updated.orderId
      ? await db.order.findUnique({
          where: { id: updated.orderId },
          select: {
            id: true,
            type: true,
            fullNumber: true,
            customerName: true,
            date: true,
          },
        })
      : null;

    const formatted = {
      number: updated.seq,
      year: updated.year,
      fullFormattedNumber: `INV-${String(updated.seq).padStart(3, '0')}/${updated.year}`,
      state: updated.state,
      reservedBy: updated.reservedBy,
      reservedAt: updated.reservedAt?.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      orders: order ? [order] : [],
    };

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error updating invoice number:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice number' },
      { status: 500 }
    );
  }
}

// PATCH - Update invoice number notes (not supported - no notes field in InvoiceNumbers)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { number: string } }
) {
  return NextResponse.json(
    { error: 'Invoice notes not supported' },
    { status: 400 }
  );
}

// DELETE - Delete invoice number
export async function DELETE(
  request: NextRequest,
  { params }: { params: { number: string } }
) {
  try {
    const seq = parseInt(params.number);
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '');

    if (isNaN(seq) || isNaN(year)) {
      return NextResponse.json(
        { error: 'Invalid invoice number or year' },
        { status: 400 }
      );
    }

    const invoiceNumber = await db.invoiceNumbers.findUnique({
      where: {
        year_seq: {
          year,
          seq,
        },
      },
    });

    if (!invoiceNumber) {
      return NextResponse.json(
        { error: 'Invoice number not found' },
        { status: 404 }
      );
    }

    // Check if there's an active order
    if (invoiceNumber.orderId) {
      const order = await db.order.findUnique({
        where: { id: invoiceNumber.orderId },
      });

      if (order && !order.deletedAt) {
        return NextResponse.json(
          { error: 'Cannot delete invoice number: it has an active order' },
          { status: 400 }
        );
      }
    }

    await db.invoiceNumbers.delete({
      where: {
        year_seq: {
          year,
          seq,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting invoice number:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice number' },
      { status: 500 }
    );
  }
}
