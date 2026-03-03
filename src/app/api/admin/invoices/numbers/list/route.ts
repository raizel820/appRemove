import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - List all invoice numbers
export async function GET(request: NextRequest) {
  try {
    const invoiceNumbers = await db.invoiceNumbers.findMany({
      orderBy: [
        { year: 'desc' },
        { seq: 'asc' },
      ],
    });

    // Fetch related orders separately
    const orderIds = invoiceNumbers
      .map(n => n.orderId)
      .filter((id): id is string => id !== null);

    const orders = orderIds.length > 0
      ? await db.order.findMany({
          where: {
            id: { in: orderIds },
          },
          select: {
            id: true,
            type: true,
            fullNumber: true,
            customerName: true,
            date: true,
          },
        })
      : [];

    const ordersMap = new Map(orders.map(o => [o.id, o]));

    const formatted = invoiceNumbers.map((num) => ({
      number: num.seq,
      year: num.year,
      fullFormattedNumber: `INV-${String(num.seq).padStart(3, '0')}/${num.year}`,
      state: num.state,
      reservedBy: num.reservedBy,
      reservedAt: num.reservedAt?.toISOString(),
      createdAt: num.createdAt.toISOString(),
      updatedAt: num.updatedAt.toISOString(),
      orders: num.orderId && ordersMap.has(num.orderId) ? [ordersMap.get(num.orderId)!] : [],
    }));

    return NextResponse.json({ numbers: formatted });
  } catch (error) {
    console.error('Error fetching invoice numbers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice numbers' },
      { status: 500 }
    );
  }
}
