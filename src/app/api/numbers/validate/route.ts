/**
 * POST /api/numbers/validate
 * Validate if a custom number can be used
 * Checks: not used, not reserved, and reusable if previously used
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { OrderNumberState } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { number } = body;

    if (number === undefined || number === null || typeof number !== 'number') {
      return NextResponse.json(
        { error: 'number is required and must be a number' },
        { status: 400 }
      );
    }

    if (number < 1) {
      return NextResponse.json(
        { error: 'Number must be greater than 0' },
        { status: 400 }
      );
    }

    // Check if number exists in OrderNumber table
    const existingNumber = await db.orderNumber.findUnique({
      where: { number },
    });

    // Case 1: Number doesn't exist at all - can be used
    if (!existingNumber) {
      return NextResponse.json({
        success: true,
        valid: true,
        canUse: true,
        reason: 'Number is available (new number)',
        requiresReservation: true,
      });
    }

    // Case 2: Number is USED - cannot be used
    if (existingNumber.state === OrderNumberState.USED) {
      return NextResponse.json({
        success: true,
        valid: false,
        canUse: false,
        reason: 'Number is currently in use by an active order',
        requiresReservation: false,
      });
    }

    // Case 3: Number is RESERVED - cannot be used
    if (existingNumber.state === OrderNumberState.RESERVED) {
      // Check if reservation is expired
      let expired = false;
      if (existingNumber.reservedAt) {
        const now = new Date();
        const expiresAt = new Date(
          existingNumber.reservedAt.getTime() + 10 * 60 * 1000 // 10 minutes
        );
        expired = now > expiresAt;
      }

      if (expired) {
        // Expired reservation - could theoretically be reclaimed, but requires cleanup first
        return NextResponse.json({
          success: true,
          valid: false,
          canUse: false,
          reason: 'Number has an expired reservation. Run cleanup first.',
          requiresReservation: true,
          expired: true,
        });
      }

      return NextResponse.json({
        success: true,
        valid: false,
        canUse: false,
        reason: 'Number is currently reserved by another session',
        reservedBy: existingNumber.reservedBy,
        reservedAt: existingNumber.reservedAt,
        requiresReservation: false,
      });
    }

    // Case 4: Number is BLOCKED - cannot be used
    if (existingNumber.state === OrderNumberState.BLOCKED) {
      return NextResponse.json({
        success: true,
        valid: false,
        canUse: false,
        reason: 'Number is blocked and cannot be reused',
        notes: existingNumber.notes,
        requiresReservation: false,
      });
    }

    // Case 5: Number is REUSABLE - can be used
    if (existingNumber.state === OrderNumberState.REUSABLE) {
      return NextResponse.json({
        success: true,
        valid: true,
        canUse: true,
        reason: 'Number is available for reuse',
        notes: existingNumber.notes,
        requiresReservation: true, // Must go through reservation system
      });
    }

    // Fallback - should never reach here
    return NextResponse.json({
      success: true,
      valid: false,
      canUse: false,
      reason: 'Unknown number state',
      requiresReservation: false,
    });
  } catch (error: any) {
    console.error('Error validating number:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to validate number',
      },
      { status: 500 }
    );
  }
}
