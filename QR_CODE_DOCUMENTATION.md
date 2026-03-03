# QR Code Utility Documentation

## Overview

This document explains how to use the QR code utilities in the application for generating and verifying QR codes in PDF files (invoice, proforma invoice, purchase order, delivery note, technical file, nameplate).

## Files

### 1. `/home/z/my-project/src/lib/qrCodeUtils.ts`
Main QR code utility with functions to generate QR codes with configurable data.

### 2. `/home/z/my-project/src/lib/hashedTokenUtil.ts`
Utility for generating and verifying hashed tokens for document authentication.

### 3. `/home/z/my-project/src/components/settings/QRCodeSettingSection.tsx`
Settings UI for configuring QR code appearance and data options.

## Usage Examples

### Generating QR Code for Orders

#### From Order Page

```typescript
import { generateOrderQRCodeData, type QRCodeConfig } from '@/lib/qrCodeUtils';
import { generateQRCodeDataURL } from '@/lib/qrCodeUtils';

// Get QR code configuration from settings or use defaults
const qrConfig: QRCodeConfig = {
  includeCompanyName: true,
  includeCompanyEmail: true,
  includeCustomerName: true,
  includeFileNumber: true,
  includeFileType: true,
  includeTotalPrice: true,
  includeVerificationToken: true,
  // ... other config options
};

// Generate QR code data for an order
const orderData = {
  orderNumber: "INV-001",
  type: "Invoice",
  date: "2024-01-15",
  totalAmount: 1000.00,
  currency: "DZD",
  company: {
    name: "EURL LA SOURCE",
    email: "contact@lasource.dz",
    nif: "123456789012345",
  },
  customer: {
    name: "Customer Name",
    email: "customer@example.com",
  },
  items: [
    {
      name: "Product 1",
      quantity: 2,
      unitPrice: 500.00,
      totalPrice: 1000.00,
    },
  ],
  verificationSecret: process.env.VERIFICATION_SECRET,
};

// Generate QR code data string
const qrData = generateOrderQRCodeData(orderData, qrConfig);

// Generate QR code image URL for PDF
const qrCodeImageUrl = await generateQRCodeDataURL(orderData, qrConfig);
```

#### From PDF Generation Service

```typescript
import { generateQRCodeDataURL, type QRCodeConfig, type QRCodeData } from '@/lib/qrCodeUtils';

// Prepare data for QR code
const qrData: QRCodeData = {
  company: {
    name: company.name,
    phoneNumbers: company.phoneNumbers,
    emails: company.emails,
    nif: company.nif,
    nis: company.nis,
    rcn: company.rcn,
  },
  customer: {
    name: order.customerName,
    nif: order.customerNIF,
    nis: order.customerNIS,
    rcn: order.customerRCN,
    email: order.customerEmail,
  },
  file: {
    type: order.type,
    number: order.orderNumber,
    date: order.date,
    totalAmount: order.total,
    currency: order.currency,
  },
  items: order.items,
  terms: order.terms,
};

// Generate verification token
const verificationData = {
  fileNumber: order.orderNumber,
  fileType: order.type,
  date: order.date,
  totalAmount: order.total,
  companyName: company.name,
  customerName: order.customerName,
};
qrData.verificationToken = generateVerificationToken(verificationData);

// Generate QR code
const qrCodeImageUrl = await generateQRCodeDataURL(qrData, qrConfig);
```

### Using QR Code in PDF

When generating PDFs (using your PDF service):

```typescript
// In your PDF generation code
import { generateQRCodeDataURL } from '@/lib/qrCodeUtils';

async function addQRCodeToPDF(pdfDoc, orderData, qrConfig) {
  // Generate QR code image URL
  const qrCodeUrl = await generateQRCodeDataURL(orderData, qrConfig);

  // Fetch the QR code image
  const qrCodeResponse = await fetch(qrCodeUrl);
  const qrCodeBuffer = await qrCodeResponse.arrayBuffer();
  const qrCodeImage = await pdfDoc.embedPng(qrCodeBuffer);

  // Add QR code to PDF
  const page = pdfDoc.getPage(0);
  page.drawImage(qrCodeImage, {
    x: 480,
    y: 700,
    width: 100,
    height: 100,
  });

  return pdfDoc;
}
```

