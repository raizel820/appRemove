# Proforma Invoice Logic - Complete Documentation

## Overview
This document provides a comprehensive understanding of the proforma invoice logic from settings to implementation in the order details page and all related APIs and utilities.

---

## 1. Proforma Settings (UI Configuration)

### Location: `src/app/pdf-settings/page.tsx` & `src/components/pdf-settings/ProformaSettingsSection.tsx`

### Purpose
Provides a user interface for configuring all proforma invoice-specific PDF settings.

### Key Configuration Categories

#### A. Top Body Part Settings
- **Writing Direction**: LTR (Left to Right) or RTL (Right to Left)
- **Title Settings**:
  - Position: left, center, or right
  - Font Family: HELVETICA, TIMES_ROMAN, COURIER, ARIAL
  - Font Size, Color, Line Spacing, Letter Spacing
  - Bold and Underline options
- **Customer Info Settings**:
  - Position: left, center, or right
  - Label settings (font, size, color, spacing, bold, underline)
  - Value settings (font, size, color, spacing, bold, underline)
- **Date Settings**:
  - Position, font, size, color, spacing, bold, underline

#### B. Table Settings
- **Text Alignment**: left, center, or right
- **Direction**: LTR or RTL
- **Label Settings**: font, size, color, spacing, bold, underline
- **Value Settings**: font, size, color, spacing, bold, underline
- **Empty Rows**: Number of empty rows to add at bottom
- **Max Heights**:
  - Single page table max height
  - First page table max height
  - Last page table max height
  - Other pages table max height

#### C. Column-Specific Settings
For each column (Number, Family, Model, Brand, Quantity, Price Unit, Price Total):
- Width (mm)
- Padding (mm)

#### D. Footer Terms Settings
- Position: left, center, or right
- Font settings
- Individual Terms:
  - Delivery terms (fixed/range, time, unit)
  - Validity terms (fixed/range, time, unit)
  - Warranty terms (fixed/range, time, unit)
  - Confirmation condition (after_order_confirmation/after_payment)
  - Payment method (online/website/check/cash/split_payment)
  - Price in words

#### E. Signature Settings
- Signature count: 1 or 2
- Position: right, left, or middle
- Left/Right signature labels
- Signature line width
- Individual signature controls (include/exclude, offset X/Y)

#### F. Margin Settings
- Page border margin
- Header section margin
- Facture number margin
- Client info margin
- Date margin
- Item table margin
- Summary table margin
- Terms section margin
- Signature section margin
- Page number margin

#### G. Page Number Settings
- Font family, size, color
- Position (left, center, right)
- Offset X, Offset Y

#### H. QR Code Settings
- Include QR code (boolean)
- Size, Offset X, Offset Y

#### I. Currency and Language
- Proforma currency
- Proforma language (FR, EN, AR)

---

## 2. Proforma Preview Utilities

### Location: `src/lib/proformaPreviewUtils.ts`

### Key Functions

#### A. Helper Functions
```typescript
getTodayDate(): string  // Returns formatted date DD/MM/YYYY
getCurrentYear(): number  // Returns current year
getProformaNumber(): string  // Returns proforma number (for preview)
arrayBufferToBase64(buffer: ArrayBuffer): string  // Converts array buffer to base64
```

#### B. Text Measurement & Pagination
```typescript
measureTextHeight(text, fontFamily, fontSize, maxWidthPx): {width, height, lines}
measureRowHeight(rowData, isEmptyRow): RowMeasurement
```

**Pagination Logic**:
1. **`getPaginationSettings(config)`**: Returns pagination settings from config
2. **`validatePaginationSettings(settings, items)`**: Validates pagination settings
3. **`paginateItems(items, settings)`**: Paginates items across pages
   - Determines if single page or multi-page
   - Handles different page types:
     - `single`: Everything fits on one page
     - `multi-first`: First page with header and customer info
     - `multi-non-last`: Middle pages without header/footer
     - `multi-last`: Last page with summary, terms, signatures
4. **`calculateTableTotalHeight(config, machineModels)`**: Calculates total table height

#### C. QR Code Generation
```typescript
getQrCodeDataUrls(config, company, customers, machineModels, testVerificationToken, qrCodeSettings, proformaNumber?, proformaYear?): Promise<{qrUrl, placeholderQrUrl}>
```

**Process**:
1. Creates CompanyInfo, CustomerInfo, FileInfo, ItemData
2. Formats proforma number: `PRO-XXX/YYYY`
3. Generates QR code data
4. Returns QR code URLs using `generateQRCodeDataURL`

