
/**
 * POST /api/customers/[id]/open-folder
 * Get the customer folder path for opening
 * Note: Browsers cannot directly open folders due to security.
 * This endpoint returns the path which can be used in desktop environments.
 */

import { getCustomerService } from '@/server/services/customerService';
import { getStorageAdapter } from '@/server/adapters/fsStorage';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customerService = getCustomerService();
    const customer = await customerService.getCustomer(params.id);

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Generate folder path from customer info (not stored in DB)
    const storage = getStorageAdapter();
    const folderPath = storage.getCustomerFolderByInfo(customer.id, customer.fullName);

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.fullName,
        code: customer.code,
        folderPath: folderPath,
      },
      message: 'In a desktop environment, you can open this folder path',
      webNote: 'Browser security prevents automatic folder opening from web applications',
    });
  } catch (error: any) {
    console.error('Error getting customer folder:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to get customer folder' },
      { status: 500 }
    );
  }
}
