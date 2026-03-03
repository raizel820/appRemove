import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface PaymentRecord {
  amount: number;
  date: string;
  notes?: string;
}

interface UpdateInvoiceStatusBody {
  invoiceStatus: "ISSUED" | "PAID" | "PARTIALLY_PAID" | "CANCELLED";
  payment?: {
    amount: number;
    date: string;
    notes?: string;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const body: UpdateInvoiceStatusBody = await request.json();
    const { invoiceStatus, payment } = body;

    // Validate invoice status
    const validStatuses = ["ISSUED", "PAID", "PARTIALLY_PAID", "CANCELLED"];
    if (!validStatuses.includes(invoiceStatus)) {
      return NextResponse.json(
        { error: "Invalid invoice status" },
        { status: 400 }
      );
    }

    // Get the current order
    const order = await db.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Validate payment if provided
    if (payment && (payment.amount <= 0 || !payment.date)) {
      return NextResponse.json(
        { error: "Invalid payment data. Amount must be > 0 and date is required." },
        { status: 400 }
      );
    }

    // Parse existing payments
    let payments: PaymentRecord[] = [];
    if (order.payments) {
      try {
        payments = JSON.parse(order.payments);
      } catch (e) {
        console.error("Error parsing payments:", e);
        payments = [];
      }
    }

    // Add new payment if provided
    if (payment && invoiceStatus !== "CANCELLED") {
      payments.push({
        amount: payment.amount,
        date: payment.date,
        notes: payment.notes,
      });
    }

    // Calculate total paid
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    // Determine order status based on invoice status
    let orderStatus = order.status;
    if (invoiceStatus === "PAID" || totalPaid >= order.total) {
      orderStatus = "PAID";
    } else if (invoiceStatus === "PARTIALLY_PAID" || totalPaid > 0) {
      orderStatus = "PARTIALLY_PAID";
    } else if (invoiceStatus === "CANCELLED") {
      orderStatus = "CANCELLED";
    }

    // Update order
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: {
        invoiceStatus,
        status: orderStatus,
        payments: JSON.stringify(payments),
      },
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      totalPaid,
      remainingAmount: Math.max(0, order.total - totalPaid),
    });
  } catch (error) {
    console.error("Error updating invoice status:", error);
    return NextResponse.json(
      { error: "Failed to update invoice status" },
      { status: 500 }
    );
  }
}
