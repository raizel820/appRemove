/**
 * Order Number Repository
 * Manages order number lifecycle with atomic operations and state machine
 */

import { db } from '@/lib/db';
import { OrderNumberState } from '@prisma/client';

const RESERVATION_TTL_MINUTES = 10; // 10 minutes TTL for reservations

export interface ReserveNextResult {
  number: number;
  reservationId: string;
  expiresAt: Date;
}

export interface ReserveSpecificResult {
  number: number;
  reservationId: string;
  expiresAt: Date;
}

export interface ReusableNumberInfo {
  number: number;
  originalOrderId: string;
  deletedAt: Date;
  notes: string | null;
}

export class OrderNumberRepository {
  /**
   * Reserve next highest number for a specific year
   * Uses SerialNumberCounter for year-based numbering
   * @param reservedBy - Identifier for who is reserving the number
   * @param year - The year for which to reserve a number (e.g., 2026)
   */
  async reserveNextNumber(reservedBy: string, year: number): Promise<ReserveNextResult> {
    // For year-based numbering, use SerialNumberCounter directly via getNextSequenceNumberNoAudit()
    // This avoids conflicts with OrderNumber's unique constraint
    const { getNextSequenceNumberNoAudit } = await import('@/lib/order-numbering');
    const nextSequence = await getNextSequenceNumberNoAudit(year);

    // Create a reservation ID and expiration
    const reservedAt = new Date();
    const expiresAt = new Date(reservedAt.getTime() + RESERVATION_TTL_MINUTES * 60 * 1000);
    const reservationId = `${reservedBy}-${nextSequence}-${year}-${reservedAt.getTime()}`;

    // Return without creating OrderNumber record (since SerialNumberCounter tracks it)
    return {
      number: nextSequence,
      reservationId,
      expiresAt,
    };
  }

  /**
   * Reserve a specific reusable number
   * Uses conditional update for atomic claim
   */
  async reserveSpecificNumber(
    number: number,
    reservedBy: string
  ): Promise<ReserveSpecificResult> {
    const reservedAt = new Date();
    const expiresAt = new Date(reservedAt.getTime() + RESERVATION_TTL_MINUTES * 60 * 1000);
    const reservationId = `${reservedBy}-${number}-${reservedAt.getTime()}`;

    // Use conditional update to atomically claim number
    const result = await db.orderNumber.updateMany({
      where: {
        number,
        state: OrderNumberState.REUSABLE,
      },
      data: {
        state: OrderNumberState.RESERVED,
        reservedBy,
        reservedAt,
        notes: reservationId,
      },
    });

    if (result.count === 0) {
      throw new Error(`Number ${number} is not available for reservation`);
    }

    return {
      number,
      reservationId,
      expiresAt,
    };
  }

  /**
   * Get list of reusable numbers available for use
   */
  async getReusableNumbers(): Promise<ReusableNumberInfo[]> {
    const reusableNumbers = await db.orderNumber.findMany({
      where: {
        state: OrderNumberState.REUSABLE,
      },
      include: {
        orders: {
          where: {
            deletedAt: { not: null },
          },
          orderBy: {
            deletedAt: 'desc',
          },
          take: 1,
          select: {
            id: true,
            deletedAt: true,
          },
        },
      },
      orderBy: {
        number: 'asc',
      },
    });

    return reusableNumbers.map(num => ({
      number: num.number,
      originalOrderId: num.orders[0]?.id || '',
      deletedAt: num.orders[0]?.deletedAt || new Date(),
      notes: num.notes,
    }));
  }

  /**
   * Claim/claim a reservation (convert to used state)
   * Called when finalizing an order
   */
  async claimReservation(
    number: number,
    reservationId: string
  ): Promise<void> {
    const orderNumber = await db.orderNumber.findUnique({
      where: { number },
    });

    if (!orderNumber) {
      throw new Error(`Number ${number} not found`);
    }

    if (orderNumber.state !== OrderNumberState.RESERVED) {
      throw new Error(`Number ${number} is not in reserved state`);
    }

    if (orderNumber.notes !== reservationId) {
      throw new Error(`Reservation ID mismatch for number ${number}`);
    }

    // Check if reservation has expired
    if (orderNumber.reservedAt) {
      const now = new Date();
      const expiresAt = new Date(
        orderNumber.reservedAt.getTime() + RESERVATION_TTL_MINUTES * 60 * 1000
      );

      if (now > expiresAt) {
        throw new Error(`Reservation for number ${number} has expired`);
      }
    }

    // Transition to USED state
    await db.orderNumber.update({
      where: { number },
      data: {
        state: OrderNumberState.USED,
        reservedBy: null,
        reservedAt: null,
        notes: `Used by order`,
      },
    });
  }

