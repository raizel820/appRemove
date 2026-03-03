/**
 * Year-Aware Order Numbering Service
 * Provides per-year sequence number generation and management
 * Updated to work with regenerated Prisma client
 */

import { db } from '@/lib/db';

export interface ReserveForYearResult {
  seq: number;
  year: number;
  reservationId: string;
  expiresAt: string; // ISO date string
}

export interface ReserveSpecificResult {
  seq: number;
  year: number;
  reservationId: string;
  expiresAt: string; // ISO date string
}

export interface GetNextForYearResult {
  seq: number;
  year: number;
}

export class YearAwareOrderNumberingService {
  /**
   * Reserve the next sequence number for a specific year
   * This creates an entry in OrderNumbers table with RESERVED state
   *
   * Logic:
   * 1. Start from SerialNumberCounter.lastCounter + 1 (tracks only auto-generated numbers)
   * 2. Check if the number exists in OrderNumbers (USED or RESERVED state)
   * 3. If used/reserved, increment and check again
   * 4. Continue until finding an unused number
   * 5. This prevents gaps when custom numbers are used
   *
   * Note: Uses a special prefix in reservedBy to mark this as auto-generated
   */
  async reserveNextForYear(
    year: number,
    reservedBy: string
  ): Promise<ReserveForYearResult> {
    // Get or create the SerialNumberCounter for this year
    // This counter ONLY tracks auto-generated numbers, not custom numbers
    let counter = await db.serialNumberCounter.findUnique({
      where: { year },
    });

    if (!counter) {
      counter = await db.serialNumberCounter.create({
        data: { year, lastCounter: 0 },
      });
    }

    // Start from the last auto-generated number + 1
    let candidateSeq = counter.lastCounter + 1;

    // Find the next available number, skipping any used/reserved ones
    // This prevents gaps when custom numbers are used in between
    while (true) {
      // Check if this number already exists in OrderNumbers
      const existingNumber = await db.orderNumbers.findFirst({
        where: {
          year,
          seq: candidateSeq,
          state: {
            in: ['USED', 'RESERVED'], // Skip used and reserved numbers
          },
        },
        select: { seq: true },
      });

      if (!existingNumber) {
        // This number is available
        break;
      }

      // Number is already used or reserved, try the next one
      candidateSeq++;

      // Safety check: prevent infinite loop
      if (candidateSeq > counter.lastCounter + 10000) {
        throw new Error(`Unable to find an available order number. Tried ${candidateSeq - counter.lastCounter} numbers.`);
      }
    }

    // Create the full reservation ID with AUTO prefix to identify auto-generated numbers
    const reservationId = `AUTO-${reservedBy}-${year}-${candidateSeq}-${Date.now()}`;

    // Create OrderNumbers entry with RESERVED state directly
    const orderNumber = await db.orderNumbers.create({
      data: {
        year,
        seq: candidateSeq,
        state: 'RESERVED',
        reservedBy: reservationId,  // Save the full reservation ID with AUTO prefix
        reservedAt: new Date(),
      },
    });

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    return {
      seq: orderNumber.seq,
      year,
      reservationId,  // Return the same reservationId
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Reserve a specific number for reuse
   * This updates an existing REUSABLE entry to RESERVED state
   *
   * Note: Uses a special prefix in reservedBy to mark this as reused
   */
  async reserveSpecificForYear(
    year: number,
    seq: number,
    reservedBy: string
  ): Promise<ReserveSpecificResult> {
    const reservedAt = new Date();
    const expiresAt = new Date(reservedAt.getTime() + 10 * 60 * 1000); // 10 minutes TTL
    const reservationId = `REUSE-${reservedBy}-${year}-${seq}-${reservedAt.getTime()}`;

    // Update OrderNumbers entry to RESERVED state
    const result = await db.orderNumbers.updateMany({
      where: {
        year,
        seq,
        state: 'REUSABLE',
      },
      data: {
        state: 'RESERVED',
        reservedBy: reservationId,  // Save with REUSE prefix
        reservedAt,
      },
    });

    if (result.count === 0) {
      throw new Error(`Number ${seq}/${year} is not available for reuse`);
    }

    return {
      seq,
      year,
      reservationId,  // Return the same reservationId that was saved
      expiresAt: expiresAt.toISOString(),  // 10 minutes from now
    };
  }

  /**
   * Reserve a specific custom number for a year
   * This handles two cases:
   * 1. Number doesn't exist - create it as RESERVED (new custom number)
   * 2. Number exists and is REUSABLE - update it to RESERVED
   *
   * Throws error if number is USED, RESERVED, or BLOCKED
   *
   * Note: Uses a special prefix in reservedBy to mark this as custom
   */
  async reserveCustomForYear(
    year: number,
    seq: number,
    reservedBy: string
  ): Promise<ReserveSpecificResult> {
    const reservedAt = new Date();
    const expiresAt = new Date(reservedAt.getTime() + 10 * 60 * 1000); // 10 minutes TTL
    const reservationId = `CUSTOM-${reservedBy}-${year}-${seq}-${reservedAt.getTime()}`;

    // Check if number already exists
    const existingNumber = await db.orderNumbers.findFirst({
      where: {
        year,
        seq,
      },
    });

    if (!existingNumber) {
      // Case 1: Number doesn't exist - create it as RESERVED (new custom number)
      const orderNumber = await db.orderNumbers.create({
        data: {
          year,
          seq,
          state: 'RESERVED',
          reservedBy: reservationId,
          reservedAt,
        },
      });

      return {
        seq: orderNumber.seq,
        year,
        reservationId,
        expiresAt: expiresAt.toISOString(),
      };
    }

    // Case 2: Number exists - check state
    if (existingNumber.state === 'USED') {
      throw new Error(`Number ${seq}/${year} is already in use by an order`);
    }

    if (existingNumber.state === 'RESERVED') {
      // Check if reservation is expired
      if (existingNumber.reservedAt) {
        const now = new Date();
        const expiredAt = new Date(
          existingNumber.reservedAt.getTime() + 10 * 60 * 1000
        );
        if (now <= expiredAt) {
          throw new Error(`Number ${seq}/${year} is currently reserved`);
        }
        // Reservation expired - can reclaim it
      }
    }

    if (existingNumber.state === 'BLOCKED') {
      throw new Error(`Number ${seq}/${year} is blocked and cannot be used`);
    }

    // Case 3: Number is REUSABLE (or has expired reservation) - update to RESERVED
    const result = await db.orderNumbers.updateMany({
      where: {
        year,
        seq,
        state: {
          in: ['REUSABLE', 'RESERVED'], // Allow reclaiming expired reservations
        },
      },
      data: {
        state: 'RESERVED',
        reservedBy: reservationId,
        reservedAt,
      },
    });

    if (result.count === 0) {
      throw new Error(`Number ${seq}/${year} is not available`);
    }

    return {
      seq,
      year,
      reservationId,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Finalize a reservation (convert to USED state)
   * Called when an order is created
   *
   * Note: SerialNumberCounter is only updated for auto-generated numbers
   * (identified by AUTO- prefix in reservationId).
   * Custom numbers don't update the counter, preventing gaps.
   */
  async finalizeReservation(
    year: number,
    seq: number,
    reservationId: string
  ): Promise<void> {
    // Find the reservation by year and seq, filtering by state
    const orderNumber = await db.orderNumbers.findFirst({
      where: {
        year,
        seq,
        state: 'RESERVED',
      },
    });

    if (!orderNumber) {
      throw new Error(`Reservation ${year}-${seq} not found`);
    }

    if (orderNumber.reservedBy !== reservationId) {
      throw new Error(`Reservation ${year}-${seq} ownership mismatch`);
    }

    // Check if reservation has expired
    if (orderNumber.reservedAt) {
      const now = new Date();
      const expiresAt = new Date(
        orderNumber.reservedAt.getTime() + 10 * 60 * 1000
      );

      if (now > expiresAt) {
        throw new Error(`Reservation ${year}-${seq} has expired`);
      }
    }

    // Update to USED state
    await db.orderNumbers.update({
      where: {
        id: orderNumber.id,
      },
      data: {
        state: 'USED',
        reservedBy: null,
        reservedAt: null,
      },
    });

    // Update SerialNumberCounter ONLY for auto-generated numbers
    // (identified by AUTO- prefix in reservationId)
    const isAutoGenerated = reservationId.startsWith('AUTO-');

    if (isAutoGenerated) {
      const counter = await db.serialNumberCounter.findUnique({
        where: { year },
      });

      if (counter) {
        // Only update if this seq is greater than current counter
        // (handles the case where we skip over custom numbers)
        if (seq > counter.lastCounter) {
          await db.serialNumberCounter.update({
            where: { id: counter.id },
            data: {
              lastCounter: seq,
            },
          });
        }
      } else {
        // Counter doesn't exist, create it
        await db.serialNumberCounter.create({
          data: {
            year,
            lastCounter: seq,
          },
        });
      }
    }
    // For custom numbers (no AUTO- prefix), don't update the counter
  }

  /**
   * Get reusable numbers for a specific year
   */
  async getReusableNumbers(year: number): Promise<Array<{ seq: number; year: number; reservedAt: Date | null }>> {
    const reusableNumbers = await db.orderNumbers.findMany({
      where: {
        year,
        state: 'REUSABLE',
      },
      orderBy: {
        seq: 'asc',
      },
      select: {
        seq: true,
        year: true,
        reservedAt: true,
      },
    });

    return reusableNumbers.map(n => ({
      seq: n.seq,
      year: n.year,
      reservedAt: n.reservedAt,
    }));
  }

  /**
   * Get the next sequence for a year (without reserving)
   */
  async getNextForYear(year: number): Promise<GetNextForYearResult> {
    // Find the highest seq for this year from OrderNumbers table
    // Look at ALL states to find the highest sequence number used/reserved
    const maxOrder = await db.orderNumbers.findFirst({
      where: {
        year,
      },
      orderBy: {
        seq: 'desc',
      },
      select: {
        seq: true,
      },
    });

    const nextSeq = (maxOrder?.seq || 0) + 1;

    return {
      seq: nextSeq,
      year,
    };
  }

  /**
   * Validate if a specific seq is available for a given year
   */
  async validateAvailableForYear(
    year: number,
    seq: number
  ): Promise<{ available: boolean; reason: string }> {
    const existing = await db.orderNumbers.findFirst({
      where: {
        year,
        seq,
      },
    });

    if (!existing) {
      return { available: true, reason: 'Number is available' };
    }

    if (existing.state === 'USED') {
      return { available: false, reason: 'Number is currently in use' };
    }

    if (existing.state === 'RESERVED') {
      return { available: false, reason: 'Number is reserved' };
    }

    // REUSABLE and BLOCKED states are considered available
    return { available: true, reason: 'Number is available' };
  }

  /**
   * Mark an order number as blocked (used and cannot be reused)
   * Called when deleting an order without reuse permission
   */
  async blockNumber(seq: number, year: number): Promise<void> {
    const orderNumber = await db.orderNumbers.findFirst({
      where: {
        year,
        seq,
      },
    });

    if (!orderNumber) {
      throw new Error(`Order number ${year}-${seq} not found`);
    }

    if (orderNumber.state !== 'USED') {
      throw new Error(`Order number ${year}-${seq} is not in used state`);
    }

    await db.orderNumbers.update({
      where: {
        id: orderNumber.id,
      },
      data: {
        state: 'BLOCKED',
      },
    });
  }

  /**
   * Mark an order number as reusable (used but can be reused)
   * Called when deleting an order with reuse permission
   */
  async markNumberReusable(seq: number, year: number): Promise<void> {
    const orderNumber = await db.orderNumbers.findFirst({
      where: {
        year,
        seq,
      },
    });

    if (!orderNumber) {
      throw new Error(`Order number ${year}-${seq} not found`);
    }

    if (orderNumber.state !== 'USED') {
      throw new Error(`Order number ${year}-${seq} is not in used state`);
    }

    await db.orderNumbers.update({
      where: {
        id: orderNumber.id,
      },
      data: {
        state: 'REUSABLE',
      },
    });
  }
}

// Singleton instance
let serviceInstance: YearAwareOrderNumberingService | null = null;

export function getYearAwareOrderNumberingService(): YearAwareOrderNumberingService {
  if (!serviceInstance) {
    serviceInstance = new YearAwareOrderNumberingService();
  }
  return serviceInstance;
}
