/**
 * Machine Service (Updated with Spec Templates)
 * Business logic for machine families and models with spec template support
 */

import { MachineRepository } from '../repositories/machineRepository';
import { SpecTemplateService } from '../services/specTemplateService';
import { Prisma } from '@prisma/client';

export class MachineService {
  private machineRepository: MachineRepository;
  private specTemplateService: SpecTemplateService;

  constructor() {
    this.machineRepository = new MachineRepository();
    this.specTemplateService = new SpecTemplateService();
  }

  // ==================== Machine Families ====================

  /**
   * Create a new machine family
   */
  async createFamily(data: {
    name: string;
    description?: string;
    code: string;
    modelSpecs?: boolean;
  }) {
    // Check if code already exists
    const existingFamily = await this.machineRepository.findFamilyByCode(data.code);
    if (existingFamily) {
      throw new Error('Family code already exists');
    }

    const familyData: any = {
      name: data.name,
      description: data.description,
      code: data.code,
      modelSpecs: data.modelSpecs || false,
    };

    return this.machineRepository.createFamily(familyData);
  }

  /**
   * Get a machine family by ID
   */
  async getFamily(id: string) {
    const family = await this.machineRepository.findFamilyById(id);
    if (!family) {
      throw new Error('Machine family not found');
    }

    return {
      ...family,
      models: family.models || [],
    };
  }

  /**
   * Get all machine families
   */
  async getFamilies(search?: string) {
    const families = await this.machineRepository.findAllFamilies({ search });

    // Get spec templates for families that use them
    const familiesWithTemplates = await Promise.all(
      families.map(async (family) => ({
        ...family,
        specTemplate: family.modelSpecs ? await this.specTemplateService.getDefaultFields('Capacity') : null,
      }))
    );

    return familiesWithTemplates;
  }

  /**
   * Update a machine family
   */
  async updateFamily(id: string, data: {
    name?: string;
    description?: string;
    code?: string;
    modelSpecs?: boolean;
  }) {
    const existingFamily = await this.machineRepository.findFamilyById(id);
    if (!existingFamily) {
      throw new Error('Machine family not found');
    }

    // If code is being updated, check if new code already exists
    if (data.code && data.code !== existingFamily.code) {
      const existingWithCode = await this.machineRepository.findFamilyByCode(data.code);
      if (existingWithCode && existingWithCode.id !== id) {
        throw new Error('Family code already in use');
      }
    }

    const familyData: any = {
      name: data.name,
      description: data.description,
      code: data.code,
      modelSpecs: data.modelSpecs !== undefined ? data.modelSpecs : existingFamily.modelSpecs,
    };

    return this.machineRepository.updateFamily(id, familyData);
  }

  /**
   * Delete a machine family with optional cascade delete of models
   */
  async deleteFamily(id: string, deleteModels: boolean = false) {
    const family = await this.machineRepository.findFamilyById(id);
    if (!family) {
      throw new Error('Machine family not found');
    }

    // If family has models and deleteModels is false, throw error
    if (family.models && family.models.length > 0 && !deleteModels) {
      throw new Error('Cannot delete family with models. Delete models first.');
    }

    // If deleteModels is true, delete all models first
    if (deleteModels && family.models && family.models.length > 0) {
      for (const model of family.models) {
        await this.machineRepository.deleteModel(model.id);
      }
    }

    return this.machineRepository.deleteFamily(id);
  }

  // ==================== Machine Models ====================

  /**
   * Create a new machine model
   */
  async createModel(data: {
    familyId: string;
    name: string;
    code: string;
    description?: string;
    basePrice?: number;
    specifications?: string;
    specTemplateId?: string;
    isManufactured?: boolean;
    specs?: {
      mechanical?: Record<string, any>;
      electrical?: Record<string, any>;
      physical?: Record<string, any>;
    };
    mechanicalSpecs?: Record<string, any> | null;
    electricalSpecs?: Record<string, any> | null;
    physicalSpecs?: Record<string, any> | null;
  }) {
    // Check if code already exists
    const existingModel = await this.machineRepository.findModelByCode(data.code);
    if (existingModel) {
      throw new Error('Model code already exists');
    }

    // Verify family exists
    const family = await this.machineRepository.findFamilyById(data.familyId);
    if (!family) {
      throw new Error('Machine family not found');
    }

    // Get spec template if specified (existing behavior)
    let specTemplate = null;
    if (data.specTemplateId) {
      specTemplate = await this.specTemplateService.getTemplate(data.specTemplateId);
    }

    // Normalize specs to explicit fields - support both formats
    const mechanicalSpecs = data.mechanicalSpecs ?? data.specs?.mechanical ?? null;
    const electricalSpecs = data.electricalSpecs ?? data.specs?.electrical ?? null;
    const physicalSpecs = data.physicalSpecs ?? data.specs?.physical ?? null;

    // Pass through to repository (Prisma create input)
    return this.machineRepository.createModel({
      ...data,
      specTemplateId: data.specTemplateId || (specTemplate?.id || null),
      // ensure explicit JSON fields are provided
      mechanicalSpecs,
      electricalSpecs,
      physicalSpecs,
    } as any); // as any to satisfy the Prisma input type if needed
  }


