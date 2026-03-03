/**
 * Company Service (Enhanced)
 * Business logic for company settings with multiple contacts and identifiers
 */

import { CompanyRepository } from '../repositories/companyRepository';
import { Prisma } from '@prisma/client';

export class CompanyService {
  private companyRepository: CompanyRepository;

  constructor() {
    this.companyRepository = new CompanyRepository();
  }

  /**
   * Get company settings
   */
  async getCompany() {
    return this.companyRepository.getCompany();
  }

  /**
   * Update company settings
   */
  async updateCompany(data: {
    name?: string;
    address?: string;
    phoneNumbers?: string[];
    faxNumbers?: string[];
    emails?: string[];
    nif?: string;
    nis?: string;
    rib?: string;
    rcn?: string;
    bankName?: string;
    fundCapital?: number;
    logo?: string;
    currency?: string;
    defaultLanguage?: string;
    activityDescriptionAr?: string;
    activityDescriptionFr?: string;
    activeLogoId?: string;
    activeProfileId?: string;
  }) {
    const updateData: any = { ...data };

    // Serialize array fields to JSON
    if (data.phoneNumbers) {
      updateData.phoneNumbers = JSON.stringify(data.phoneNumbers);
    }
    if (data.faxNumbers) {
      updateData.faxNumbers = JSON.stringify(data.faxNumbers);
    }
    if (data.emails) {
      updateData.emails = JSON.stringify(data.emails);
    }

    return this.companyRepository.update(updateData);
  }

  /**
   * Update company logo
   */
  async updateLogo(logoPath: string) {
    return this.companyRepository.update({ logo: logoPath });
  }

  /**
   * Add phone number
   */
  async addPhoneNumber(phoneNumber: string) {
    const company = await this.companyRepository.getCompany();
    const phoneNumbers = company?.phoneNumbers ? JSON.parse(company.phoneNumbers) : [];

    phoneNumbers.push(phoneNumber);

    return this.companyRepository.update({
      phoneNumbers: JSON.stringify(phoneNumbers),
    });
  }

  /**
   * Ensure company exists (create default if not)
   */
  async ensureCompany() {
    return this.companyRepository.ensureCompany();
  }
}

// Singleton instance
let companyServiceInstance: CompanyService | null = null;

export function getCompanyService(): CompanyService {
  if (!companyServiceInstance) {
    companyServiceInstance = new CompanyService();
  }
  return companyServiceInstance;
}
