/**
 * PUT /api/admin/proformas/numbers/[number]?year=2025
 * PATCH /api/admin/proformas/numbers/[number]
 * DELETE /api/admin/proformas/numbers/[number]?year=2025
 * 
 * Manage individual proforma numbers
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

// PUT - Update proforma number state
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

    // Find the proforma number using the correct unique constraint
    const proformaNumber = await db.proformaNumbers.findFirst({
      where: {
        year: year,
        seq: seq,
      },
    });

    if (!proformaNumber) {
      return NextResponse.json(
        { error: 'Proforma number not found' },
        { status: 404 }
      );
    }

    // If changing from USED to REUSABLE, we need to handle the orderId
    if (proformaNumber.state === 'USED' && input.state === 'REUSABLE') {
      await db.proformaNumbers.update({
        where: { id: proformaNumber.id },
        data: {
          state: input.state,
          orderId: null, // Unlink the order
        },
      });
    } else {
      await db.proformaNumbers.update({
        where: { id: proformaNumber.id },
        data: { state: input.state },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Proforma number state updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating proforma number state:', error);
    
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

// PATCH - Update proforma number notes (if supported in future)
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

    // Note: ProformaNumbers doesn't have a notes field, but we keep this for consistency
    return NextResponse.json({
      success: false,
      error: 'Notes not supported for proforma numbers',
    });
  } catch (error: any) {
    console.error('Error updating proforma number notes:', error);
    
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

// DELETE - Delete a proforma number
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

    // Find the proforma number using the correct unique constraint
    const proformaNumber = await db.proformaNumbers.findFirst({
      where: {
        year: year,
        seq: seq,
      },
    });

    if (!proformaNumber) {
      return NextResponse.json(
        { error: 'Proforma number not found' },
        { status: 404 }
      );
    }

    // Check if it's linked to an order
    if (proformaNumber.orderId) {
      return NextResponse.json(
        { error: 'Cannot delete: proforma number is linked to an order' },
        { status: 400 }
      );
    }

    // Delete the proforma number
    await db.proformaNumbers.deleteMany({
      where: {
        year: year,
        seq: seq,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Proforma number deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting proforma number:', error);
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
