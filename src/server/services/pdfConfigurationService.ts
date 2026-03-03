/**
 * PDF Configuration Service
 * Business logic for PDF configuration settings
 */

import { PDFConfigurationRepository, getPDFConfigurationRepository } from '@/server/repositories/pdfConfigurationRepository';
import { OrderType, PDFFontFamily } from '@prisma/client';

export interface DocumentSettings {
  fontFamily: PDFFontFamily;
  fontSize: number;
  textColor: string;
  bgColor: string | null;
  showCompanyProfile: boolean;
  companyProfileFields: string[];
}

export interface PDFConfigurationData {
  headerCompanyName: string;
  headerDescription: string;
  includeHeaderCompanyName: boolean;
  includeHeaderDescription: boolean;
  includeHeaderLogo: boolean;
  includeCompanyProfile: boolean;
  companyProfileFr: string[];
  companyProfileAr: string[];
  logoScale: number;
  logoPosition: string;
  headerFontFamily: PDFFontFamily;
  headerFontSize: number;
  headerTextColor: string;
  headerBgColor: string | null;
  documentSettings: Record<string, DocumentSettings>;
}

export class PDFConfigurationService {
  private repository: PDFConfigurationRepository;

  constructor(repository?: PDFConfigurationRepository) {
    this.repository = repository || getPDFConfigurationRepository();
  }

  /**
   * Get PDF configuration
   */
  async getConfiguration(): Promise<PDFConfigurationData | null> {
    const config = await this.repository.getConfiguration();

    if (!config) {
      return null;
    }

    return {
      headerCompanyName: config.headerCompanyName,
      headerDescription: config.headerDescription,
      includeHeaderCompanyName: config.includeHeaderCompanyName,
      includeHeaderDescription: config.includeHeaderDescription,
      includeHeaderLogo: config.includeHeaderLogo,
      includeCompanyProfile: config.includeCompanyProfile,
      companyProfileFr: config.companyProfileFr ? JSON.parse(config.companyProfileFr) : [],
      companyProfileAr: config.companyProfileAr ? JSON.parse(config.companyProfileAr) : [],
      logoScale: config.logoScale,
      logoPosition: config.logoPosition,
      headerFontFamily: config.headerFontFamily,
      headerFontSize: config.headerFontSize,
      headerTextColor: config.headerTextColor,
      headerBgColor: config.headerBgColor,
      documentSettings: config.documentSettings ? JSON.parse(config.documentSettings) : {},
    };
  }

  /**
   * Update PDF configuration
   */
  async updateConfiguration(data: Partial<PDFConfigurationData>): Promise<void> {
    const updateData: any = {};

    if (data.headerCompanyName !== undefined) {
      updateData.headerCompanyName = data.headerCompanyName;
    }
    if (data.headerDescription !== undefined) {
      updateData.headerDescription = data.headerDescription;
    }
    if (data.includeHeaderCompanyName !== undefined) {
      updateData.includeHeaderCompanyName = data.includeHeaderCompanyName;
    }
    if (data.includeHeaderDescription !== undefined) {
      updateData.includeHeaderDescription = data.includeHeaderDescription;
    }
    if (data.includeHeaderLogo !== undefined) {
      updateData.includeHeaderLogo = data.includeHeaderLogo;
    }
    if (data.includeCompanyProfile !== undefined) {
      updateData.includeCompanyProfile = data.includeCompanyProfile;
    }
    if (data.companyProfileFr !== undefined) {
      updateData.companyProfileFr = JSON.stringify(data.companyProfileFr);
    }
    if (data.companyProfileAr !== undefined) {
      updateData.companyProfileAr = JSON.stringify(data.companyProfileAr);
    }
    if (data.logoScale !== undefined) {
      updateData.logoScale = data.logoScale;
    }
    if (data.logoPosition !== undefined) {
      updateData.logoPosition = data.logoPosition;
    }
    if (data.headerFontFamily !== undefined) {
      updateData.headerFontFamily = data.headerFontFamily;
    }
    if (data.headerFontSize !== undefined) {
      updateData.headerFontSize = data.headerFontSize;
    }
    if (data.headerTextColor !== undefined) {
      updateData.headerTextColor = data.headerTextColor;
    }
    if (data.headerBgColor !== undefined) {
      updateData.headerBgColor = data.headerBgColor;
    }
    if (data.documentSettings !== undefined) {
      updateData.documentSettings = JSON.stringify(data.documentSettings);
    }

    await this.repository.update(updateData);
  }

  /**
   * Ensure configuration exists
   */
  async ensureConfiguration(): Promise<PDFConfigurationData> {
    const config = await this.repository.ensureConfiguration();

    return {
      headerCompanyName: config.headerCompanyName,
      headerDescription: config.headerDescription,
      includeHeaderCompanyName: config.includeHeaderCompanyName,
      includeHeaderDescription: config.includeHeaderDescription,
      includeHeaderLogo: config.includeHeaderLogo,
      includeCompanyProfile: config.includeCompanyProfile,
      companyProfileFr: config.companyProfileFr ? JSON.parse(config.companyProfileFr) : [],
      companyProfileAr: config.companyProfileAr ? JSON.parse(config.companyProfileAr) : [],
      logoScale: config.logoScale,
      logoPosition: config.logoPosition,
      headerFontFamily: config.headerFontFamily,
      headerFontSize: config.headerFontSize,
      headerTextColor: config.headerTextColor,
      headerBgColor: config.headerBgColor,
      documentSettings: config.documentSettings ? JSON.parse(config.documentSettings) : {},
    };
  }

  /**
   * Get document-specific settings
   */
  async getDocumentSettings(orderType: OrderType): Promise<DocumentSettings | null> {
    const config = await this.getConfiguration();

    if (!config || !config.documentSettings[orderType]) {
      return null;
    }

    return config.documentSettings[orderType];
  }
}

// Singleton instance
let pdfConfigServiceInstance: PDFConfigurationService | null = null;

export function getPDFConfigurationService(): PDFConfigurationService {
  if (!pdfConfigServiceInstance) {
    pdfConfigServiceInstance = new PDFConfigurationService();
  }
  return pdfConfigServiceInstance;
}
