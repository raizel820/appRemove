/**
 * GET /api/admin/proformas/numbers/list
 * List all proforma numbers from ProformaNumbers table
 * Used for Order Numbers Management dialog
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Fetch all proforma numbers from ProformaNumbers table
    const proformaNumbers = await db.proformaNumbers.findMany({
      orderBy: {
        year: 'desc',
      },
    });

    // Sort by year desc, then seq desc
    proformaNumbers.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.seq - a.seq;
    });

    // Fetch orders for each proforma number
    const numbers = await Promise.all(proformaNumbers.map(async (num) => {
      const orders = [];
      
      if (num.orderId) {
        const order = await db.order.findUnique({
          where: { id: num.orderId },
          select: {
            id: true,
            type: true,
            fullNumber: true,
            customerName: true,
            date: true,
          },
        });
        if (order) orders.push(order);
      }

      return {
        number: num.seq,
        year: num.year,
        fullFormattedNumber: `PRO-${String(num.seq).padStart(3, '0')}/${num.year}`,
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
    console.error('Error fetching proforma numbers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
