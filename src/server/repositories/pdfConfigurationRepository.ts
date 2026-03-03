/**
 * PDF Configuration Repository
 * Database access layer for PDF configuration settings
 */

import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export class PDFConfigurationRepository {
  /**
   * Get PDF configuration (singleton - there should be only one)
   */
  async getConfiguration() {
    return db.pDFConfiguration.findFirst();
  }

  /**
   * Create PDF configuration
   */
  async create(data: Prisma.PDFConfigurationCreateInput) {
    // Check if configuration already exists
    const existing = await this.getConfiguration();
    if (existing) {
      throw new Error('PDF configuration already exists. Use update instead.');
    }

    return db.pDFConfiguration.create({ data });
  }

  /**
   * Update PDF configuration
   */
  async update(data: Prisma.PDFConfigurationUpdateInput) {
    const config = await this.getConfiguration();
    if (!config) {
      throw new Error('PDF configuration not found. Create it first.');
    }

    return db.pDFConfiguration.update({
      where: { id: config.id },
      data,
    });
  }

  /**
   * Ensure configuration exists (create default if not)
   */
  async ensureConfiguration() {
    const existing = await this.getConfiguration();
    if (existing) {
      return existing;
    }

    // Create default configuration
    return this.create({
      headerCompanyName: '',
      headerDescription: '',
      includeHeaderCompanyName: true,
      includeHeaderDescription: true,
      includeHeaderLogo: true,
      includeCompanyProfile: true,
      companyProfileFr: JSON.stringify([]),
      companyProfileAr: JSON.stringify([]),
      logoScale: 1.0,
      logoPosition: 'center',
      documentSettings: JSON.stringify({}),
    });
  }
}

// Singleton instance
let pdfConfigRepositoryInstance: PDFConfigurationRepository | null = null;

export function getPDFConfigurationRepository(): PDFConfigurationRepository {
  if (!pdfConfigRepositoryInstance) {
    pdfConfigRepositoryInstance = new PDFConfigurationRepository();
  }
  return pdfConfigRepositoryInstance;
}
