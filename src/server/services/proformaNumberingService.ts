/**
 * Proforma Numbering Service
 * Provides per-year sequence number generation and management for proforma invoices
 * Independent from order and invoice numbers but uses the same logic
 *
 * Custom Number Logic:
 * - AUTO- prefix: Auto-generated numbers (tracked separately)
 * - CUSTOM- prefix: Custom numbers (don't affect auto-numbering)
 * - REUSE- prefix: Reused numbers (don't affect auto-numbering)
 */

import { db } from '@/lib/db';

export interface ReserveProformaResult {
  seq: number;
  year: number;
  reservationId: string;
  expiresAt: string; // ISO date string
}

export interface GetNextProformaResult {
  seq: number;
  year: number;
}

export class ProformaNumberingService {
  /**
   * Get the highest auto-generated seq for a year
   * Looks for entries with AUTO- prefix in reservedBy
   */
  private async getHighestAutoSeq(year: number): Promise<number> {
    const autoNumbers = await db.proformaNumbers.findMany({
      where: {
        year,
        reservedBy: {
          startsWith: 'AUTO-',
        },
      },
      orderBy: {
        seq: 'desc',
      },
      select: {
        seq: true,
      },
      take: 1,
    });

    return autoNumbers[0]?.seq || 0;
  }

