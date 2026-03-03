import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST: Update a document split (reserve number, set date, issue, etc.)
// Using POST instead of PATCH due to gateway restrictions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ splitId: string }> }
) {
  try {
    const { splitId } = await params;
    console.log('POST /api/splits/[splitId] called with splitId:', splitId);

    const body = await request.json();
    console.log('Request body:', body);
    const { number, sequence, year, date, status, verificationToken, reservationId } = body;

    // Validate the split exists
    const existingSplit = await db.documentSplit.findUnique({
      where: { id: splitId },
    });

    console.log('Existing split:', existingSplit);

    if (!existingSplit) {
      console.error('Document split not found:', splitId);
      return NextResponse.json(
        { error: 'Document split not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (number !== undefined) updateData.number = number;
    if (sequence !== undefined) updateData.sequence = sequence;
    if (year !== undefined) updateData.year = year;
    if (date !== undefined) updateData.date = new Date(date);
    if (status !== undefined) updateData.status = status;
    if (verificationToken !== undefined) updateData.verificationToken = verificationToken;

    console.log('Update data:', updateData);

    // Update the split
    const updatedSplit = await db.documentSplit.update({
      where: { id: splitId },
      data: updateData,
    });

    console.log('Updated split:', updatedSplit);

    return NextResponse.json({
      success: true,
      split: updatedSplit,
    });

  } catch (error) {
    console.error('Error updating document split:', error);
    return NextResponse.json(
      { error: 'Failed to update document split: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

// PATCH: Update a document split (kept for compatibility if needed)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ splitId: string }> }
) {
  // Just delegate to POST
  return POST(request, params);
}

// DELETE: Delete a document split
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ splitId: string }> }
) {
  try {
    const { splitId } = await params;

    // Validate the split exists
    const existingSplit = await db.documentSplit.findUnique({
      where: { id: splitId },
    });

    if (!existingSplit) {
      return NextResponse.json(
        { error: 'Document split not found' },
        { status: 404 }
      );
    }

    // Delete the split
    await db.documentSplit.delete({
      where: { id: splitId },
    });

    return NextResponse.json({
      success: true,
      message: 'Document split deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting document split:', error);
    return NextResponse.json(
      { error: 'Failed to delete document split' },
      { status: 500 }
    );
  }
}
