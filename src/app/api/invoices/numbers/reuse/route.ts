/**
 * POST /api/invoices/numbers/reuse
 * Reserve a specific reusable invoice number for a given year
 * Uses InvoiceNumberingService
 */

import { NextRequest, NextResponse } from 'next/server';
import { getInvoiceNumberingService } from '@/server/services/invoiceNumberingService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reservedBy, year, seq } = body;

    if (!reservedBy || typeof reservedBy !== 'string') {
      return NextResponse.json(
        { error: 'reservedBy is required and must be a string' },
        { status: 400 }
      );
    }

    if (!year || typeof year !== 'number') {
      return NextResponse.json(
        { error: 'year is required and must be a number' },
        { status: 400 }
      );
    }

    if (!seq || typeof seq !== 'number') {
      return NextResponse.json(
        { error: 'seq is required and must be a number' },
        { status: 400 }
      );
    }

    const service = getInvoiceNumberingService();
    const result = await service.reserveSpecificForYear(year, seq, reservedBy);

    return NextResponse.json({
      success: true,
      seq: result.seq,
      year: result.year,
      reservationId: result.reservationId,
      expiresAt: result.expiresAt, // Already a string from the service
      fullNumber: `INV-${String(result.seq).padStart(3, '0')}/${result.year}`,
    });
  } catch (error: any) {
    console.error('Error reserving invoice number:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to reserve invoice number',
      },
      { status: 500 }
    );
  }
}