#### D. HTML Generation
```typescript
generatePreviewHTML(params): string
```

**Input Parameters**:
- `config`: PDFConfiguration
- `company`: Company data
- `customers`: Customer array
- `machineModels`: Machine model array
- `selectedLanguage`: FR, EN, or AR
- `selectedCurrency`: Currency code
- `exchangeRates`: Exchange rate array
- `logoBase64`: Logo image in base64
- `qrCodeImageUrl`: QR code image URL
- `proformaTranslations`: Translation object
- `labelsFr`: French labels
- `labelsAr`: Arabic labels
- `proformaNumber`: Proforma sequence number
- `proformaYear`: Proforma year

**Generated Sections**:
1. **Header HTML**:
   - Company name
   - Activity descriptions (Arabic and French/English)
   - Company info (telephone, fax, address, email, RCN, NIF, NIS, RIB, bank name, capital social)
   - Logo

2. **Top Body HTML**:
   - Proforma title with number and year
   - Customer section (name, address, phone, email, RCN, NIF, NIS, RIB)
   - Date section

3. **Items Table HTML**:
   - Table headers (Number, Family, Model, Brand, Quantity, Price Unit, Price Total)
   - Table rows with real items and empty rows
   - Currency conversion using `convertPrice`

4. **Totals HTML**:
   - Total HT (excl. tax)
   - TVA 19%
   - Total TTC (incl. tax)

5. **Footer HTML**:
   - Terms section (delivery, validity, warranty, confirmation, payment, price in words)
   - Signature lines (left and/or right)

6. **QR Code HTML**:
   - Positioned absolutely
   - Size and offset based on config

7. **Page Number HTML**:
   - Shows "X / Y" format
   - Positioned based on config

**CSS Styling**:
- Complete A4 page styling
- Print media queries
- Font family, size, color based on config
- Responsive column widths
- Margin and spacing based on config

#### E. PDF Generation
```typescript
generatePDFFromHTML(previewHTML, fileName): Promise<void>
```

**Process**:
1. Creates a hidden container with HTML
2. Waits for images to load
3. Uses `html2canvas` to capture each page
4. Uses `jspdf` to create PDF
5. Saves the PDF file

---

## 3. Proforma Preview Dialog Component

### Location: `src/components/proforma/ProformaPreviewDialog.tsx`

### Purpose
Displays a preview of the proforma invoice with optional settings sidebar for real-time adjustments.

### Key Features

#### A. Props
- `open`: Dialog open state
- `onOpenChange`: Dialog state change handler
- `previewData`: ProformaPreviewData object
- `config`: PDFConfiguration for editing
- `onConfigChange`: Config change handler
- `showSettingsSidebar`: Whether to show settings sidebar

#### B. State Management
- Preview zoom (50-200%)
- Preview width (210-350mm)
- Calculated table height
- Save loading state
- Dialog background color

#### C. Preview Data Preparation
```typescript
prepareProformaPreviewData(order, proformaInfo): Promise<ProformaPreviewData | null>
```

**Process**:
1. **Load Company & Config**:
   - Try to use snapshot data first (order.snapshotCompany, order.snapshotPdfConfig)
   - Fall back to fetching from API if snapshots not available
   - Always fetch exchange rates

2. **Prepare Customer Data**:
   - Try snapshotCustomer first
   - Fall back to customer relation
   - Finally use order customer fields as fallback

3. **Prepare Machine Models**:
   - Try snapshotModel for each item
   - Fall back to model relation
   - Create from item data if neither available

4. **Load Logo**:
   - Fetch active logo as base64

5. **Generate QR Code** (if verification token exists and QR code enabled):
   - Fetch QR code settings
   - Call `getQrCodeDataUrls` to generate QR code

6. **Return ProformaPreviewData**:
   - config, company, customer, machineModels
   - selectedLanguage, selectedCurrency, exchangeRates
   - logoBase64, qrCodeImageUrl
   - proformaNumber, proformaYear
   - Snapshots and verification token

#### D. Settings Sidebar (when enabled)
- **Column Settings**: Width and padding for all 7 columns
- **Line Spacing Settings**:
  - Items table (labels and values)
  - Customer section (labels and values)
- **Table Height Settings**:
  - Live table height display
  - Empty rows count
  - Single page max height
  - Last page max height
  - Other pages max height
  - First page max height
