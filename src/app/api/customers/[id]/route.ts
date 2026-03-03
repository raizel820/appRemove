
/**
 * GET /api/customers/[id]
 * Get a customer by ID
 */

import { getCustomerService } from '@/server/services/customerService';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customerService = getCustomerService();
    const customer = await customerService.getCustomer(params.id);

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch customer' },
      { status: error instanceof Error && error.message === 'Customer not found' ? 404 : 500 }
    );
  }
}

/**
 * PUT /api/customers/[id]
 * Update a customer
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Filter out non-updatable fields (id, createdAt, updatedAt, relations)
    const {
      id,
      createdAt,
      updatedAt,
      orders,
      auditLogs,
      ...updateData
    } = body;

    const customerService = getCustomerService();
    const customer = await customerService.updateCustomer(params.id, updateData);

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update customer' },
      { status: error instanceof Error && error.message === 'Customer not found' ? 404 : 500 }
    );
  }
}

/**
 * DELETE /api/customers/[id]
 * Soft delete a customer
 */

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customerService = getCustomerService();
    const customer = await customerService.deleteCustomer(params.id);

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete customer' },
      { status: error instanceof Error && error.message === 'Customer not found' ? 404 : 500 }
    );
  }
}
