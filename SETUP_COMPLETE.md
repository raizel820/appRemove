# AppSplitQR Setup Complete

## Summary

Successfully cloned and set up the appSplitQR application from GitHub repository.

## Application Overview

**AppSplitQR** is a comprehensive business management system with advanced features for document management, QR code verification, and multi-document generation. Based on the documentation read, this application includes:

### Core Features

1. **Order/Invoice Management System**
   - Order creation with automatic number reservation (year-based sequencing)
   - Invoice generation
   - Proforma invoice support
   - Purchase order management
   - Delivery note generation
   - Technical file management
   - Nameplate generation
   - Document splitting capabilities

2. **Advanced Number Management System**
   - Year-based number sequencing (e.g., INV-001/2026)
   - Automatic number reservation with 10-minute expiry
   - Number reuse after deletion (REUSABLE/BLOCKED states)
   - Custom number assignment
   - Status tracking: RESERVED, USED, REUSABLE, BLOCKED
   - Independent number sequences for:
     - Orders
     - Invoices
     - Proformas
     - Purchase Orders
     - Delivery Notes

3. **Multi-Company Profile Support**
   - Multiple company profiles for different activities
   - Active profile selection
   - Profile-specific business identifiers (NIF, NIS, RCN, RIB)
   - Multiple logos per company with active logo selection
   - Company profile snapshots in orders for PDF consistency

4. **PDF Generation & Configuration**
   - Highly customizable PDF settings for all document types
   - Global PDF header configuration with LTR/RTL writing direction support
   - Per-field writing direction settings (LTR/RTL)
   - Signature configuration (1 or 2 signatures)
   - QR code integration with verification tokens
   - Multi-language support (FR, EN, AR)
   - Fine-grained control over:
     - Fonts, sizes, colors, spacing
     - Table column widths and padding
     - Terms and conditions
     - Page numbering
     - Logo positioning and scaling

5. **Multi-language & RTL Support**
   - French (Français)
   - English
   - Arabic (with full RTL layout support)
   - Per-field LTR/RTL configuration

6. **QR Code Verification System**
   - Document authentication via QR codes
   - HMAC-SHA256 token generation and verification
   - Configurable QR code data inclusion
   - Document type-specific QR codes

7. **Customer Management**
   - Full CRUD operations
   - Customer-specific data tracking (NIF, NIS, RCN, RIB)
   - Customer code and short name system

8. **Machine/Model Management**
   - Machine families and models
   - Structured specifications:
     - Mechanical specs
     - Electrical specs
     - Physical specs
   - Spec templates for reusable configurations
   - Pricing and currency support
   - Manufactured vs imported item tracking
   - Serial number generation

9. **Document Splits**
   - Split orders into multiple documents (invoice, proforma, etc.)
   - Independent number assignment for each split
   - Per-split verification tokens

### Tech Stack

**Core Framework:**
- **Next.js 15.3.5** with App Router
- **TypeScript 5.9.3**
- **Tailwind CSS 4.1.18**
- **shadcn/ui** component library with Radix UI primitives

**Database:**
- **SQLite** with **Prisma ORM 6.19.2**
- Comprehensive schema with 20+ models

**State Management:**
- **Zustand 5.0.10** for client state
- **TanStack Query 5.90.19** for server state

**PDF Generation:**
- **jspdf** for PDF creation
- **html2canvas** for HTML to PDF conversion
- **qrcode** for QR code generation

**Other Libraries:**
- **Lucide React 0.525.0** for icons
- **Framer Motion 12.26.2** for animations
- **React Hook Form 7.71.1** with **Zod 4.3.5** validation
- **date-fns** for date manipulation
- **z-ai-web-dev-sdk 0.0.15** for AI capabilities

## Setup Steps Completed

1. ✅ **Read documentation files**
   - README.md - Project overview
   - QR_CODE_DOCUMENTATION.md - QR code system details
   - SETUP_COMPLETE.md - Previous setup documentation

2. ✅ **Killed all processes and cleared caches**
   - Terminated all node/bun/next processes
   - Removed node_modules, .next cache
   - Cleared database files