- **Save Button**: Persists changes to database

#### E. Preview Controls
- Zoom in/out buttons
- Width increase/decrease buttons
- Reset button
- Print button (calls `printHTMLWithIframe`)

#### F. Translation Support
Default translations for FR, EN, AR:
- Labels (telephone, fax, address, email, RCN, NIF, NIS, RIB, bank name, capital social)
- Proforma-specific (number, client, table headers, totals, terms, signature)

---

## 4. Order Details Page Implementation

### Location: `src/app/orders/[id]/page.tsx`

### Proforma-Related State

#### A. Proforma Section State
```typescript
proformaOpen: boolean  // Collapsible section open state
proformaDate: string  // Proforma date (default: today)
reservedProforma: {seq, year, reservationId, expiresAt, fullNumber} | null
reservingProforma: boolean  // Loading state for reservation
creatingProforma: boolean  // Loading state for creation
proforma: InvoiceInfo | null  // Created proforma info
```

#### B. Proforma Number Options
```typescript
proformaNumberOption: 'next' | 'reuse'  // New number or reuse existing
reusableProformaNumbers: Array<{seq, year, deletedAt, notes}>  // Available for reuse
fetchingReusableProformas: boolean  // Loading state for fetch
selectedReusableProforma: number | null  // Selected reusable number
```

#### C. Proforma Preview State
```typescript
isProformaPreviewOpen: boolean  // Preview dialog open state
proformaPreviewData: ProformaPreviewData | null  // Preview data
loadingProformaPreview: boolean  // Preview loading state
hasProformaVerificationToken: boolean  // Whether token exists
```

### Key Functions

#### A. Data Fetching
```typescript
fetchProformaInfo(): void
```
- Calls `/api/orders/[id]/proforma`
- Sets proforma state if exists

#### B. Number Reservation
```typescript
handleReserveProformaNumber(): Promise<void>
```
- Calls `/api/proformas/numbers/next` POST
- Stores reservation with expiry (10 minutes)
- Shows success/error toast

#### C. Proforma Creation
```typescript
handleCreateProforma(): Promise<void>
```
- Validates reservation exists and not expired
- Calls `/api/orders/[id]/proforma` POST with:
  - proformaDate
  - reservedYear
  - reservedSeq
  - reservationId
- Updates proforma state and order
- Clears reservation
- Shows success/error toast

#### D. Number Reuse
```typescript
fetchReusableProformaNumbers(): Promise<void>
```
- Calls `/api/proformas/numbers/available?year=YYYY`
- Populates reusable numbers list

```typescript
handleReserveReusableProformaNumber(seq, year): Promise<void>
```
- Calls `/api/proformas/numbers/reuse` POST
- Stores reservation

```typescript
handleProformaNumberOptionChange(option: 'next' | 'reuse'): Promise<void>
```
- Switches between next and reuse modes
- Fetches reusable numbers if reuse mode

#### E. Verification Token
```typescript
handleGenerateProformaVerificationToken(): Promise<void>
```
- Calls `/api/proformas/verification-token` POST with:
  - orderId
  - qrJsonData (proformaNumber, orderNumber, customerName, total, currency)
- Sets hasProformaVerificationToken
- Refreshes order to get token

#### F. Preview Generation
```typescript
handleGenerateProformaPreview(): Promise<void>
```
- Validates order and proforma exist
- Loads PDF config if not loaded
- Extracts proforma sequence and year
- Calls `prepareProformaPreviewData` with order and proforma info
- Overrides empty rows to 0 for order details preview
- Opens preview dialog

---

## 5. API Routes

### A. Proforma Info API
**Route**: `GET/POST /api/orders/[id]/proforma`

**GET Response**:
```json
{
  "order": {
    "id": "string",
    "fullNumber": "string",
    "status": "string"
  },
  "proforma": {
    "number": number | null,
    "year": number | null,
    "sequence": number | null,
    "fullNumber": string | null,
    "date": string | null,
    "status": string | null
  } | null
}
```

**POST Request**:
```json
{
  "proformaDate": "string (ISO date)",
  "reservedYear": number (optional),
  "reservedSeq": number (optional),
  "reservationId": "string (optional)"
}
```

**POST Response**:
```json
{
  "success": true,
  "proforma": {
    "year": number,
    "sequence": number,
    "fullNumber": "PRO-XXX/YYYY",
    "date": "ISO date",
    "status": "ISSUED"
  },
  "order": {
    "id": "string",
    "fullNumber": "string"
  }
}
```

