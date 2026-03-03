import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/qr/tokens/clear
 * Delete ALL verification tokens and their JSON data
 * This includes:
 * 1. Test tokens from VerificationToken table
 * 2. All order verification tokens (invoice, proforma, purchase order, delivery note)
 */
export async function POST(request: NextRequest) {
  try {
    let deletedCount = 0;
    const errors: string[] = [];

    // Delete all test tokens from VerificationToken table
    try {
      const testTokenResult = await db.verificationToken.deleteMany({});
      deletedCount += testTokenResult.count;
    } catch (error) {
      console.error('Error clearing test tokens:', error);
      errors.push('Failed to clear test tokens');
    }

    // Clear all verification tokens from orders
    try {
      const orderResult = await db.order.updateMany({
        data: {
          invoiceVerificationToken: null,
          proformaVerificationToken: null,
          purchaseOrderVerificationToken: null,
          deliveryNoteVerificationToken: null,
        },
      });

      // Count how many tokens were cleared (approximate based on updated orders)
      // We can't get exact count, so we'll count orders with at least one token before clearing
      deletedCount += orderResult.count; // Each order may have up to 4 tokens
    } catch (error) {
      console.error('Error clearing order tokens:', error);
      errors.push('Failed to clear order verification tokens');
    }

    return NextResponse.json({
      success: errors.length === 0,
      deletedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully cleared ${errors.length === 0 ? 'all' : 'most'} verification tokens`,
    });
  } catch (error) {
    console.error('Error clearing verification tokens:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear verification tokens' },
      { status: 500 }
    );
  }
}
