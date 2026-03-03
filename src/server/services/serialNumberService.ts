/**
 * Serial Number Assignment Service
 * Handles atomic serial number generation and assignment for orders
 */

import { db } from '@/lib/db';
import { generateSerialNumber } from '../utils/serialGenerator';

export interface SerialAssignmentResult {
  orderItemId: string;
  serialNumbers: string[];
  isManufactured: boolean;
}

export class SerialNumberService {
  /**
   * Get or create serial number counter for the year
   */
  private async getOrCreateYearCounter(year: number): Promise<number> {
    const now = new Date();
    const currentYear = now.getFullYear();

    // Try to get existing counter
    let counter = await db.serialNumberCounter.findUnique({
      where: { year: currentYear },
    });

    if (!counter) {
      // Create new counter
      counter = await db.serialNumberCounter.create({
        data: { year: currentYear, lastCounter: 0 },
      });
    }

    return counter.lastCounter;
  }

  /**
   * Increment serial number counter atomically
   */
  private async incrementYearCounter(year: number): Promise<number> {
    const now = new Date();
    const currentYear = now.getFullYear();

    const result = await db.serialNumberCounter.upsert({
      where: { year: currentYear },
      create: { year: currentYear, lastCounter: 1 },
      update: {
        lastCounter: { increment: 1 },
      },
    });

    return result.lastCounter;
  }

  /**
   * Assign serial numbers to order items
   * Only assigns serials to manufactured machines (isManufactured = true)
   * Returns the results for each order item
   */
  async assignSerialNumbersToOrder(
    orderId: string,
    orderItems: Array<{
      id: string;
      modelId?: string;
      quantity: number;
      isCustomized: boolean;
      customizationVersion?: number;
    }>
  ): Promise<SerialAssignmentResult[]> {
    const results: SerialAssignmentResult[] = [];

    // Use a transaction to ensure atomicity
    return await db.$transaction(async (tx) => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      // Get current global counter
      let globalCounter = await tx.serialNumberCounter.findUnique({
        where: { year: currentYear },
      });

      if (!globalCounter) {
        globalCounter = await tx.serialNumberCounter.create({
          data: { year: currentYear, lastCounter: 0 },
        });
      }

      let lastUsedCounter = globalCounter.lastCounter;

      // Process each order item
      for (const item of orderItems) {
        const itemResult: SerialAssignmentResult = {
          orderItemId: item.id,
          serialNumbers: [],
          isManufactured: false,
        };

        // Get model to check if manufactured
        if (item.modelId) {
          const model = await tx.machineModel.findUnique({
            where: { id: item.modelId },
          });

          if (model?.isManufactured) {
            itemResult.isManufactured = true;

            // Generate serial numbers for this item
            const serials: string[] = [];
            for (let i = 0; i < item.quantity; i++) {
              lastUsedCounter++;
              const serial = generateSerialNumber({
                globalCounter: lastUsedCounter,
                year: currentYear,
                month: currentMonth,
                modelCode: model.code,
                isCustomized: item.isCustomized,
                version: item.customizationVersion || (item.isCustomized ? 1 : undefined),
              });
              serials.push(serial);
            }

            itemResult.serialNumbers = serials;

            // Update order item with serial numbers
            await tx.orderItem.update({
              where: { id: item.id },
              data: {
                serialNumbers: JSON.stringify(serials),
              },
            });
          }
        }

        results.push(itemResult);
      }

      // Update the global counter atomically
      await tx.serialNumberCounter.update({
        where: { year: currentYear },
        data: { lastCounter: lastUsedCounter },
      });

      return results;
    });
  }

  /**
   * Remove serial numbers from an order item (useful for order modification)
   */
  async removeSerialNumbersFromOrderItem(orderItemId: string): Promise<void> {
    await db.orderItem.update({
      where: { id: orderItemId },
      data: {
        serialNumbers: null,
      },
    });
  }

  /**
   * Remove all serial numbers from an order
   */
  async removeSerialNumbersFromOrder(orderId: string): Promise<void> {
    await db.orderItem.updateMany({
      where: { orderId },
      data: {
        serialNumbers: null,
      },
    });
  }
}

// Singleton instance
let serialNumberServiceInstance: SerialNumberService | null = null;

export function getSerialNumberService(): SerialNumberService {
  if (!serialNumberServiceInstance) {
    serialNumberServiceInstance = new SerialNumberService();
  }
  return serialNumberServiceInstance;
}
