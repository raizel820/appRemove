import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface UpdateProformaStatusBody {
  proformaStatus: "ISSUED" | "SENT" | "CANCELLED";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body: UpdateProformaStatusBody = await request.json();
    const { proformaStatus } = body;

    // Validate proforma status
    const validStatuses = ["ISSUED", "SENT", "CANCELLED"];
    if (!validStatuses.includes(proformaStatus)) {
      return NextResponse.json(
        { error: "Invalid proforma status" },
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

    // Check if order has a proforma
    if (!order.proformaFullNumber) {
      return NextResponse.json(
        { error: "Order does not have a proforma invoice" },
        { status: 400 }
      );
    }

    // Update only the proforma status - does NOT affect order or invoice status
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: {
        proformaStatus,
      },
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating proforma status:", error);
    return NextResponse.json(
      { error: "Failed to update proforma status" },
      { status: 500 }
    );
  }
}
