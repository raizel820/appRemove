
/**
 * POST /api/customers
 * Create a new customer
 */

import { getCustomerService } from '@/server/services/customerService';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const customerService = getCustomerService();
    const customer = await customerService.createCustomer(body);

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create customer' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/customers
 * Get all customers with optional search
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;

    const customerService = getCustomerService();
    const customers = await customerService.getCustomers(search);

    return NextResponse.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}
// Trigger recompilation