  /**
   * Release a reservation
   * Transitions number back to appropriate state
   */
  async releaseReservation(
    number: number,
    allowReuse: boolean = false
  ): Promise<void> {
    const orderNumber = await db.orderNumber.findUnique({
      where: { number },
    });

    if (!orderNumber) {
      throw new Error(`Number ${number} not found`);
    }

    if (orderNumber.state !== OrderNumberState.RESERVED) {
      throw new Error(`Number ${number} is not in reserved state`);
    }

    // Transition to appropriate state
    const newState = allowReuse ? OrderNumberState.REUSABLE : OrderNumberState.BLOCKED;

    await db.orderNumber.update({
      where: { number },
      data: {
        state: newState,
        reservedBy: null,
        reservedAt: null,
        notes: allowReuse ? 'Released and marked reusable' : 'Released and blocked',
      },
    });
  }

  /**
   * Mark a number as blocked (used and cannot be reused)
   * Called when deleting an order without reuse permission
   */
  async blockNumber(number: number): Promise<void> {
    const orderNumber = await db.orderNumber.findUnique({
      where: { number },
    });

    if (!orderNumber) {
      throw new Error(`Number ${number} not found`);
    }

    if (orderNumber.state !== OrderNumberState.USED) {
      throw new Error(`Number ${number} is not in used state`);
    }

    await db.orderNumber.update({
      where: { number },
      data: {
        state: OrderNumberState.BLOCKED,
        notes: 'Blocked - deletion without reuse permission',
      },
    });
  }

  /**
   * Mark a number as reusable (used but can be reused)
   * Called when deleting an order with reuse permission
   */
  async markNumberReusable(number: number): Promise<void> {
    const orderNumber = await db.orderNumber.findUnique({
      where: { number },
    });

    if (!orderNumber) {
      throw new Error(`Number ${number} not found`);
    }

    if (orderNumber.state !== OrderNumberState.USED) {
      throw new Error(`Number ${number} is not in used state`);
    }

    await db.orderNumber.update({
      where: { number },
      data: {
        state: OrderNumberState.REUSABLE,
        notes: 'Marked reusable - deletion with reuse permission',
      },
    });
  }

  /**
   * Clean up expired reservations
   * Should be run periodically as a background job
   */
  async cleanupExpiredReservations(): Promise<number> {
    const now = new Date();
    const expiresBefore = new Date(now.getTime() - RESERVATION_TTL_MINUTES * 60 * 1000);

    // Find all expired reservations
    const expiredNumbers = await db.orderNumber.findMany({
      where: {
        state: OrderNumberState.RESERVED,
        reservedAt: {
          lt: expiresBefore,
        },
      },
    });

    // For each expired reservation, transition to BLOCKED
    // (safer default - expired reservations are blocked by default)
    let cleanedCount = 0;
    for (const num of expiredNumbers) {
      await db.orderNumber.update({
        where: { number: num.number },
        data: {
          state: OrderNumberState.BLOCKED,
          reservedBy: null,
          reservedAt: null,
          notes: 'Blocked - reservation expired',
        },
      });
      cleanedCount++;
    }

    return cleanedCount;
  }

  /**
   * Get number info by order ID
   */
  async getNumberByOrderId(orderId: string): Promise<{ number: number; state: OrderNumberState } | null> {
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        orderNumber: true,
        numberRef: {
          select: {
            number: true,
            state: true,
          },
        },
      },
    });

    if (!order?.orderNumber || !order.numberRef) {
      return null;
    }

    return {
      number: order.orderNumber,
      state: order.numberRef.state,
    };
  }

  /**
   * Get all numbers in a specific state
   */
  async getNumbersByState(state: OrderNumberState): Promise<Array<{ number: number; state: OrderNumberState; reservedAt: Date | null }>> {
    return await db.orderNumber.findMany({
      where: { state },
      select: {
        number: true,
        state: true,
        reservedAt: true,
      },
      orderBy: {
        number: 'asc',
      },
    });
  }

  /**
   * Validate reservation is still valid
   */
  async validateReservation(number: number, reservationId: string): Promise<boolean> {
    const orderNumber = await db.orderNumber.findUnique({
      where: { number },
    });

    if (!orderNumber || orderNumber.state !== OrderNumberState.RESERVED) {
      return false;
    }

    if (orderNumber.notes !== reservationId) {
      return false;
    }

    if (!orderNumber.reservedAt) {
      return false;
    }

    const now = new Date();
    const expiresAt = new Date(
      orderNumber.reservedAt.getTime() + RESERVATION_TTL_MINUTES * 60 * 1000
    );

    return now <= expiresAt;
  }
}

// Singleton instance
let orderNumberRepositoryInstance: OrderNumberRepository | null = null;

export function getOrderNumberRepository(): OrderNumberRepository {
  if (!orderNumberRepositoryInstance) {
    orderNumberRepositoryInstance = new OrderNumberRepository();
  }
  return orderNumberRepositoryInstance;
}
