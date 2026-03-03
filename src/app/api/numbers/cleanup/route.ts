/**
 * POST /api/numbers/cleanup
 * Clean up expired reservations (background job)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrderNumberRepository } from '@/server/repositories/orderNumberRepository';

export async function POST() {
  try {
    const repo = getOrderNumberRepository();
    const cleanedCount = await repo.cleanupExpiredReservations();

    return NextResponse.json({
      success: true,
      cleanedCount,
      message: `Cleaned up ${cleanedCount} expired reservations`,
    });
  } catch (error: any) {
    console.error('Error cleaning up expired reservations:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to clean up expired reservations',
      },
      { status: 500 }
    );
  }
}
