/**
 * POST /api/orders/[id]/technical-file/verification-token - Generate verification token for technical file
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { generateVerificationToken } from '@/lib/hashedTokenUtil';

const GenerateTokenInput = z.object({
  qrJsonData: z.object({
    technicalFileDate: z.string().optional(),
    orderNumber: z.string().optional(),
    customerName: z.string().optional(),
    total: z.number().optional(),
    currency: z.string().optional(),
  }),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json();
    const input = GenerateTokenInput.parse(body);

    // Check if order exists
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        fullNumber: true,
        customerName: true,
        total: true,
        currency: true,
        technicalFileDate: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Generate verification token
    const verificationData = {
      fileNumber: order.fullNumber || '',
      fileType: 'Technical File',
      date: input.qrJsonData.technicalFileDate || order.technicalFileDate || new Date().toISOString(),
      totalAmount: input.qrJsonData.total ?? order.total ?? 0,
      companyName: '', // Will be filled from company data
      customerName: input.qrJsonData.customerName || order.customerName || '',
    };

    const token = generateVerificationToken(verificationData);

    // Update order with verification token
    await db.order.update({
      where: { id: orderId },
      data: {
        technicalFileVerificationToken: token,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'ORDER',
        entityId: orderId,
        orderId: orderId,
        userId: 'system',
        metadata: JSON.stringify({
          action: 'technical_file_verification_token_generated',
          technicalFileDate: order.technicalFileDate,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      token,
      qrJsonData: input.qrJsonData,
    });
  } catch (error: any) {
    console.error('Error generating technical file verification token:', error);

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