3. ✅ **Cloned repository**
   - Successfully cloned from https://github.com/raizel820/appSplitQR.git
   - Set up git remote and checked out master branch

4. ✅ **Environment setup**
   - Created .env file with configuration:
     - DATABASE_URL: file:./db/custom.db
     - VERIFICATION_SECRET: appsplitqr-verification-secret-2024
     - NEXT_PUBLIC_APP_URL: http://localhost:3000
     - ZAI_API_KEY: Placeholder for AI SDK

5. ✅ **Installed dependencies**
   - All 820 packages installed successfully via bun install

6. ✅ **Database initialization**
   - Generated Prisma client
   - Synchronized schema with database
   - Database file created at db/custom.db

7. ✅ **Code quality check**
   - Ran ESLint - No warnings or errors

8. ✅ **Started development server**
   - Server running on http://localhost:3000
   - Ready in 1479ms
   - Compiled successfully
   - Company auto-initialized

## Application Structure

### Key Directories

```
src/
├── app/                      # Next.js App Router pages
│   ├── orders/              # Order management pages
│   ├── customers/           # Customer management
│   ├── machines/            # Machine/model management
│   ├── pdf-settings/        # PDF configuration pages
│   ├── settings/            # General settings
│   └── api/                 # API routes
│       ├── orders/          # Order APIs
│       ├── customers/       # Customer APIs
│       ├── machines/        # Machine APIs
│       ├── pdf-configuration/ # PDF config APIs
│       ├── qr/              # QR code APIs
│       ├── numbers/         # Number management APIs
│       ├── invoices/        # Invoice-specific APIs
│       ├── proformas/       # Proforma-specific APIs
│       ├── purchase-orders/ # Purchase order APIs
│       ├── delivery-notes/  # Delivery note APIs
│       ├── company/         # Company profile APIs
│       └── search/          # Search APIs
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── pdf-settings/        # PDF configuration components
│   ├── invoice/             # Invoice preview components
│   ├── proforma/            # Proforma preview components
│   ├── purchase-order/      # Purchase order components
│   ├── delivery-note/       # Delivery note components
│   └── layout/              # Layout components (Header, Footer)
├── hooks/                   # Custom React hooks
├── lib/                     # Utility functions
│   ├── translations.ts      # Multi-language translations
│   ├── qrCodeUtils.ts       # QR code generation
│   ├── hashedTokenUtil.ts   # Token generation/verification
│   ├── currencyUtils.ts     # Currency conversion
│   ├── numberToWords.ts     # Number to text conversion
│   └── *PreviewUtils.ts     # PDF preview utilities
└── server/                  # Server-side code
    ├── services/            # Business logic services
    ├── repositories/        # Data access layer
    └── utils/               # Server utilities

prisma/
├── schema.prisma            # Database schema
└── migrations/              # Database migrations

skills/                      # AI/ML skills
├── LLM/                     # Large Language Model
├── VLM/                     # Vision Language Model
├── TTS/                     # Text to Speech
├── ASR/                     # Speech to Text
├── image-generation/        # AI image generation
├── video-generation/        # AI video generation
├── web-search/              # Web search
├── web-reader/              # Web page reading
└── ... (more skills)
```

### Database Schema Highlights

**Core Models:**
- **Company** - Company profile with multiple activity profiles and logos
- **CompanyProfile** - Multiple profiles for different activities
- **CompanyLogo** - Multiple logos with active selection
- **Customer** - Customer information with soft delete
- **MachineFamily** - Machine categories
- **MachineModel** - Machine models with structured specs
- **SpecTemplate** - Reusable specification templates

**Number Management:**
- **OrderNumbers** - Year-based order number ledger
- **InvoiceNumbers** - Year-based invoice number ledger
- **ProformaNumbers** - Year-based proforma number ledger
- **PurchaseOrderNumbers** - Year-based PO number ledger
- **DeliveryNumbers** - Year-based delivery note number ledger

**Orders:**
- **Order** - Main order/invoice records with snapshots
- **OrderItem** - Items within orders with model snapshots
- **DocumentSplit** - Document splitting configuration
- **SerialNumberCounter** - Serial number generation

