
/**
 * GET /api/orders/[id]
 * Get an order by ID
 */

import { getOrderService } from '@/server/services/orderService';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orderService = getOrderService();
    const { id } = await params;
    const order = await orderService.getOrder(id);

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch order' },
      { status: error instanceof Error && error.message === 'Order not found' ? 404 : 500 }
    );
  }
}

/**
 * PUT /api/orders/[id]
 * Update an order
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await params;

    // Filter out non-updatable fields (id, createdAt, updatedAt, relations)
    const {
      createdAt,
      updatedAt,
      customer,
      auditLogs,
      ...updateData
    } = body;

    // Convert empty strings to null for date fields
    if (updateData.dueDate === '') {
      updateData.dueDate = null;
    }
    if (updateData.date === '') {
      updateData.date = null;
    }

    const orderService = getOrderService();
    const order = await orderService.updateOrder(id, updateData);

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update order' },
      { status: error instanceof Error && error.message === 'Order not found' ? 404 : 500 }
    );
  }
}

/**
 * DELETE /api/orders/[id]
 * Soft delete an order with option to allow or block number reuse
 */

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json().catch(() => ({})); // Handle empty or invalid JSON
    const { allowReuse = false, allowInvoiceReuse = false, allowProformaReuse = false, allowPurchaseOrderReuse = false, allowDeliveryNoteReuse = false } = body; // Default to false (block reuse - safer)

    const { id } = await params;
    const orderService = getOrderService();
    const order = await orderService.deleteOrder(id, allowReuse, allowInvoiceReuse, allowProformaReuse, allowPurchaseOrderReuse, allowDeliveryNoteReuse);

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete order' },
      { status: error instanceof Error && error.message === 'Order not found' ? 404 : 500 }
    );
  }
}
