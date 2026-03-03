import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { OrderNumberState } from '@prisma/client';

/**
 * Reset all orders and clear order number counters
 * Also clears all invoice numbers, proforma numbers, purchase order numbers, delivery note numbers and all verification tokens
 */
export async function POST() {
  try {
    // Delete all existing orders (hard delete)
    await db.order.deleteMany({});

    // Delete all verification tokens
    await db.verificationToken.deleteMany({});

    // Reset all sequence counters for all years to 0
    const currentYear = new Date().getFullYear();

    // Get current order counters to determine which years to reset
    const counters = await db.serialNumberCounter.findMany();

    // Reset counters for all years to 0
    // Setting to 0 means the next order will be 1 (since getNextSequenceNumber adds 1)
    for (const counter of counters) {
      await db.serialNumberCounter.update({
        where: { id: counter.id },
        data: { lastCounter: 0 },
      });
    }

    // Clear all OrderNumber entries (old system)
    await db.orderNumber.deleteMany({});

    // Clear all OrderNumbers entries (new year-based system)
    await db.orderNumbers.deleteMany({});

    // Clear all verification tokens (duplicate removal - keeping for safety)
    await db.verificationToken.deleteMany({});

    // Clear all invoice numbers
    const deletedInvoiceNumbers = await db.invoiceNumbers.deleteMany({});

    // Clear all proforma numbers
    const deletedProformaNumbers = await db.proformaNumbers.deleteMany({});

    // Clear all purchase order numbers
    const deletedPurchaseOrderNumbers = await db.purchaseOrderNumbers.deleteMany({});

    // Clear all delivery note numbers
    const deletedDeliveryNoteNumbers = await db.deliveryNumbers.deleteMany({});

    // Note: Invoice numbers are tracked in the InvoiceNumbers table directly
    // The sequence is determined by finding the max seq for each year
    // So we don't need a separate counter table

    // Create audit log for this action
    await db.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'ORDER',
        entityId: 'SYSTEM-RESET',
        userId: 'system',
        metadata: JSON.stringify({
          reason: 'System reset - All orders, order numbers (both systems), invoice numbers, proforma numbers, purchase order numbers, delivery note numbers, counters, and verification tokens deleted',
          orderCountersReset: counters.length,
          invoiceNumbersDeleted: deletedInvoiceNumbers.count,
          proformaNumbersDeleted: deletedProformaNumbers.count,
          purchaseOrderNumbersDeleted: deletedPurchaseOrderNumbers.count,
          deliveryNoteNumbersDeleted: deletedDeliveryNoteNumbers.count,
          currentYear: currentYear,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'All orders, order numbers (both systems), invoice numbers, proforma numbers, purchase order numbers, delivery note numbers, counters, and verification tokens have been reset to initial state',
      orderCountersReset: counters.length,
      invoiceNumbersDeleted: deletedInvoiceNumbers.count,
      proformaNumbersDeleted: deletedProformaNumbers.count,
      purchaseOrderNumbersDeleted: deletedPurchaseOrderNumbers.count,
      deliveryNoteNumbersDeleted: deletedDeliveryNoteNumbers.count,
    });
  } catch (error) {
    console.error('Error resetting orders:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to reset orders',
      },
      { status: 500 }
    );
  }
}
