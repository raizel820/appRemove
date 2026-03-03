/**
 * POST /api/proformas/verification-token - Generate verification token for proforma QR code
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

const GenerateTokenInput = z.object({
  orderId: z.string(),
  qrJsonData: z.object({
    proformaNumber: z.string(),
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

    // Verify order exists
    const order = await db.order.findUnique({
      where: { id: input.orderId },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Create verification token using HMAC
    const secret = process.env.VERIFICATION_SECRET || 'your-secret-key-change-in-production';
    const tokenData = JSON.stringify(input.qrJsonData);
    const token = crypto
      .createHmac('sha256', secret)
      .update(tokenData)
      .digest('hex');

    // Update order with verification token
    await db.order.update({
      where: { id: input.orderId },
      data: {
        proformaVerificationToken: token,
      },
    });

    return NextResponse.json({
      token,
      qrJsonData: input.qrJsonData,
    });
  } catch (error: any) {
    console.error('Error generating proforma verification token:', error);

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Import z for validation
import { z } from 'zod';
