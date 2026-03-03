/**
 * Storage Adapter Interface
 * Provides abstraction for file system operations
 */

export interface StorageAdapter {
  /**
   * Ensure a directory exists, create if it doesn't
   */
  ensureDirectory(path: string): Promise<void>;

  /**
   * Create a customer folder structure
   */
  createCustomerFolder(customerId: string, customerName: string): Promise<string>;

  /**
   * Save a PDF file to the appropriate customer folder
   */
  savePDF(
    customerId: string,
    pdfType: string,
    numberFormatted: string,
    date: Date,
    customerShort: string,
    pdfBuffer: Buffer
  ): Promise<string>;

  /**
   * Save a file attachment
   */
  saveAttachment(customerId: string, fileName: string, buffer: Buffer): Promise<string>;

  /**
   * Check if a file exists
   */
  fileExists(path: string): Promise<boolean>;

  /**
   * Read a file
   */
  readFile(path: string): Promise<Buffer>;

  /**
   * Delete a file
   */
  deleteFile(path: string): Promise<void>;

  /**
   * Get base data directory path
   */
  getBaseDataPath(): string;
}
