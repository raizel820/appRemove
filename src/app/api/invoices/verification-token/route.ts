/**
 * POST /api/invoices/verification-token
 * Generate a verification token for an invoice
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';
import { z } from 'zod';

const GenerateTokenInput = z.object({
  orderId: z.string(),
  qrJsonData: z.object({
    invoiceNumber: z.string(),
    orderNumber: z.string(),
    customerName: z.string(),
    total: z.number(),
    currency: z.string(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = GenerateTokenInput.parse(body);

    // Get the order
    const order = await db.order.findUnique({
      where: { id: input.orderId },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (!order.invoiceFullNumber) {
      return NextResponse.json(
        { error: 'Order does not have an invoice' },
        { status: 400 }
      );
    }

    // Check if token already exists in Order model
    if (order.invoiceVerificationToken) {
      return NextResponse.json(
        {
          error: 'Verification token already exists for this invoice',
          token: order.invoiceVerificationToken,
        },
        { status: 400 }
      );
    }

    // Generate a verification token using HMAC (matching proforma logic)
    const secret = process.env.VERIFICATION_SECRET || 'your-secret-key-change-in-production';
    const tokenData = JSON.stringify(input.qrJsonData);
    const token = crypto
      .createHmac('sha256', secret)
      .update(tokenData)
      .digest('hex');

    // Create enhanced qrJsonData with both file structure and embedded verification info
    const enhancedQrJsonData = {
      ...input.qrJsonData,
      file: {
        type: 'Invoice',
        number: order.invoiceFullNumber,
        date: order.invoiceDate ? order.invoiceDate.toISOString().split('T')[0] : null,
        totalAmount: order.total,
        currency: order.currency,
      },
      _verification: {
        customerName: order.customerName,
        fileType: 'Invoice',
        fileNumber: order.invoiceFullNumber,
        date: order.invoiceDate ? order.invoiceDate.toISOString().split('T')[0] : null,
        totalAmount: order.total,
        currency: order.currency,
        companyName: 'EURL LA SOURCE',
      },
    };

    // Store the verification token in BOTH places:
    // 1. Order model (for status checking like proforma)
    await db.order.update({
      where: { id: input.orderId },
      data: {
        invoiceVerificationToken: token,
      },
    });

    // 2. VerificationToken table (for token table display and verification)
    // Check if a token with this label already exists
    const existingToken = await db.verificationToken.findFirst({
      where: {
        token: token,
      },
    });

    if (!existingToken) {
      await db.verificationToken.create({
        data: {
          token,
          qrJsonData: JSON.stringify(enhancedQrJsonData),
          label: `invoice-${order.invoiceFullNumber}`,
        },
      });
    }

    return NextResponse.json({
      token,
      qrJsonData: input.qrJsonData,
    });
  } catch (error: any) {
    console.error('Error generating verification token:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error: ' + error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate verification token' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/invoices/verification-token
 * Get verification token for an order
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get the order with verification token (matching proforma pattern)
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        invoiceVerificationToken: true,
        invoiceFullNumber: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (!order.invoiceVerificationToken) {
      return NextResponse.json({
        hasToken: false,
        token: null,
      });
    }

    // Get the full token data from VerificationToken table
    const tokenData = await db.verificationToken.findUnique({
      where: { token: order.invoiceVerificationToken },
    });

    return NextResponse.json({
      hasToken: true,
      token: tokenData,
    });
  } catch (error) {
    console.error('Error fetching verification token:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verification token' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/invoices/verification-token
 * Delete verification token for an order
 */

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get the order
    const order = await db.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.invoiceVerificationToken) {
      // Delete the verification token from the VerificationToken table
      await db.verificationToken.delete({
        where: { token: order.invoiceVerificationToken },
      }).catch(() => {
        // Token might not exist in VerificationToken table, ignore error
      });

      // Clear the token from the order (matching proforma pattern)
      await db.order.update({
        where: { id: orderId },
        data: { invoiceVerificationToken: null },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting verification token:', error);
    return NextResponse.json(
      { error: 'Failed to delete verification token' },
      { status: 500 }
    );
  }
}
