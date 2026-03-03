/**
 * GET /api/admin/numbers/list
 * List all order numbers from OrderNumbers table
 * Used for Order Numbers Management dialog
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Fetch all order numbers from OrderNumbers table
    const orderNumbers = await db.orderNumbers.findMany({
      orderBy: {
        year: 'desc',
      },
    });

    // Sort by year desc, then seq desc
    orderNumbers.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.seq - a.seq;
    });

    // Fetch orders for each order number
    const numbers = await Promise.all(orderNumbers.map(async (num) => {
      const orders = await db.order.findMany({
        where: {
          numberYear: num.year,
          numberSequence: num.seq,
        },
        select: {
          id: true,
          type: true,
          fullNumber: true,
          customerName: true,
          date: true,
        },
      });

      return {
        number: num.seq,
        year: num.year,
        fullFormattedNumber: `${String(num.seq).padStart(3, '0')}/${num.year}`,
        state: num.state,
        reservedBy: num.reservedBy,
        reservedAt: num.reservedAt?.toISOString() || null,
        createdAt: num.createdAt.toISOString(),
        updatedAt: num.updatedAt.toISOString(),
        notes: null,
        orders: orders || [],
      };
    }));

    return NextResponse.json({
      numbers,
      total: numbers.length,
    });
  } catch (error) {
    console.error('Error fetching order numbers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