**Logic**:
1. Validates order exists
2. Checks proforma doesn't already exist for this order
3. Uses ProformaNumberingService to finalize reservation or auto-reserve
4. Updates order with proforma info (year, sequence, fullNumber, date, status)
5. Creates audit log
6. Returns success response

### B. Proforma Number Reservation API
**Route**: `POST/GET /api/proformas/numbers/next`

**POST Request**:
```json
{
  "year": number (optional, defaults to current year),
  "reservedBy": "string (required, identifier)"
}
```

**POST Response**:
```json
{
  "seq": number,
  "year": number,
  "reservationId": "string",
  "expiresAt": "ISO date (10 minutes from now)",
  "fullNumber": "PRO-XXX/YYYY"
}
```

**GET Response** (without reserving):
```json
{
  "seq": number,
  "year": number,
  "fullNumber": "PRO-XXX/YYYY"
}
```

### C. Proforma Verification Token API
**Route**: `POST /api/proformas/verification-token`

**Request**:
```json
{
  "orderId": "string",
  "qrJsonData": {
    "proformaNumber": "string",
    "orderNumber": "string",
    "customerName": "string",
    "total": number,
    "currency": "string"
  }
}
```

**Response**:
```json
{
  "token": "hex string (HMAC-SHA256)",
  "qrJsonData": { ... }
}
```

**Logic**:
1. Validates order exists
2. Creates HMAC-SHA256 token using VERIFICATION_SECRET
3. Updates order with proformaVerificationToken
4. Returns token

### D. Proforma Number Reuse API
**Route**: `POST /api/proformas/numbers/reuse`

**Request**:
```json
{
  "year": number,
  "seq": number,
  "reservedBy": "string"
}
```

**Response**: Same as `/api/proformas/numbers/next`

**Logic**:
1. Finds ProformaNumbers entry with REUSABLE state
2. Updates to RESERVED state
3. Returns reservation details

### E. Reusable Numbers API
**Route**: `GET /api/proformas/numbers/available?year=YYYY`

**Response**:
```json
{
  "numbers": [
    {
      "seq": number,
      "year": number,
      "deletedAt": "ISO date | null",
      "notes": "string | null"
    }
  ]
}
```

---

## 6. Proforma Numbering Service

### Location: `src/server/services/proformaNumberingService.ts`

### Purpose
Manages proforma number generation, reservation, finalization, and lifecycle.

### Key Methods

#### A. Reserve Next Number
```typescript
async reserveNextForYear(year: number, reservedBy: string): Promise<ReserveProformaResult>
```
1. Finds highest seq for the year
2. Creates ProformaNumbers entry with:
   - year, seq (next sequence)
   - state: 'RESERVED'
   - reservedBy: full reservation ID
   - reservedAt: current timestamp
3. Returns reservation details (expires in 10 minutes)

#### B. Finalize Reservation
```typescript
async finalizeReservation(year: number, seq: number, reservationId: string, orderId?: string): Promise<void>
```
1. Finds reservation by year, seq, and state='RESERVED'
2. Validates ownership (reservedBy matches)
3. Checks not expired (within 10 minutes)
4. Updates to state='USED'
5. Clears reservedBy and reservedAt
6. Associates with orderId

#### C. Reuse Number
```typescript
async reserveSpecificForYear(year: number, seq: number, reservedBy: string): Promise<ReserveProformaResult>
```
1. Updates ProformaNumbers entry with state='REUSABLE'
2. Sets state to 'RESERVED'
3. Creates new reservationId and expiry
4. Returns reservation details

#### D. Get Reusable Numbers
```typescript
async getReusableNumbers(year: number): Promise<Array<{seq, year, reservedAt}>>
```
- Returns all ProformaNumbers entries with state='REUSABLE'

#### E. Block Number
```typescript
async blockNumber(seq: number, year: number): Promise<void>
```
- Sets state to 'BLOCKED' (used and cannot be reused)

#### F. Mark Number Reusable
```typescript
async markNumberReusable(seq: number, year: number): Promise<void>
```
- Sets state to 'REUSABLE' (used but can be reused)

### Number States
- **RESERVED**: Number is reserved for 10 minutes, waiting for finalization
- **USED**: Number is finalized and associated with an order
- **REUSABLE**: Number was used but can be reused (for deleted orders)
- **BLOCKED**: Number was used and cannot be reused

---

## 7. Data Flow Summary

