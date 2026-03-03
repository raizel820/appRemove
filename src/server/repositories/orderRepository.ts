/**
 * Order Repository (Updated)
 * Database access layer for orders with proper soft-delete filtering
 */

import { db } from '@/lib/db';
import { OrderType, OrderStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

export interface OrderFilters {
  type?: OrderType;
  status?: OrderStatus;
  customerId?: string;
  year?: number;
  search?: string;
  includeDeleted?: boolean;
}

export class OrderRepository {
  /**
   * Create a new order with items
   */
  async create(data: Prisma.OrderCreateInput) {
    return await db.order.create({
      data,
      include: {
        items: true,
        customer: true,
      },
    });
  }

  /**
   * Find an order by ID
   */
  async findById(id: string, includeDeleted = false) {
    const where: Prisma.OrderWhereInput = { id };

    // Only include soft-deleted records if explicitly requested
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    return await db.order.findUnique({
      where,
      include: {
        items: {
          include: {
            model: {
              include: {
                family: true,
              },
            },
          },
        },
        customer: true,
      },
    });
  }

  /**
   * Find an order by full number
   */
  async findByNumber(fullNumber: string, includeDeleted = false) {
    const where: Prisma.OrderWhereInput = { fullNumber };

    if (!includeDeleted) {
      where.deletedAt = null;
    }

    return await db.order.findFirst({
      where,
      include: {
        items: {
          include: {
            model: {
              include: {
                family: true,
              },
            },
          },
        },
        customer: true,
      },
    });
  }

  /**
   * Get all orders with optional filters
   */
  async findAll(filters?: OrderFilters) {
    const where: Prisma.OrderWhereInput = {};

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters?.year) {
      where.numberYear = filters.year;
    }

    if (filters?.search) {
      where.OR = [
        { fullNumber: { contains: filters.search } },
        { customerName: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Always filter out soft-deleted records unless explicitly requested
    if (!filters?.includeDeleted) {
      where.deletedAt = null;
    }

    return await db.order.findMany({
      where,
      include: {
        items: {
          include: {
            model: {
              include: {
                family: true,
              },
            },
          },
        },
        customer: true,
      },
      orderBy: [
        { numberYear: 'desc' },
        { numberSequence: 'desc' },
      ],
    });
  }

  /**
   * Get the next sequence number for a given year
   * IMPORTANT: Excludes soft-deleted records to prevent number reuse
   */
  async getNextSequenceNumber(year: number): Promise<number> {
    const result = await db.order.aggregate({
      where: {
        numberYear: year,
        deletedAt: null, // CRITICAL: Only count non-deleted orders
      },
      _max: {
        numberSequence: true,
      },
    });

    return (result._max.numberSequence || 0) + 1;
  }

  /**
   * Update an order
   */
  async update(id: string, data: Prisma.OrderUpdateInput) {
    const where: Prisma.OrderWhereInput = {
      id,
      deletedAt: null, // Prevent updating soft-deleted records
    };

    return await db.order.update({
      where,
      data,
      include: {
        items: {
          include: {
            model: {
              include: {
                family: true,
              },
            },
          },
        },
        customer: true,
      },
    });
  }

  /**
   * Update order items (replace all items)
   */
  async updateItems(orderId: string, items: Prisma.OrderItemCreateManyInput[]) {
    // Verify order exists and is not deleted
    const order = await db.order.findFirst({
      where: {
        id: orderId,
        deletedAt: null,
      },
    });

    if (!order) {
      throw new Error('Order not found or is deleted');
    }

    // Delete existing items
    await db.orderItem.deleteMany({
      where: { orderId },
    });

    // Create new items one by one (createMany has limitations with complex types)
    if (items.length > 0) {
      for (const item of items) {
        await db.orderItem.create({
          data: {
            orderId,
            modelId: item.modelId,
            description: item.description || '',
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            discount: item.discount || 0,
            totalPrice: item.totalPrice || 0,
            specifications: item.specifications,
            snapshotModel: item.snapshotModel,
          },
        });
      }
    }

    // Return updated order
    return await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            model: {
              include: {
                family: true,
              },
            },
          },
        },
        customer: true,
      },
    });
  }

  /**
   * Soft delete an order
   * Note: Number state transitions are now handled by OrderService
   * This method only soft-deletes the order record
   * @param id - Order ID
   * @returns The deleted order
   */
  async softDelete(id: string) {
    const order = await this.findById(id);

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.deletedAt) {
      throw new Error('Order is already deleted');
    }

    // Mark order as deleted
    const deletedOrder = await db.order.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Return the deleted order
    return deletedOrder;
  }

  /**
   * Restore a soft-deleted order
   */
  async restore(id: string) {
    const order = await this.findById(id, true);

    if (!order) {
      throw new Error('Order not found');
    }

    if (!order.deletedAt) {
      throw new Error('Order is not deleted');
    }

    return await db.order.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  /**
   * Permanently delete an order
   */
  async delete(id: string) {
    return await db.order.delete({
      where: { id },
    });
  }

  /**
   * Count orders
   */
  async count(filters?: OrderFilters) {
    const where: Prisma.OrderWhereInput = {};

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters?.year) {
      where.numberYear = filters.year;
    }

    if (filters?.search) {
      where.OR = [
        { fullNumber: { contains: filters.search } },
        { customerName: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (!filters?.includeDeleted) {
      where.deletedAt = null;
    }

    return await db.order.count({ where });
  }
}

// Singleton instance
let orderRepositoryInstance: OrderRepository | null = null;

export function getOrderRepository(): OrderRepository {
  if (!orderRepositoryInstance) {
    orderRepositoryInstance = new OrderRepository();
  }
  return orderRepositoryInstance;
}