  /**
   * Get a machine model by ID
   */
  async getModel(id: string) {
    const model = await this.machineRepository.findModelById(id);
    if (!model) {
      throw new Error('Machine model not found');
    }

    // Parse specifications if it's a JSON string (old format)
    let specs = model.specifications;
    if (model.specifications && typeof model.specifications === 'string') {
      try {
        specs = JSON.parse(model.specifications);
      } catch (e) {
        specs = null;
      }
    }

    return {
      ...model,
      specifications: specs,
      specTemplate: model.specTemplate ? await this.specTemplateService.getTemplate(model.specTemplate.id) : null,
    };
  }

  /**
   * Get all machine models
   */
  async getModels(familyId?: string, search?: string) {
    const models = await this.machineRepository.findAllModels({ familyId, search });

    // Get spec templates for all models
    const modelsWithTemplates = await Promise.all(
      models.map(async (model) => ({
        ...model,
        specTemplate: model.specTemplate ? await this.specTemplateService.getTemplate(model.specTemplate.id) : null,
      }))
    );

    return modelsWithTemplates;
  }

  /**
   * Update a machine model
   */
  async updateModel(id: string, data: {
    name?: string;
    code?: string;
    description?: string | null;
    basePrice?: number | null;
    specifications?: string | null;
    specTemplateId?: string | null;
    isManufactured?: boolean | null;
    specs?: {
      mechanical?: Record<string, any> | null;
      electrical?: Record<string, any> | null;
      physical?: Record<string, any> | null;
    } | null;
  }) {
    // Optionally: validate code uniqueness if code is being changed
    if (data.code) {
      const existing = await this.machineRepository.findModelByCode(data.code);
      if (existing && existing.id !== id) {
        throw new Error('Another model with this code already exists');
      }
    }

    // Normalize specs - when user sends `null` explicitly we pass null; when undefined we don't include the field
    const mechanicalSpecs = data.specs ? data.specs.mechanical ?? null : undefined;
    const electricalSpecs = data.specs ? data.specs.electrical ?? null : undefined;
    const physicalSpecs = data.specs ? data.specs.physical ?? null : undefined;

    // build update payload and remove undefined keys
    const updatePayload: any = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.code !== undefined && { code: data.code }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
      ...(data.specifications !== undefined && { specifications: data.specifications }),
      ...(data.specTemplateId !== undefined && { specTemplateId: data.specTemplateId }),
      ...(data.isManufactured !== undefined && { isManufactured: data.isManufactured }),
      // specs fields:
      ...(mechanicalSpecs !== undefined && { mechanicalSpecs }),
      ...(electricalSpecs !== undefined && { electricalSpecs }),
      ...(physicalSpecs !== undefined && { physicalSpecs }),
    };

    return this.machineRepository.updateModel(id, updatePayload);
  }


  /**
   * Delete a machine model
   */
  async deleteModel(id: string) {
    const model = await this.machineRepository.findModelById(id);
    if (!model) {
      throw new Error('Machine model not found');
    }

    return this.machineRepository.deleteModel(id);
  }

  /**
   * Get models by family ID
   */
  async getModelsByFamilyId(familyId: string) {
    const models = await this.machineRepository.getModelsByFamilyId(familyId);

    // Get spec templates for all models
    const modelsWithTemplates = await Promise.all(
      models.map(async (model) => ({
        ...model,
        specTemplate: model.specTemplate ? await this.specTemplateService.getTemplate(model.specTemplate.id) : null,
      }))
    );

    return modelsWithTemplates;
  }

  /**
   * Search machine families and models
   */
  async searchMachines(query: string) {
    return {
      families: await this.machineRepository.findAllFamilies({ search }),
      models: await this.machineRepository.findAllModels({ search }),
    };
  }

  /**
   * Get all spec templates
   */
  async getAllSpecTemplates() {
    return this.specTemplateService.getAllActiveTemplates();
  }
}

// Singleton instance
let machineServiceInstance: MachineService | null = null;

export function getMachineService(): MachineService {
  if (!machineServiceInstance) {
    machineServiceInstance = new MachineService();
  }
  return machineServiceInstance;
}