### Creating a Proforma Invoice

#### Step 1: Configure Settings (PDF Settings Page)
1. User navigates to `/pdf-settings` → Proforma tab
2. Configures all proforma settings (fonts, colors, margins, columns, terms, etc.)
3. Clicks "Preview" to see live preview
4. Clicks "Save" to persist to PDFConfiguration table

#### Step 2: Open Order Details
1. User navigates to `/orders/[id]`
2. Order loads with customer and items data
3. Proforma section shows if proforma exists

#### Step 3: Reserve Proforma Number
1. User selects proforma date
2. Chooses "Next" or "Reuse" option
3. If "Reuse", selects a reusable number
4. Clicks "Reserve Number" button
5. System calls `/api/proformas/numbers/next` or `/api/proformas/numbers/reuse`
6. Stores reservation (seq, year, reservationId, expiresAt)

#### Step 4: Create Proforma
1. User clicks "Create Proforma" button
2. System validates reservation exists and not expired
3. Calls `/api/orders/[id]/proforma` POST with reservation details
4. ProformaNumberingService finalizes reservation
5. Order updated with:
   - proformaYear
   - proformaSequence
   - proformaFullNumber (PRO-XXX/YYYY)
   - proformaDate
   - proformaStatus = 'ISSUED'
6. Audit log created

#### Step 5: Generate Verification Token (Optional)
1. User clicks "Generate Verification Token"
2. System calls `/api/proformas/verification-token`
3. HMAC-SHA256 token generated and stored
4. Can be used for QR code verification

#### Step 6: Preview Proforma
1. User clicks "Preview" button
2. System calls `prepareProformaPreviewData`
3. Fetches:
   - Company (from snapshot or API)
   - Config (from snapshot or API)
   - Customer (from snapshot, relation, or order fields)
   - Machine models (from snapshots, relations, or items)
   - Exchange rates
   - Logo (as base64)
   - QR code (if token exists)
4. Generates HTML using `generatePreviewHTML`
5. Opens ProformaPreviewDialog

#### Step 7: Print/Export PDF
1. User adjusts settings in preview sidebar (optional)
2. Clicks "Print" button
3. System calls `generatePDFFromHTML`
4. Uses html2canvas and jspdf to create PDF
5. Downloads PDF file

### Reusing a Proforma Number

1. User selects "Reuse" option in order details
2. System fetches reusable numbers via `/api/proformas/numbers/available`
3. User selects a number and clicks "Reserve"
4. System reserves the number for reuse
5. Proceeds with normal creation flow

### Deleting an Order with Proforma

**Without Reuse Permission**:
1. Proforma number marked as BLOCKED
2. Number cannot be reused in the future

**With Reuse Permission**:
1. Proforma number marked as REUSABLE
2. Number appears in available list for reuse

---

## 8. Key Utilities and Helpers

### Currency Utilities (`src/lib/currencyUtils.ts`)
```typescript
convertPrice(amount, fromCurrency, toCurrency, exchangeRates): number
formatPrice(amount, currency): string
getCurrencySymbol(currency): string
```

### Number to Words (`src/lib/numberToWords.ts`)
```typescript
numberToWords(number, language): string
currencyToWords(amount, currency, language): string
formatTimePeriod(from, to, unit, language): string
```

### Print Utils (`src/lib/printUtils.ts`)
```typescript
printHTMLWithIframe(html): Promise<void>
printIframeContent(iframe, isLoaded): boolean
```

### QR Code Utils (`src/lib/qrCodeUtils.ts`)
```typescript
generateQRCodeData(company, customer, file, items, terms, verificationToken): QRCodeData
generateQRCodeDataURL(qrCodeData, config): Promise<string>
```

---

## 9. Database Schema

### ProformaNumbers Table
```prisma
model ProformaNumbers {
  id          String   @id @default(cuid())
  year        Int
  seq         Int
  state       String   // RESERVED, USED, REUSABLE, BLOCKED
  reservedBy  String?
  reservedAt  DateTime?
  orderId     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  order       Order?   @relation(fields: [orderId], references: [id])

  @@unique([year, seq])
}
```

### Order Table (Proforma-related fields)
```prisma
model Order {
  // ... other fields
  
  proformaNumber         Int?
  proformaYear           Int?
  proformaSequence       Int?
  proformaFullNumber     String?
  proformaDate           DateTime?
  proformaStatus         String?
  proformaVerificationToken String?
  
  snapshotCompany        String?  // JSON string
  snapshotCustomer       String?  // JSON string
  snapshotPdfConfig      String?  // JSON string
  
  proformaNumbers        ProformaNumbers?
}
```

