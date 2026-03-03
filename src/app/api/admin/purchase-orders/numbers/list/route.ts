/**
 * GET /api/admin/purchase-orders/numbers/list
 * List all purchase order numbers from PurchaseOrderNumbers table
 * Used for Order Numbers Management dialog
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Fetch all purchase order numbers from PurchaseOrderNumbers table
    const purchaseOrderNumbers = await db.purchaseOrderNumbers.findMany({
      orderBy: {
        year: 'desc',
      },
    });

    // Sort by year desc, then seq desc
    purchaseOrderNumbers.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.seq - a.seq;
    });

    // Fetch orders for each purchase order number
    const numbers = await Promise.all(purchaseOrderNumbers.map(async (num) => {
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
        fullFormattedNumber: `PO-${String(num.seq).padStart(3, '0')}/${num.year}`,
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
    console.error('Error fetching purchase order numbers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
