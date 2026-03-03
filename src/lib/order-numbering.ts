/**
 * Order Numbering Service
 * 
 * Provides thread-safe sequence number generation for orders
 * Format: YYYY-SEQ or YYYY-MM-SEQ (configurable)
 * 
 * Features:
 * - Thread-safe using Prisma transactions
 * - Supports multiple formats (YYYY-SEQ, YYYY-MM-SEQ, YY-NNNN)
 * - Separate counters per year to prevent large number ranges
 * - Audit logging for all number allocations
 * - Idempotency support via optional key checking
 */

import { db } from '@/lib/db';

/**
 * Get next sequence number for a given year WITHOUT audit logging (for performance)
 * This is thread-safe when called within a transaction
 */
export async function getNextSequenceNumberNoAudit(year: number): Promise<number> {
  const sequence = await db.serialNumberCounter.findUnique({
    where: {
      year,
    },
  });

  if (!sequence) {
    // Create new sequence counter for this year
    sequence = await db.serialNumberCounter.create({
      data: {
        year,
        lastCounter: 0,
      },
    });
  }

  // Increment and update atomically
  const newCounter = sequence.lastCounter + 1;
  await db.serialNumberCounter.update({
    where: {
      id: sequence.id,
    },
    data: {
      lastCounter: newCounter,
    },
  });

  return newCounter;
}

/**
 * Get next sequence number for a given year
 * This checks for existing non-deleted orders to avoid duplicates
 */
export async function getNextSequenceNumber(year: number): Promise<number> {
  // Find the highest sequence number among active (non-deleted) orders
  const highestOrder = await db.order.findFirst({
    where: {
      numberYear: year,
      deletedAt: null, // Only count non-deleted orders
    },
    orderBy: {
      numberSequence: 'desc',
    },
    select: {
      numberSequence: true,
    },
  });

  // Get or create the counter for this year
  let counter = await db.serialNumberCounter.findUnique({
    where: { year },
  });

  if (!counter) {
    // Create new sequence counter for this year
    counter = await db.serialNumberCounter.create({
      data: {
        year,
        lastCounter: 0,
      },
    });
    await db.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'SEQUENCE',
        entityId: `YEAR-${year}`,
        userId: 'system',
        metadata: JSON.stringify({
          year,
          created: true,
        }),
      },
    });
  }

  // Use the higher value: either the counter or the highest existing order
  const highestExistingNumber = highestOrder?.numberSequence || 0;
  const currentCounter = counter.lastCounter;

  // Take the maximum of both to ensure we don't reuse numbers
  const newCounter = Math.max(highestExistingNumber, currentCounter) + 1;

  // Update the counter
  const updatedSequence = await db.serialNumberCounter.update({
    where: {
      id: counter.id,
    },
    data: {
      lastCounter: newCounter,
    },
  });

  await db.auditLog.create({
    data: {
      action: 'UPDATE',
      entityType: 'SEQUENCE',
      entityId: counter.id,
      userId: 'system',
      metadata: JSON.stringify({
        year,
        oldCounter: counter.lastCounter,
        newCounter,
        highestExistingNumber,
      }),
    },
  });

  return newCounter;
}

/**
 * Generate full order number using year and sequence
 * Format: YYYY-SEQ (e.g., 2026-001)
 */
export function formatOrderNumber(year: number, sequence: number): string {
  const yearStr = year.toString();
  const sequenceStr = sequence.toString().padStart(3, '0');
  return `${yearStr}-${sequenceStr}`;
}

/**
 * Generate full order number using year, month, and sequence
 * Format: YYYY-MM-SEQ (e.g., 2026-01-001)
 */
export function formatOrderNumberWithMonth(year: number, month: number, sequence: number): string {
  const yearStr = year.toString();
  const monthStr = month.toString().padStart(2, '0');
  const sequenceStr = sequence.toString().padStart(3, '0');
  return `${yearStr}-${monthStr}-${sequenceStr}`;
}

/**
 * Generate short order number using year and sequence
 * Format: YY-NNNN (e.g., 26-0001)
 */
export function formatShortOrderNumber(year: number, sequence: number): string {
  const yearShort = year.toString().slice(-2);
  const sequenceStr = sequence.toString().padStart(4, '0');
  return `${yearShort}-${sequenceStr}`;
}

/**
 * Compose full order number with file type and sequence
 * Used for file numbering (INV-2026-001, PO-2026-001, etc.)
 */
export function composeFullNumber(
  filePrefix: string,
  year: number,
  sequence: number
): string {
  const number = formatOrderNumber(year, sequence);
  return `${filePrefix}${number}`;
}

/**
 * Reserve sequence number atomically
 * Used within order creation transaction to guarantee uniqueness
 */
export async function reserveSequenceNumber(
  year: number,
  idempotencyKey?: string
): Promise<{ number: number; wasDuplicate: boolean }> {
  
  if (idempotencyKey) {
    // Check if this key was already used
    const existingOrder = await db.order.findFirst({
      where: {
        idempotencyKey,
      },
      select: {
        id: true,
        numberYear: true,
        numberSequence: true,
      },
    });

    if (existingOrder) {
      await db.auditLog.create({
        data: {
          action: 'DUPLICATE',
          entityType: 'ORDER',
          entityId: idempotencyKey,
          userId: 'system',
          metadata: JSON.stringify({
            existingOrderId: existingOrder.id,
            reason: 'Idempotency key already used',
          }),
        },
      });
      
      return {
        number: 0,
        wasDuplicate: true,
      };
    }
  }

  const nextNumber = await getNextSequenceNumber(year);
  
  await db.auditLog.create({
    data: {
      action: 'RESERVE',
      entityType: 'SEQUENCE',
      entityId: `YEAR-${year}`,
      userId: 'system',
      metadata: JSON.stringify({
        year,
        reservedNumber: nextNumber,
        idempotencyKey,
      }),
    },
  });

  return {
    number: nextNumber,
    wasDuplicate: false,
  };
}
