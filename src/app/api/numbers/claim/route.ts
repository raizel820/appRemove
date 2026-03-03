/**
 * POST /api/numbers/claim
 * Claim/claim a reservation (convert to used state)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrderNumberRepository } from '@/server/repositories/orderNumberRepository';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { number, reservationId } = body;

    if (!number || typeof number !== 'number') {
      return NextResponse.json(
        { error: 'number is required and must be a number' },
        { status: 400 }
      );
    }

    if (!reservationId || typeof reservationId !== 'string') {
      return NextResponse.json(
        { error: 'reservationId is required and must be a string' },
        { status: 400 }
      );
    }

    const repo = getOrderNumberRepository();
    await repo.claimReservation(number, reservationId);

    return NextResponse.json({
      success: true,
      message: 'Reservation claimed successfully',
    });
  } catch (error: any) {
    console.error('Error claiming reservation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to claim reservation',
      },
      { status: 400 }
    );
  }
}