### Verifying QR Codes

The verification can be done through the UI or programmatically:

#### Programmatically

```typescript
import { verifyToken, decodeVerificationToken, type FileVerificationData } from '@/lib/hashedTokenUtil';

// Verify a token
const isValid = verifyToken(token, fileData);

// Decode and verify
const fileData = decodeVerificationToken(token);
if (fileData) {
  console.log('Valid document:', fileData);
}
```

## QR Code Configuration

The `QRCodeConfig` interface controls what data is included in the QR code:

```typescript
interface QRCodeConfig {
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
```

## Document Types Supported

The QR code system is designed to work with all document types:

1. **Invoice** - Commercial invoice
2. **Proforma Invoice** - Proforma invoice
3. **Purchase Order** - Purchase order documents
4. **Delivery Note** - Delivery confirmation
5. **Technical File** - Technical specifications
6. **Nameplate** - Equipment nameplate

Each document type should set the `type` field in the file info accordingly.

## Verification Token

The verification token is generated using HMAC-SHA256 with the following data:

- File number
- File type
- Date
- Total amount
- Company name
- Customer name

### Secret Key

The secret key should be stored in environment variables:

```bash
# .env
VERIFICATION_SECRET=your-secret-key-here
NEXT_PUBLIC_APP_URL=https://your-app.com
```

## API Endpoints

### Save QR Code Settings

```typescript
POST /api/qr/settings
Content-Type: application/json

{
  "includeCompanyName": true,
  "includeCompanyEmail": true,
  ...
}
```

### Verify QR Code Token

```typescript
POST /api/qr/verify
Content-Type: application/json

{
  "token": "abc123..."
}
```

Response (valid):
```json
{
  "valid": true,
  "data": {
    "fileNumber": "INV-001",
    "fileType": "Invoice",
    "date": "2024-01-15",
    "totalAmount": 1000.00,
    "companyName": "EURL LA SOURCE",
    "customerName": "Customer Name"
  }
}
```

Response (invalid):
```json
{
  "valid": false
}
```

## Best Practices

1. **Error Correction Level**: Use higher levels (Q or H) for QR codes that will be printed on products or materials.

2. **Size**: Larger QR codes (256-512px) are better for print materials.

3. **Data Density**: Don't include too much data - it makes the QR code harder to scan.

4. **Verification**: Always include verification tokens for important documents.

5. **Colors**: Ensure good contrast between foreground and background colors.

6. **Testing**: Test QR codes with different scanning apps before production use.

## Default Configuration

```typescript
const defaultQRCodeConfig: QRCodeConfig = {
  includeCompanyName: true,
  includeCompanyPhone: false,
  includeCompanyFax: false,
  includeCompanyEmail: true,
  includeCompanyNIF: true,
  includeCompanyNIS: false,
  includeCompanyRCN: false,
  includeCustomerName: true,
  includeCustomerNIF: false,
  includeCustomerNIS: false,
  includeCustomerRCN: false,
  includeCustomerEmail: true,
  includeFileType: true,
  includeFileNumber: true,
  includeFileDate: true,
  includeFileLocation: false,
  includeTotalPrice: true,
  includeItems: false,
  includeTerms: false,
  includeVerificationToken: true,
  errorCorrectionLevel: 'M',
  size: 256,
  margin: 4,
  foregroundColor: '#000000',
  backgroundColor: '#FFFFFF',
};
```

## Troubleshooting

### QR Code Not Scannable

1. Increase error correction level to Q or H
2. Reduce the amount of data in the QR code
3. Ensure good contrast between colors
4. Increase QR code size

### Token Verification Failing

1. Check that the secret key matches between generation and verification
2. Ensure all data fields are included in the same order
3. Verify that the token hasn't been modified

### QR Code Too Large

1. Disable unnecessary options (items, terms, etc.)
2. Use compact QR code data format
3. Reduce file size limits