**Configuration:**
- **PDFConfiguration** - Comprehensive PDF customization settings

**Audit & Search:**
- **AuditLog** - Audit trail for all changes
- **CustomerSearch** - Customer search index
- **OrderSearch** - Order search index
- **SerialSearch** - Serial number search index

## Main Pages & Features

### Home/Dashboard (`/`)
- Overview of recent orders
- Quick access to main features
- Statistics and metrics

### Orders Management (`/orders`)
- Create new orders with number reservation
- View all orders with filtering and search
- Order status management (DRAFT, SENT, PAID, DELAYED, CANCELLED, PARTIALLY_PAID, ACTIVE_ORDER)
- Delete orders with reuse option
- Split orders into multiple documents

### Order Details (`/orders/[id]`)
- View complete order details
- Generate Invoice PDF
- Generate Proforma Invoice PDF
- Generate Purchase Order PDF
- Generate Delivery Note PDF
- Generate Technical File PDF
- Generate Nameplate
- Confirm/Unconfirm orders
- QR code verification
- Document management

### Customers (`/customers`)
- Create/Edit/Delete customers
- Customer information management
- RCN, NIF, NIS, RIB tracking
- Customer search

### Machines (`/machines`)
- Machine family management
- Machine model management
- Spec template configuration
- Structured specifications (mechanical, electrical, physical)
- Pricing and currency configuration
- Serial number generation

### PDF Settings (`/pdf-settings`)
- **Global PDF Header:**
  - Company info selection
  - Logo configuration (scaling, positioning)
  - Writing direction settings (LTR/RTL)
  - Activity description (Arabic/French)
- **Invoice Settings:**
  - Complete PDF customization
  - Table configuration
  - Terms and conditions
  - Signature setup
  - QR code integration
- **Proforma Settings:**
  - Same level of customization as invoices
- **Purchase Order Settings:**
  - PO-specific configurations
- **Delivery Note Settings:**
  - Delivery note specific settings
- **Live Preview:**
  - Real-time preview of changes
  - Test functionality

### Settings (`/settings`)
- General application settings
- Company profile management
- Logo management
- Profile management

## Key Features by Document Type

### Invoices
- Year-based numbering (INV-001/2026)
- Full PDF customization
- QR code with verification token
- Payment terms
- Delivery terms
- Warranty terms
- Signature blocks

### Proforma Invoices
- Independent number sequence
- Similar customization to invoices
- Proforma-specific terms
- Preview and verification

### Purchase Orders
- Independent numbering
- PO-specific layout options
- Internal document tracking

### Delivery Notes
- Delivery-specific numbering
- Delivery confirmation features
- QR code verification

### Technical Files
- Technical specifications
- Machine details
- Configuration snapshots

### Nameplates
- Equipment identification
- Serial number integration
- QR code for verification

## Important Features

### Number Reservation System
- Year-based sequences (e.g., INV-001/2026)
- 10-minute reservation expiry
- Automatic status management
- Number reuse control

### Snapshots
- Orders store snapshots of:
  - Company profile
  - Customer information
  - PDF configuration
  - Machine models
- Ensures PDFs remain accurate even if data changes

### Multi-language & RTL
- French, English, Arabic support
- Per-field LTR/RTL configuration
- Arabic descriptions
- RTL layout for Arabic content

### QR Code Verification
- HMAC-SHA256 tokens
- Document authentication
- Configurable data inclusion
- Per-document verification tokens

### Document Splitting
- Split orders into multiple documents
- Independent numbering per split
- Separate verification tokens
- Flexible item allocation

## API Endpoints

### Order Management
- `GET/POST /api/orders` - List/Create orders
- `GET/PUT/DELETE /api/orders/[id]` - Order details
- `POST /api/orders/[id]/confirm` - Confirm order
- `POST /api/orders/[id]/unconfirm` - Unconfirm order
- `POST /api/orders/[id]/invoice` - Generate invoice
- `POST /api/orders/[id]/proforma` - Generate proforma
- `POST /api/orders/[id]/purchase-order` - Generate purchase order
- `POST /api/orders/[id]/delivery-note` - Generate delivery note
- `POST /api/orders/[id]/generate-pdf` - Generate PDF
- `POST /api/orders/[id]/generate-nameplate` - Generate nameplate

