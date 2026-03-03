/**
 * POST /api/numbers/release
 * Release a reservation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrderNumberRepository } from '@/server/repositories/orderNumberRepository';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { number, allowReuse } = body;

    if (!number || typeof number !== 'number') {
      return NextResponse.json(
        { error: 'number is required and must be a number' },
        { status: 400 }
      );
    }

    const repo = getOrderNumberRepository();
    await repo.releaseReservation(number, allowReuse);

    return NextResponse.json({
      success: true,
      message: allowReuse
        ? 'Reservation released and number marked as reusable'
        : 'Reservation released and number blocked',
    });
  } catch (error: any) {
    console.error('Error releasing reservation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to release reservation',
      },
      { status: 400 }
    );
  }
}
