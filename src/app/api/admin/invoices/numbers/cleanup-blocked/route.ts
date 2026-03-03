import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST - Clean up all blocked invoice numbers
export async function POST(request: NextRequest) {
  try {
    const blockedNumbers = await db.invoiceNumbers.findMany({
      where: {
        state: 'BLOCKED',
      },
    });

    if (blockedNumbers.length === 0) {
      return NextResponse.json({ 
        message: 'No blocked invoice numbers found',
        count: 0 
      });
    }

    await db.invoiceNumbers.updateMany({
      where: {
        state: 'BLOCKED',
      },
      data: {
        state: 'REUSABLE',
        notes: 'Auto-unblocked by cleanup',
      },
    });

    return NextResponse.json({ 
      message: `Successfully unblocked ${blockedNumbers.length} invoice numbers`,
      count: blockedNumbers.length 
    });
  } catch (error) {
    console.error('Error cleaning up blocked invoice numbers:', error);
    return NextResponse.json(
      { error: 'Failed to clean up blocked invoice numbers' },
      { status: 500 }
    );
  }
}
