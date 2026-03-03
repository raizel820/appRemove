/**
 * Customer Repository (Updated)
 * Database access layer for customers with proper soft-delete filtering
 */

import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export interface CustomerFilters {
  search?: string;
  includeDeleted?: boolean;
}

export class CustomerRepository {
  /**
   * Create a new customer
   */
  async create(data: Prisma.CustomerCreateInput) {
    return await db.customer.create({ data });
  }

  /**
   * Find a customer by ID
   */
  async findById(id: string, includeDeleted = false) {
    const where: Prisma.CustomerWhereInput = {
      id,
    };

    // Only include soft-deleted records if explicitly requested
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    return await db.customer.findUnique({
      where,
    });
  }

  /**
   * Find a customer by code
   */
  async findByCode(code: string, includeDeleted = false) {
    const where: Prisma.CustomerWhereInput = {
      code,
    };

    if (!includeDeleted) {
      where.deletedAt = null;
    }

    return await db.customer.findUnique({
      where,
    });
  }

  /**
   * Get all customers with optional filters
   */
  async findAll(filters?: CustomerFilters) {
    const where: Prisma.CustomerWhereInput = {};

    if (filters?.search) {
      where.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { shortName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
      ];
    }

    // Always filter out soft-deleted records unless explicitly requested
    if (!filters?.includeDeleted) {
      where.deletedAt = null;
    }

    return await db.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update a customer
   */
  async update(id: string, data: Prisma.CustomerUpdateInput) {
    const where: Prisma.CustomerWhereInput = {
      id,
      deletedAt: null, // Prevent updating soft-deleted records
    };

    return await db.customer.update({
      where,
      data,
    });
  }

  /**
   * Soft delete a customer
   */
  async softDelete(id: string) {
    return await db.customer.update({
      where: {
        id,
        deletedAt: null, // Can't soft-delete an already-deleted record
      },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Restore a soft-deleted customer
   */
  async restore(id: string) {
    return await db.customer.update({
      where: {
        id,
        deletedAt: { not: null }, // Can only restore soft-deleted records
      },
      data: { deletedAt: null },
    });
  }

  /**
   * Permanently delete a customer
   */
  async delete(id: string) {
    return await db.customer.delete({
      where: { id },
    });
  }

  /**
   * Count customers
   */
  async count(filters?: CustomerFilters) {
    const where: Prisma.CustomerWhereInput = {};

    if (filters?.search) {
      where.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { shortName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (!filters?.includeDeleted) {
      where.deletedAt = null;
    }

    return await db.customer.count({ where });
  }
}

// Singleton instance
let customerRepositoryInstance: CustomerRepository | null = null;

export function getCustomerRepository(): CustomerRepository {
  if (!customerRepositoryInstance) {
    customerRepositoryInstance = new CustomerRepository();
  }
  return customerRepositoryInstance;
}