  /**
   * Reserve the next proforma number for a specific year
   * This creates an entry in ProformaNumbers table with RESERVED state
   *
   * Logic:
   * 1. Start from the highest auto-generated seq + 1
   * 2. Skip any used/reserved numbers
   * 3. Continue until finding an available number
   */
  async reserveNextForYear(
    year: number,
    reservedBy: string
  ): Promise<ReserveProformaResult> {
    // Get the highest auto-generated seq
    let candidateSeq = await this.getHighestAutoSeq(year) + 1;

    // Find the next available number, skipping any used/reserved ones
    while (true) {
      // Check if this number already exists in ProformaNumbers
      const existingNumber = await db.proformaNumbers.findFirst({
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
      if (candidateSeq > 10000) {
        throw new Error(`Unable to find an available proforma number. Tried ${candidateSeq} numbers.`);
      }
    }

    // Create the full reservation ID with AUTO prefix
    const reservationId = `AUTO-${reservedBy}-${year}-${candidateSeq}-${Date.now()}`;

    // Create ProformaNumbers entry with RESERVED state directly
    const proformaNumber = await db.proformaNumbers.create({
      data: {
        year,
        seq: candidateSeq,
        state: 'RESERVED',
        reservedBy: reservationId,  // Save with AUTO prefix
        reservedAt: new Date(),
      },
    });

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    return {
      seq: proformaNumber.seq,
      year,
      reservationId,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Finalize a reservation (convert to USED state)
   * Called when a proforma is created/issued
   *
   * Only updates internal tracking for AUTO- prefix numbers
   */
  async finalizeReservation(
    year: number,
    seq: number,
    reservationId: string,
    orderId?: string
  ): Promise<void> {
    // Find the reservation by year and seq, filtering by state
    const proformaNumber = await db.proformaNumbers.findFirst({
      where: {
        year,
        seq,
        state: 'RESERVED',
      },
    });

    if (!proformaNumber) {
      throw new Error(`Proforma reservation ${year}-${seq} not found`);
    }

    if (proformaNumber.reservedBy !== reservationId) {
      throw new Error(`Proforma reservation ${year}-${seq} ownership mismatch`);
    }

    // Check if reservation has expired
    if (proformaNumber.reservedAt) {
      const now = new Date();
      const expiresAt = new Date(
        proformaNumber.reservedAt.getTime() + 10 * 60 * 1000
      );

      if (now > expiresAt) {
        throw new Error(`Proforma reservation ${year}-${seq} has expired`);
      }
    }

    // Update to USED state
    await db.proformaNumbers.update({
      where: {
        id: proformaNumber.id,
      },
      data: {
        state: 'USED',
        reservedBy: null,
        reservedAt: null,
        orderId: orderId || null,
      },
    });

    // For AUTO- prefix numbers, we could update tracking here if needed
    // Currently, tracking is done by finding AUTO- prefix entries in reserveNextForYear
  }

  /**
   * Get reusable proforma numbers for a specific year
   */
  async getReusableNumbers(year: number): Promise<Array<{ seq: number; year: number; reservedAt: Date | null }>> {
    const reusableNumbers = await db.proformaNumbers.findMany({
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
   * Reserve a specific proforma number for reuse
   * This updates an existing REUSABLE entry to RESERVED state
   *
   * Note: Uses REUSE- prefix to mark this as reused
   */
  async reserveSpecificForYear(
    year: number,
    seq: number,
    reservedBy: string
  ): Promise<ReserveProformaResult> {
    const reservedAt = new Date();
    const expiresAt = new Date(reservedAt.getTime() + 10 * 60 * 1000); // 10 minutes TTL
    const reservationId = `REUSE-${reservedBy}-${year}-${seq}-${reservedAt.getTime()}`;

    // Update ProformaNumbers entry to RESERVED state
    const result = await db.proformaNumbers.updateMany({
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
      throw new Error(`Proforma number ${seq}/${year} is not available for reuse`);
    }

    return {
      seq,
      year,
      reservationId,  // Return the same reservationId that was saved
      expiresAt: expiresAt.toISOString(),  // 10 minutes from now
    };
  }

  /**
   * Reserve a specific custom proforma number for a year
   * Handles new numbers and REUSABLE entries
   *
   * Note: Uses CUSTOM- prefix to mark this as custom
   */
  async reserveCustomForYear(
    year: number,
    seq: number,
    reservedBy: string
  ): Promise<ReserveProformaResult> {
    const reservedAt = new Date();
    const expiresAt = new Date(reservedAt.getTime() + 10 * 60 * 1000); // 10 minutes TTL
    const reservationId = `CUSTOM-${reservedBy}-${year}-${seq}-${reservedAt.getTime()}`;

    // Check if number already exists
    const existingNumber = await db.proformaNumbers.findFirst({
      where: {
        year,
        seq,
      },
    });

    if (!existingNumber) {
      // Case 1: Number doesn't exist - create it as RESERVED (new custom number)
      const proformaNumber = await db.proformaNumbers.create({
        data: {
          year,
          seq,
          state: 'RESERVED',
          reservedBy: reservationId,
          reservedAt,
        },
      });

      return {
        seq: proformaNumber.seq,
        year,
        reservationId,
        expiresAt: expiresAt.toISOString(),
      };
    }

    // Case 2: Number exists - check state
    if (existingNumber.state === 'USED') {
      throw new Error(`Proforma number ${seq}/${year} is already in use`);
    }

    if (existingNumber.state === 'RESERVED') {
      // Check if reservation is expired
      if (existingNumber.reservedAt) {
        const now = new Date();
        const expiredAt = new Date(
          existingNumber.reservedAt.getTime() + 10 * 60 * 1000
        );
        if (now <= expiredAt) {
          throw new Error(`Proforma number ${seq}/${year} is currently reserved`);
        }
        // Reservation expired - can reclaim it
      }
    }

    if (existingNumber.state === 'BLOCKED') {
      throw new Error(`Proforma number ${seq}/${year} is blocked and cannot be used`);
    }

    // Case 3: Number is REUSABLE (or has expired reservation) - update to RESERVED
    const result = await db.proformaNumbers.updateMany({
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
      throw new Error(`Proforma number ${seq}/${year} is not available`);
    }

    return {
      seq,
      year,
      reservationId,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Get the next sequence for a year (without reserving)
   */
  async getNextForYear(year: number): Promise<GetNextProformaResult> {
    // Find the highest seq for this year from ProformaNumbers table
    const maxProforma = await db.proformaNumbers.findFirst({
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

    const nextSeq = (maxProforma?.seq || 0) + 1;

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
    const existing = await db.proformaNumbers.findFirst({
      where: {
        year,
        seq,
      },
    });

    if (!existing) {
      return { available: true, reason: 'Proforma number is available' };
    }

    if (existing.state === 'USED') {
      return { available: false, reason: 'Proforma number is currently in use' };
    }

    if (existing.state === 'RESERVED') {
      return { available: false, reason: 'Proforma number is reserved' };
    }

    // REUSABLE and BLOCKED states are considered available
    return { available: true, reason: 'Proforma number is available' };
  }

  /**
   * Release an expired reservation
   */
  async releaseReservation(year: number, seq: number): Promise<void> {
    await db.proformaNumbers.deleteMany({
      where: {
        year,
        seq,
        state: 'RESERVED',
      },
    });
  }

  /**
   * Mark a proforma number as blocked (used and cannot be reused)
   * Called when deleting an order without proforma reuse permission
   */
  async blockNumber(seq: number, year: number): Promise<void> {
    const proformaNumber = await db.proformaNumbers.findFirst({
      where: {
        year,
        seq,
      },
    });

    if (!proformaNumber) {
      throw new Error(`Proforma number ${year}-${seq} not found`);
    }

    if (proformaNumber.state !== 'USED') {
      throw new Error(`Proforma number ${year}-${seq} is not in used state`);
    }

    await db.proformaNumbers.update({
      where: {
        id: proformaNumber.id,
      },
      data: {
        state: 'BLOCKED',
      },
    });
  }

  /**
   * Mark a proforma number as reusable (used but can be reused)
   * Called when deleting an order with proforma reuse permission
   */
  async markNumberReusable(seq: number, year: number): Promise<void> {
    const proformaNumber = await db.proformaNumbers.findFirst({
      where: {
        year,
        seq,
      },
    });

    if (!proformaNumber) {
      throw new Error(`Proforma number ${year}-${seq} not found`);
    }

    if (proformaNumber.state !== 'USED') {
      throw new Error(`Proforma number ${year}-${seq} is not in used state`);
    }

    await db.proformaNumbers.update({
      where: {
        id: proformaNumber.id,
      },
      data: {
        state: 'REUSABLE',
      },
    });
  }
}

// Singleton instance
let serviceInstance: ProformaNumberingService | null = null;

export function getProformaNumberingService(): ProformaNumberingService {
  if (!serviceInstance) {
    serviceInstance = new ProformaNumberingService();
  }
  return serviceInstance;
}
