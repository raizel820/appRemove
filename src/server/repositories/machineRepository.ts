/**
 * Machine Repository (Updated with Spec Templates)
 * Database access layer for machine families and models with spec template support
 * Fixed: Removed deletedAt filter for MachineModel
 */

import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export interface MachineFamilyFilters {
  search?: string;
  includeDeleted?: boolean;
  includeModels?: boolean;
}

export interface MachineModelFilters {
  familyId?: string;
  search?: string;
  includeDeleted?: boolean;
  includeManufactured?: boolean;
  specTemplateId?: string;
}

export class MachineRepository {
  /**
   * Create a new machine family
   */
  async createFamily(data: Prisma.MachineFamilyCreateInput) {
    return await db.machineFamily.create({ data });
  }

  /**
   * Find a machine family by ID
   */
  async findFamilyById(id: string) {
    return await db.machineFamily.findUnique({
      where: { id },
      include: {
        models: true,
      },
    });
  }

  /**
   * Find a machine family by code
   */
  async findFamilyByCode(code: string) {
    return await db.machineFamily.findUnique({
      where: { code },
    });
  }

  /**
   * Get all machine families with optional filters
   */
  async findAllFamilies(filters?: MachineFamilyFilters) {
    const where: Prisma.MachineFamilyWhereInput = {};

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return await db.machineFamily.findMany({
      where,
      include: {
        models: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Update a machine family
   */
  async updateFamily(id: string, data: Prisma.MachineFamilyUpdateInput) {
    return await db.machineFamily.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a machine family
   */
  async deleteFamily(id: string) {
    // Check if family has models
    const family = await this.findFamilyById(id);
    if (family?.models && family.models.length > 0) {
      throw new Error('Cannot delete family with models. Delete models first.');
    }

    return await db.machineFamily.delete({
      where: { id },
    });
  }

  /**
   * Create a new machine model
   */
  async createModel(data: Prisma.MachineModelCreateInput) {
    return await db.machineModel.create({
      data,
      include: {
        family: true,
      },
    });
  }

  /**
   * Find a machine model by ID
   */
  async findModelById(id: string) {
    return await db.machineModel.findUnique({
      where: { id },
      include: {
        family: true,
        specTemplate: true,
      },
    });
  }

  /**
   * Find a machine model by code
   */
  async findModelByCode(code: string) {
    return await db.machineModel.findUnique({
      where: { code },
      include: {
        family: true,
        specTemplate: true,
      },
    });
  }

  /**
   * Get all machine models with optional filters
   */
  async findAllModels(filters?: MachineModelFilters) {
    const where: Prisma.MachineModelWhereInput = {};

    if (filters?.familyId) {
      where.familyId = filters.familyId;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Filter by isManufactured if specified
    if (filters?.includeManufactured !== undefined) {
      where.isManufactured = filters.includeManufactured;
    }

    // Filter by spec template if specified
    if (filters?.specTemplateId) {
      where.specTemplateId = filters.specTemplateId;
    }

    return await db.machineModel.findMany({
      where,
      include: {
        family: true,
        specTemplate: true,
      },
      orderBy: [
        { family: { name: 'asc' } },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Update a machine model
   */
  async updateModel(id: string, data: Prisma.MachineModelUpdateInput) {
    return await db.machineModel.update({
      where: { id },
      data,
      include: {
        family: true,
        specTemplate: true,
      },
    });
  }

  /**
   * Delete a machine model
   */
  async deleteModel(id: string) {
    return await db.machineModel.delete({
      where: { id },
    });
  }

  /**
   * Get models by family ID
   */
  async getModelsByFamilyId(familyId: string) {
    return await db.machineModel.findMany({
      where: { familyId },
      include: {
        family: true,
        specTemplate: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get manufactured models only
   */
  async getManufacturedModels() {
    return await db.machineModel.findMany({
      where: { isManufactured: true },
      include: {
        family: true,
        specTemplate: true,
      },
      orderBy: [
        { family: { name: 'asc' } },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Get imported models only
   */
  async getImportedModels() {
    return await db.machineModel.findMany({
      where: { isManufactured: false },
      include: {
        family: true,
        specTemplate: true,
      },
      orderBy: [
        { family: { name: 'asc' } },
        { name: 'asc' },
      ],
    });
  }
}

// Singleton instance
let machineRepositoryInstance: MachineRepository | null = null;

export function getMachineRepository(): MachineRepository {
  if (!machineRepositoryInstance) {
    machineRepositoryInstance = new MachineRepository();
  }
  return machineRepositoryInstance;
}