### OrderItem Table (Model snapshot)
```prisma
model OrderItem {
  // ... other fields
  
  snapshotModel          String?  // JSON string of model data
  
  model                  MachineModel? @relation(...)
}
```

---

## 10. Translation System

### Supported Languages
- **FR**: French (Français)
- **EN**: English
- **AR**: Arabic (العربية)

### Translation Keys
- Proforma number label
- Client information
- Table headers (Number, Family, Model, Brand, Quantity, Price Unit, Price Total)
- Totals (Total HT, TVA 19%, Total TTC)
- Terms title and all term types
- Payment methods
- Signature labels (Manager, Client)

### Implementation
- Default translations in `ProformaPreviewDialog.tsx`
- Used during HTML generation in `generatePreviewHTML`
- Language controlled by `selectedLanguage` parameter
- Direction (LTR/RTL) set based on language

---

## 11. Pagination Logic Details

### Single Page Mode
**Trigger**: Total table height ≤ singlePageTableMaxHeight

**Characteristics**:
- Everything on one page
- Header, customer info, items, totals, terms, signatures all on same page
- No page breaks needed

### Multi-Page Mode
**Trigger**: Total table height > singlePageTableMaxHeight

**Page Types**:

1. **First Page (multi-first)**:
   - Contains header (company info)
   - Contains customer info
   - Contains items table
   - No totals, terms, or signatures

2. **Middle Pages (multi-non-last)**:
   - Contains only items table
   - No header, no footer elements

3. **Last Page (multi-last)**:
   - Contains items table (remaining items)
   - Contains totals (Total HT, TVA, Total TTC)
   - Contains terms
   - Contains signatures
   - Contains QR code
   - Contains page number

### Pagination Algorithm
1. Measure all items (real + empty rows)
2. Calculate total height
3. If fits in single page → use single page mode
4. Otherwise:
   - Reserve last item for last page
   - Distribute remaining items across first and middle pages
   - Ensure last page has room for totals and terms
   - Create page descriptors with proper page types

---

## 12. Error Handling

### Common Errors

1. **Reservation Expired**:
   - Error: "Proforma reservation has expired"
   - Solution: Reserve a new number

2. **Proforma Already Exists**:
   - Error: "Proforma already exists for this order"
   - Solution: One proforma per order only

3. **Number Not Available**:
   - Error: "Proforma number is not available for reuse"
   - Solution: Select a different number or use next

4. **Validation Errors**:
   - Missing required fields
   - Invalid data types
   - Out of range values

5. **Pagination Errors**:
   - Table height exceeds A4 height
   - Page heights too small
   - Shows error in preview instead of HTML

---

## 13. Best Practices

1. **Always reserve before creating**: Don't skip reservation step
2. **Handle expired reservations**: Check expiry before finalizing
3. **Use snapshots**: Store company, customer, model snapshots for historical accuracy
4. **Test with various item counts**: Ensure pagination works for 1 item and 100+ items
5. **Validate settings**: Ensure margins and heights are reasonable
6. **Handle missing data**: Provide fallbacks for missing customer/model data
7. **Generate verification tokens**: Enable QR code verification for authenticity
8. **Consider language direction**: RTL support for Arabic
9. **Test print output**: Verify PDF generation matches preview
10. **Audit all actions**: Log proforma creation for compliance

---

## 14. Future Enhancements

1. **Email proforma directly** from preview dialog
2. **Bulk proforma generation** for multiple orders
3. **Proforma templates** for different customer types
4. **Digital signatures** integration
5. **Automatic reminder emails** before proforma expiry
6. **Proforma analytics** (conversion rate, time to confirm)
7. **Multi-currency support** in QR codes
8. **Custom terms presets**
9. **Proforma revision history**
10. **Export to Excel/Word** formats

---

## Conclusion

This comprehensive proforma invoice system provides:
- ✅ Flexible, customizable PDF generation
- ✅ Multi-language support (FR, EN, AR)
- ✅ Proper number management (reserve, finalize, reuse)
- ✅ Pagination for variable item counts
- ✅ QR code verification
- ✅ Historical data snapshots
- ✅ Complete audit trail
- ✅ Real-time preview with adjustments
- ✅ Print and PDF export capabilities

The system is production-ready and follows best practices for enterprise document generation.
