import { generateVerificationToken, type FileVerificationData } from './hashedTokenUtil';

export interface CompanyInfo {
  name: string;
  phoneNumbers?: string[];
  faxNumbers?: string[];
  emails?: string[];
  nif?: string;
  nis?: string;
  rcn?: string;
  rib?: string;
  bankName?: string;
  address?: string;
}

export interface CustomerInfo {
  name: string;
  nif?: string;
  nis?: string;
  rcn?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface ItemData {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface FileInfo {
  type: string;
  number: string;
  date: string;
  location?: string;
  totalAmount: number;
  currency: string;
}

export interface QRCodeConfig {
  // Company info options
  includeCompanyName: boolean;
  includeCompanyPhone: boolean;
  includeCompanyFax: boolean;
  includeCompanyEmail: boolean;
  includeCompanyNIF: boolean;
  includeCompanyNIS: boolean;
  includeCompanyRCN: boolean;

  // Customer info options
  includeCustomerName: boolean;
  includeCustomerNIF: boolean;
  includeCustomerNIS: boolean;
  includeCustomerRCN: boolean;
  includeCustomerEmail: boolean;

  // File info options
  includeFileType: boolean;
  includeFileNumber: boolean;
  includeFileDate: boolean;
  includeFileLocation: boolean;
  includeTotalPrice: boolean;

  // Other options
  includeItems: boolean;
  includeTerms: boolean;
  includeVerificationToken: boolean;

  // QR code appearance
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  size: number;
  margin: number;
  foregroundColor: string;
  backgroundColor: string;
}

export interface QRCodeData {
  company?: Partial<CompanyInfo>;
  customer?: Partial<CustomerInfo>;
  file?: FileInfo;
  items?: ItemData[];
  terms?: string;
  verificationToken?: string;
}

/**
 * Generate QR code data based on configuration
 * @param data - Data to include in QR code
 * @param config - Configuration for what to include
 * @returns Formatted data for QR code
 */
export function generateQRCodeData(data: QRCodeData, config: QRCodeConfig): string {
  const qrData: Record<string, any> = {};

  // Company info
  if (config.includeCompanyName && data.company?.name) {
    qrData.company = qrData.company || {};
    qrData.company.name = data.company.name;
  }
  if (config.includeCompanyPhone && data.company?.phoneNumbers) {
    qrData.company = qrData.company || {};
    qrData.company.phone = data.company.phoneNumbers[0];
  }
  if (config.includeCompanyFax && data.company?.faxNumbers) {
    qrData.company = qrData.company || {};
    qrData.company.fax = data.company.faxNumbers[0];
  }
  if (config.includeCompanyEmail && data.company?.emails) {
    qrData.company = qrData.company || {};
    qrData.company.email = data.company.emails[0];
  }
  if (config.includeCompanyNIF && data.company?.nif) {
    qrData.company = qrData.company || {};
    qrData.company.nif = data.company.nif;
  }
  if (config.includeCompanyNIS && data.company?.nis) {
    qrData.company = qrData.company || {};
    qrData.company.nis = data.company.nis;
  }
  if (config.includeCompanyRCN && data.company?.rcn) {
    qrData.company = qrData.company || {};
    qrData.company.rcn = data.company.rcn;
  }

  // Customer info
  if (config.includeCustomerName && data.customer?.name) {
    qrData.customer = qrData.customer || {};
    qrData.customer.name = data.customer.name;
  }
  if (config.includeCustomerNIF && data.customer?.nif) {
    qrData.customer = qrData.customer || {};
    qrData.customer.nif = data.customer.nif;
  }
  if (config.includeCustomerNIS && data.customer?.nis) {
    qrData.customer = qrData.customer || {};
    qrData.customer.nis = data.customer.nis;
  }
  if (config.includeCustomerRCN && data.customer?.rcn) {
    qrData.customer = qrData.customer || {};
    qrData.customer.rcn = data.customer.rcn;
  }
  if (config.includeCustomerEmail && data.customer?.email) {
    qrData.customer = qrData.customer || {};
    qrData.customer.email = data.customer.email;
  }

  // File info
  if (config.includeFileType && data.file?.type) {
    qrData.file = qrData.file || {};
    qrData.file.type = data.file.type;
  }
  if (config.includeFileNumber && data.file?.number) {
    qrData.file = qrData.file || {};
    qrData.file.number = data.file.number;
  }
  if (config.includeFileDate && data.file?.date) {
    qrData.file = qrData.file || {};
    qrData.file.date = data.file.date;
  }
  if (config.includeFileLocation && data.file?.location) {
    qrData.file = qrData.file || {};
    qrData.file.location = data.file.location;
  }
  if (config.includeTotalPrice && data.file?.totalAmount) {
    qrData.file = qrData.file || {};
    qrData.file.total = `${data.file.totalAmount} ${data.file.currency || ''}`;
  }

  // Items (simplified - only include summary if enabled)
  if (config.includeItems && data.items && data.items.length > 0) {
    qrData.items = {
      count: data.items.length,
      items: data.items.map(item => ({
        n: item.name,
        q: item.quantity,
        p: item.unitPrice,
        t: item.totalPrice
      }))
    };
  }

  // Terms
  if (config.includeTerms && data.terms) {
    qrData.terms = data.terms;
  }

  // Verification token
  if (config.includeVerificationToken && data.verificationToken) {
    qrData.verify = data.verificationToken;
  }

  return JSON.stringify(qrData);
}

/**
 * Generate verification token for QR code
 * @param data - File data
 * @param secretKey - Secret key for HMAC
 * @returns Hashed token
 */
export function generateQRCodeVerificationToken(
  data: FileVerificationData,
  secretKey?: string
): string {
  return generateVerificationToken(data, secretKey);
}

/**
 * Create minimal QR code data for compact codes
 * @param data - Full QR code data
 * @param config - Configuration
 * @returns Compacted data string
 */
export function generateCompactQRCodeData(data: QRCodeData, config: QRCodeConfig): string {
  const qrData: Record<string, any> = {};

  // Only include essential data for compact QR codes
  if (config.includeFileNumber && data.file?.number) {
    qrData.n = data.file.number;
  }
  if (config.includeFileDate && data.file?.date) {
    qrData.d = data.file.date;
  }
  if (config.includeTotalPrice && data.file?.totalAmount) {
    qrData.t = `${data.file.totalAmount} ${data.file.currency || ''}`;
  }
  if (config.includeVerificationToken && data.verificationToken) {
    qrData.v = data.verificationToken;
  }

  return JSON.stringify(qrData);
}

/**
 * Generate QR code data URL for use in PDFs
 * @param data - Data to encode
 * @param config - QR code configuration
 * @returns Data URL for QR code image
 */
export async function generateQRCodeDataURL(
  data: QRCodeData,
  config: QRCodeConfig
): Promise<string> {
  const qrDataString = generateQRCodeData(data, config);

  // Use a QR code library to generate the QR code
  // For now, return a placeholder URL
  // In production, you'd use a library like 'qrcode' or 'qrcode.react'
  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/`;
  const params = new URLSearchParams({
    size: `${config.size}x${config.size}`,
    data: qrDataString,
    color: config.foregroundColor.replace('#', ''),
    bgcolor: config.backgroundColor.replace('#', ''),
    margin: config.margin.toString(),
    ecc: config.errorCorrectionLevel,
  });

  return `${qrCodeApiUrl}?${params.toString()}`;
}

/**
 * Generate QR code data specifically for orders
 * @param orderData - Order information
 * @param config - QR code configuration
 * @returns QR code data string
 */
export function generateOrderQRCodeData(
  orderData: {
    orderNumber: string;
    type: string;
    date: string;
    totalAmount: number;
    currency: string;
    company?: Partial<CompanyInfo>;
    customer?: Partial<CustomerInfo>;
    items?: ItemData[];
    terms?: string;
    verificationSecret?: string;
  },
  config: QRCodeConfig
): string {
  const data: QRCodeData = {
    company: orderData.company,
    customer: orderData.customer,
    file: {
      type: orderData.type,
      number: orderData.orderNumber,
      date: orderData.date,
      totalAmount: orderData.totalAmount,
      currency: orderData.currency,
    },
    items: orderData.items,
    terms: orderData.terms,
  };

  // Generate verification token if enabled
  if (config.includeVerificationToken && orderData.verificationSecret) {
    const verificationData: FileVerificationData = {
      fileNumber: orderData.orderNumber,
      fileType: orderData.type,
      date: orderData.date,
      totalAmount: orderData.totalAmount,
      companyName: orderData.company?.name || '',
      customerName: orderData.customer?.name || '',
    };
    data.verificationToken = generateQRCodeVerificationToken(
      verificationData,
      orderData.verificationSecret
    );
  }

  return generateQRCodeData(data, config);
}

/**
 * Default QR code configuration
 */
export const defaultQRCodeConfig: QRCodeConfig = {
  // Company info options
  includeCompanyName: true,
  includeCompanyPhone: false,
  includeCompanyFax: false,
  includeCompanyEmail: true,
  includeCompanyNIF: true,
  includeCompanyNIS: false,
  includeCompanyRCN: false,

  // Customer info options
  includeCustomerName: true,
  includeCustomerNIF: false,
  includeCustomerNIS: false,
  includeCustomerRCN: false,
  includeCustomerEmail: true,

  // File info options
  includeFileType: true,
  includeFileNumber: true,
  includeFileDate: true,
  includeFileLocation: false,
  includeTotalPrice: true,

  // Other options
  includeItems: false,
  includeTerms: false,
  includeVerificationToken: true,

  // QR code appearance
  errorCorrectionLevel: 'M',
  size: 256,
  margin: 4,
  foregroundColor: '#000000',
  backgroundColor: '#FFFFFF',
};

/**
 * Validate QR code configuration
 * @param config - Configuration to validate
 * @returns True if valid, false otherwise
 */
export function validateQRCodeConfig(config: Partial<QRCodeConfig>): boolean {
  if (!config.errorCorrectionLevel || !['L', 'M', 'Q', 'H'].includes(config.errorCorrectionLevel)) {
    return false;
  }

  if (config.size && (config.size < 128 || config.size > 512)) {
    return false;
  }

  if (config.margin && (config.margin < 0 || config.margin > 8)) {
    return false;
  }

  return true;
}

/**
 * Get applied QR code settings from localStorage or return default
 * This function is meant to be used on the client side
 * @returns QR code configuration
 */
export function getAppliedQRCodeConfig(): QRCodeConfig {
  if (typeof window === 'undefined') {
    return defaultQRCodeConfig;
  }

  try {
    const storedSettings = localStorage.getItem('qrCodeSettings');
    if (storedSettings) {
      const parsedSettings = JSON.parse(storedSettings) as QRCodeConfig;
      // Validate the settings
      if (validateQRCodeConfig(parsedSettings)) {
        return { ...defaultQRCodeConfig, ...parsedSettings };
      }
    }
  } catch (error) {
    console.error('Error loading applied QR code settings:', error);
  }

  return defaultQRCodeConfig;
}
