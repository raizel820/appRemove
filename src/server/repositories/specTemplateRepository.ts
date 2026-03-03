/**
 * Spec Templates Repository
 * Database access layer for reusable specification templates
 */

import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export interface SpecTemplateFilters {
  category?: string;
  isActive?: boolean;
}

export class SpecTemplateRepository {
  /**
   * Create a new spec template
   */
  async create(data: Prisma.SpecTemplateCreateInput) {
    return await db.specTemplate.create({ data });
  }

  /**
   * Find a spec template by ID
   */
  async findById(id: string) {
    return await db.specTemplate.findUnique({
      where: { id },
    });
  }

  /**
   * Find a spec template by name
   */
  async findByName(name: string) {
    return await db.specTemplate.findFirst({
      where: { name },
    });
  }

  /**
   * Get all spec templates with optional filters
   */
  async findAll(filters?: SpecTemplateFilters) {
    const where: Prisma.SpecTemplateWhereInput = {};

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return await db.specTemplate.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Update a spec template
   */
  async update(id: string, data: Prisma.SpecTemplateUpdateInput) {
    return await db.specTemplate.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a spec template
   */
  async delete(id: string) {
    return await db.specTemplate.delete({
      where: { id },
    });
  }

  /**
   * Get active templates by category
   */
  async getActiveByCategory(category: string) {
    return await db.specTemplate.findMany({
      where: {
        category,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Count templates
   */
  async count(filters?: SpecTemplateFilters) {
    const where: Prisma.SpecTemplateWhereInput = {};

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return await db.specTemplate.count({ where });
  }
}

// Singleton instance
let specTemplateRepositoryInstance: SpecTemplateRepository | null = null;

export function getSpecTemplateRepository(): SpecTemplateRepository {
  if (!specTemplateRepositoryInstance) {
    specTemplateRepositoryInstance = new SpecTemplateRepository();
  }
  return specTemplateRepositoryInstance;
}