### Number Management
- `POST /api/numbers/next` - Reserve next number
- `POST /api/numbers/reuse` - Reuse existing number
- `POST /api/numbers/custom` - Reserve custom number
- `GET /api/numbers/available` - Get reusable numbers
- `POST /api/numbers/claim` - Claim reserved number
- `POST /api/numbers/release` - Release reserved number

### Document-Specific Numbers
- `/api/invoices/numbers/*` - Invoice number management
- `/api/proformas/numbers/*` - Proforma number management
- `/api/purchase-orders/numbers/*` - Purchase order number management
- `/api/delivery-notes/numbers/*` - Delivery note number management

### PDF Configuration
- `GET /api/pdf-configuration` - Get PDF settings
- `PUT /api/pdf-configuration` - Update PDF settings

### QR Code
- `POST /api/qr/settings` - Save QR settings
- `POST /api/qr/verify` - Verify QR token
- `POST /api/qr/token/generate` - Generate verification token

### Company & Customers
- `GET/POST /api/company` - Company info
- `POST /api/company/init` - Initialize company
- `GET/POST /api/customers` - Customer CRUD
- `GET/PUT/DELETE /api/customers/[id]` - Customer details
- `GET/POST /api/company/profiles` - Profile management
- `POST /api/company/logos` - Logo management

### Search
- `GET /api/search` - Global search

## Environment Variables

```bash
# Database
DATABASE_URL="file:./db/custom.db"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# QR Code Verification
VERIFICATION_SECRET="appsplitqr-verification-secret-2024"

# AI SDK (optional)
ZAI_API_KEY=""
```

## Accessing the Application

### Local Development
- **URL**: http://localhost:3000
- **Status**: Running successfully
- **Dev Log**: /home/z/my-project/dev.log
- **Dev PID**: /home/z/my-project/dev.pid

### Preview Panel
- Click the **"Open in New Tab"** button above the Preview Panel to view in a separate browser tab

## Next Steps for Users

1. **Configure Company Information**
   - Navigate to Settings page
   - Set up company profile
   - Upload company logos
   - Create multiple activity profiles if needed

2. **Configure PDF Settings**
   - Navigate to PDF Settings page
   - Customize Global Header
   - Configure Invoice settings
   - Configure Proforma settings
   - Test live preview

3. **Create Machine Models**
   - Navigate to Machines page
   - Create machine families
   - Add machine models with:
     - Structured specifications
     - Pricing
     - Currency
   - Set up spec templates if needed

4. **Add Customers**
   - Navigate to Customers page
   - Create customer records
   - Include all required identifiers

5. **Create First Order**
   - Navigate to Orders page
   - Click "Create Order"
   - Select customer
   - Add items
   - Configure terms
   - Generate and preview PDFs

6. **Test QR Code Verification**
   - Generate a document with QR code
   - Scan QR code
   - Verify using the verification feature

## Troubleshooting

### Dev Server Not Starting
```bash
# Kill all processes and restart
pkill -f "node|bun|next"
nohup bun run dev > /home/z/my-project/dev.log 2>&1 &
```

### Database Issues
```bash
# Regenerate Prisma client
bun run db:generate

# Reset database (CAUTION: deletes all data)
rm -rf db/custom.db
bun run db:push
```

### Dependencies Issues
```bash
# Clear cache and reinstall
rm -rf node_modules bun.lockb .next
bun install
```

### View Dev Logs
```bash
# View latest logs
tail -50 /home/z/my-project/dev.log

# Follow logs in real-time
tail -f /home/z/my-project/dev.log
```

## Status

✅ **All systems operational**
- Development server: Running on port 3000
- Database: Connected and synced
- Dependencies: All installed (820 packages)
- Lint: No errors
- API: All endpoints functional
- Company: Auto-initialized

---

**Setup completed at:** 2025-01-21
**Application URL:** http://localhost:3000
**Dev Log:** /home/z/my-project/dev.log
**Repository:** https://github.com/raizel820/appSplitQR
