/**
 * Company Repository (Enhanced)
 * Database access layer for company settings with multiple contacts and identifiers
 */

import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export class CompanyRepository {
  /**
   * Get company settings (singleton - there should be only one)
   */
  async getCompany() {
    const company = await db.company.findFirst({
      include: {
        logos: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    // Parse JSON arrays
    if (company) {
      if (company.phoneNumbers && typeof company.phoneNumbers === 'string') {
        try {
          company.phoneNumbers = JSON.parse(company.phoneNumbers);
        } catch (e) {
          company.phoneNumbers = [];
        }
      }
      if (company.faxNumbers && typeof company.faxNumbers === 'string') {
        try {
          company.faxNumbers = JSON.parse(company.faxNumbers);
        } catch (e) {
          company.faxNumbers = [];
        }
      }
      if (company.emails && typeof company.emails === 'string') {
        try {
          company.emails = JSON.parse(company.emails);
        } catch (e) {
          company.emails = [];
        }
      }
    }

    return company;
  }

  /**
   * Create company settings
   */
  async create(data: Prisma.CompanyCreateInput) {
    // Check if company already exists
    const existing = await this.getCompany();
    if (existing) {
      throw new Error('Company already exists. Use update instead.');
    }

    return await db.company.create({ data });
  }

  /**
   * Update company settings
   */
  async update(data: Prisma.CompanyUpdateInput) {
    const company = await this.getCompany();
    if (!company) {
      throw new Error('Company not found. Create it first.');
    }

    // Handle array fields conversion if provided as arrays
    if ('phoneNumbers' in data && data.phoneNumbers && Array.isArray(data.phoneNumbers)) {
      data.phoneNumbers = JSON.stringify(data.phoneNumbers) as any;
    }
    if ('faxNumbers' in data && data.faxNumbers && Array.isArray(data.faxNumbers)) {
      data.faxNumbers = JSON.stringify(data.faxNumbers) as any;
    }
    if ('emails' in data && data.emails && Array.isArray(data.emails)) {
      data.emails = JSON.stringify(data.emails) as any;
    }

    return await db.company.update({
      where: { id: company.id },
      data,
    });
  }

  /**
   * Ensure company exists (create default if not)
   */
  async ensureCompany() {
    const existing = await this.getCompany();
    if (existing) {
      return existing;
    }

    // Create default company settings
    return this.create({
      name: 'EURL LA SOURCE',
      currency: 'EUR',
      defaultLanguage: 'en',
    });
  }

  /**
   * Update company active logo
   */
  async setActiveLogo(activeLogoId: string) {
    const company = await this.getCompany();
    if (!company) {
      throw new Error('Company not found');
    }

    return await db.company.update({
      where: { id: company.id },
      data: { activeLogoId },
    });
  }
}

// Singleton instance
let companyRepositoryInstance: CompanyRepository | null = null;

export function getCompanyRepository(): CompanyRepository {
  if (!companyRepositoryInstance) {
    companyRepositoryInstance = new CompanyRepository();
  }
  return companyRepositoryInstance;
}
