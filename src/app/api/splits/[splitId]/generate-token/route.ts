import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

/**
 * POST /api/splits/[splitId]/generate-token
 * Generate a unique verification token for a document split
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ splitId: string }> }
) {
  try {
    const { splitId } = await params;

    // Fetch the split with order information
    const split = await db.documentSplit.findUnique({
      where: { id: splitId },
      include: {
        order: {
          select: {
            id: true,
            fullNumber: true,
            customerName: true,
            currency: true,
          },
        },
      },
    });

    if (!split) {
      return NextResponse.json(
        { error: 'Document split not found' },
        { status: 404 }
      );
    }

    if (!split.number) {
      return NextResponse.json(
        { error: 'Document must be issued before generating a token' },
        { status: 400 }
      );
    }

    // Calculate split total
    let splitTotal = 0;
    if (split.itemIds && split.order) {
      try {
        const itemIds = JSON.parse(split.itemIds);
        const splitItems = await db.orderItem.findMany({
          where: { id: { in: itemIds } },
        });
        splitTotal = splitItems.reduce((sum, item) => sum + item.totalPrice, 0);
      } catch (error) {
        console.error('Error calculating split total:', error);
      }
    }

    // Generate token data with unique identifier
    // Include splitId and timestamp to ensure uniqueness
    const tokenData = JSON.stringify({
      splitId: split.id,  // Unique identifier to prevent collisions
      timestamp: Date.now(),
      documentType: split.documentType,
      documentNumber: split.number,
      splitIndex: split.splitIndex,
      orderNumber: split.order?.fullNumber,
      customerName: split.order?.customerName,
      total: splitTotal,
      currency: split.order?.currency,
      date: split.date,
    });

    // Use SHA-256 hash for a proper, unique token
    const hash = crypto.createHash('sha256').update(tokenData).digest('hex');
    const token = hash;

    // Update the split with the verification token
    const updatedSplit = await db.documentSplit.update({
      where: { id: splitId },
      data: { verificationToken: token },
    });

    return NextResponse.json({
      success: true,
      token: token,
      split: updatedSplit,
    });
  } catch (error) {
    console.error('Error generating verification token for split:', error);
    return NextResponse.json(
      { error: 'Failed to generate verification token' },
      { status: 500 }
    );
  }
}
