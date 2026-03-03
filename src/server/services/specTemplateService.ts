/**
 * Spec Templates Service
 * Business logic for reusable specification templates
 */

import { SpecTemplateRepository } from '../repositories/specTemplateRepository';

export class SpecTemplateService {
  private specTemplateRepository: SpecTemplateRepository;

  constructor() {
    this.specTemplateRepository = new SpecTemplateRepository();
  }

  /**
   * Get all active spec templates
   */
  async getAllActiveTemplates() {
    return this.specTemplateRepository.findAll({ isActive: true });
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string) {
    return this.specTemplateRepository.getActiveByCategory(category);
  }

  /**
   * Get a template by ID
   */
  async getTemplate(id: string) {
    const template = await this.specTemplateRepository.findById(id);
    if (!template) {
      throw new Error('Spec template not found');
    }

    return {
      ...template,
      fields: template.fields ? JSON.parse(template.fields) : [],
    };
  }

  /**
   * Create a new spec template
   */
  async createTemplate(data: {
    name: string;
    description?: string;
    category: string;
    fields: string[];
  }) {
    return this.specTemplateRepository.create({
      ...data,
      fields: JSON.stringify(data.fields),
      isActive: true,
    });
  }

  /**
   * Update a spec template
   */
  async updateTemplate(id: string, data: {
    name?: string;
    description?: string;
    category?: string;
    fields?: string[];
    isActive?: boolean;
  }) {
    const updateData: any = { ...data };
    if (data.fields) {
      updateData.fields = JSON.stringify(data.fields);
    }

    return this.specTemplateRepository.update(id, updateData);
  }

  /**
   * Delete a spec template
   */
  async deleteTemplate(id: string) {
    return this.specTemplateRepository.delete(id);
  }

  /**
   * Get default spec fields for a category
   */
  async getDefaultFields(category: string) {
    const defaultFields: Record<string, any> = {
      'Capacity': ['capacity', 'capacity_unit', 'capacity_metric'],
      'Power': ['power', 'power_unit', 'power_metric'],
      'Dimensions': ['length', 'width', 'height', 'depth', 'weight'],
      'Materials': ['frame_material', 'cover_material', 'motor_brand'],
      'Temperature': ['min_temp', 'max_temp', 'operating_temp_range'],
      'Electrical': ['voltage', 'frequency', 'current', 'power_factor'],
      'Performance': ['speed', 'rpm', 'efficiency'],
      'Safety': ['emergency_stop', 'safety_sensor', 'guarding'],
      'Other': ['color', 'noise_level', 'warranty_period'],
    };

    return defaultFields[category] || [];
  }
}

// Singleton instance
let specTemplateServiceInstance: SpecTemplateService | null = null;

export function getSpecTemplateService(): SpecTemplateService {
  if (!specTemplateServiceInstance) {
    specTemplateServiceInstance = new SpecTemplateService();
  }
  return specTemplateServiceInstance;
}
