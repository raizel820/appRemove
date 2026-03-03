/**
 * PDF Generation Service (Refactored)
 * Generates PDFs for invoices, proformas, delivery notes, POs, and nameplates
 * Uses unified document header component
 */

import { getStorageAdapter } from '../adapters/fsStorage';
import { formatOrderNumber, formatDateForFilename } from '../utils/orderNumberFormatter';
import { getDocumentTemplateGenerator, DocumentData } from './documentTemplateGenerator';

export class PDFService {
  /**
   * Generate PDF buffer (placeholder - returns HTML for now)
   * In production, this would use Puppeteer/Playwright to convert HTML to PDF
   */
  async generatePDF(data: DocumentData): Promise<Buffer> {
    const templateGenerator = getDocumentTemplateGenerator();
    const html = templateGenerator.generateDocumentHTML(data);

    // For now, return HTML as buffer (placeholder)
    // In production, use Puppeteer or Playwright:
    // const browser = await puppeteer.launch();
    // const page = await browser.newPage();
    // await page.setContent(html);
    // const pdf = await page.pdf({ format: 'A4' });
    // await browser.close();
    // return Buffer.from(pdf);

    return Buffer.from(html, 'utf-8');
  }

  /**
   * Generate and save PDF to customer folder
   */
  async generateAndSavePDF(
    customerId: string,
    customerShortName: string,
    data: DocumentData
  ): Promise<string> {
    const pdfBuffer = await this.generatePDF(data);
    const storage = getStorageAdapter();

    // Format order number for filename
    const numberFormatted = data.orderNumber.replace('/', '-');
    const dateFormatted = formatDateForFilename(data.date);

    return storage.savePDF(
      customerId,
      data.type,
      numberFormatted,
      data.date,
      customerShortName,
      pdfBuffer
    );
  }
}

// Singleton instance
let pdfServiceInstance: PDFService | null = null;

export function getPDFService(): PDFService {
  if (!pdfServiceInstance) {
    pdfServiceInstance = new PDFService();
  }
  return pdfServiceInstance;
}
