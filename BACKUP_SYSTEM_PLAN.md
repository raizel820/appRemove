# Comprehensive Backup System Plan

## Overview

This document outlines the complete backup system implementation for AppSplitQR application.

## Requirements

1. **Selective Backup** - Users can select what data to include in the backup
2. **Backup History** - Store backup metadata in database for version tracking
3. **Download Backup** - Users can download any backup version
4. **Upload & Restore** - Users can upload a backup file to restore the app
5. **Settings Integration** - Backup section in settings page
6. **Date Range Filter** - Option to backup data from specific date range
7. **Report Cards** - Visual feedback showing success/failure of operations

---

## Data Models to Backup

### Core Models
- **Company** - Company information
- **CompanyProfile** - Multiple activity profiles
- **CompanyLogo** - Uploaded logos (files + metadata)
- **PDFConfiguration** - PDF settings
- **QRCodeSettings** - QR code configuration

### Business Data
- **Customer** - Customer records
- **MachineFamily** - Machine categories
- **MachineModel** - Machine models
- **SpecTemplate** - Specification templates
- **SpecDefinition** - Spec definitions
- **ModelSpec** - Model specifications

### Order Management
- **Order** - Main order records
- **OrderItem** - Order line items
- **DocumentSplit** - Document splits

### Number Management
- **OrderNumber** - Order numbers ledger
- **OrderNumbers** - Year-based order numbers
- **InvoiceNumbers** - Invoice numbers
- **ProformaNumbers** - Proforma numbers
- **PurchaseOrderNumbers** - PO numbers
- **DeliveryNumbers** - Delivery note numbers
- **SerialNumberCounter** - Serial number counters

### Audit & Search
- **AuditLog** - Audit trail
- **CustomerSearch** - Customer search index
- **OrderSearch** - Order search index
- **SerialSearch** - Serial search index

### File Management
- **File** - File records
- **FileSequence** - File sequences
- **FileRevision** - File revisions
- **VerificationToken** - Verification tokens

---

## Implementation Plan

### Phase 1: Database Schema

Create a `Backup` model to track backup history:

```prisma
model Backup {
  id          String   @id @default(cuid())
  filename    String   // Generated filename
  description String?  // User description
  fileSize    Int      // File size in bytes
  dataTypes   String   // JSON array of included data types
  dateFrom    DateTime? // Start date for filtered backup
  dateTo      DateTime? // End date for filtered backup
  status      String   @default("completed") // completed, failed, partial
  errorMessage String? // Error message if failed
  createdBy   String?  // User who created backup (future)
  createdAt   DateTime @default(now())
  
  @@index([createdAt])
  @@index([status])
}
```

### Phase 2: Backup Service

Create `src/server/services/backupService.ts`:

**Functions:**
1. `createBackup(options)` - Create backup with selected data types
2. `restoreBackup(backupData)` - Restore from backup data
3. `validateBackupFile(fileContent)` - Validate backup file structure
4. `getBackupHistory()` - Get all backup records
5. `deleteBackup(backupId)` - Delete backup file and record
6. `getBackupFile(backupId)` - Get backup file for download

**Backup File Structure:**
```json
{
  "version": "1.0",
  "appVersion": "AppSplitQR v1.0",
  "createdAt": "2025-01-15T10:30:00Z",
  "metadata": {
    "description": "Full backup",
    "dataTypes": ["company", "customers", "orders", ...],
    "dateRange": { "from": "2024-01-01", "to": "2025-01-15" }
  },
  "data": {
    "company": [...],
    "customers": [...],
    "orders": [...],
    ...
  },
  "checksum": "sha256-hash"
}
```

### Phase 3: API Routes

Create `/api/backup` routes:

1. **GET /api/backup** - Get backup history
2. **POST /api/backup** - Create new backup
3. **GET /api/backup/[id]** - Get backup details
4. **GET /api/backup/[id]/download** - Download backup file
5. **DELETE /api/backup/[id]** - Delete backup
6. **POST /api/backup/restore** - Restore from uploaded file
7. **POST /api/backup/validate** - Validate backup file before restore

### Phase 4: Frontend Component

Create `src/components/settings/BackupSettingsSection.tsx`:

**Features:**
1. **Backup Creation Card**
   - Description input
   - Data type selection (checkboxes)
   - Date range picker (optional)
   - "Select All" / "Deselect All" buttons
   - Create backup button

2. **Restore Card**
   - File upload dropzone
   - Validation preview
   - Restore confirmation dialog

3. **Backup History Table**
   - List of all backups
   - Download button per backup
   - Delete button per backup
   - Status indicator (success/failed/partial)

4. **Report Cards**
   - Success/failure toast notifications
   - Summary card showing operation results
   - Detailed error messages for failed operations

### Phase 5: Settings Page Integration

Update `src/app/settings/page.tsx`:
- Add "Backup" tab to TabsList
- Add BackupSettingsSection as TabsContent

### Phase 6: Translations

Add backup-related translations to `src/lib/translations.ts`

---

## Data Type Categories

For user-friendly selection, group data types:

1. **Company Settings**
   - Company Info
   - Activity Profiles
   - Logos
   - PDF Configuration
   - QR Code Settings

2. **Business Data**
   - Customers
   - Machine Families
   - Machine Models
   - Specification Templates

3. **Orders & Documents**
   - Orders
   - Order Items
   - Document Splits

4. **Number Management**
   - Order Numbers
   - Invoice Numbers
   - Proforma Numbers
   - Purchase Order Numbers
   - Delivery Numbers
   - Serial Number Counters

5. **Audit & Logs**
   - Audit Logs
   - Search Indexes

---

## Error Handling

1. **Backup Creation Errors**
   - Database read errors
   - File write errors
   - Insufficient disk space

2. **Restore Errors**
   - Invalid file format
   - Version mismatch
   - Data validation errors
   - Foreign key constraint errors

3. **User Feedback**
   - Clear error messages
   - Partial success handling
   - Rollback on critical failure

---

## Security Considerations

1. **File Storage**
   - Store backups in secure directory
   - Generate unique filenames
   - Clean up old backups (configurable retention)

2. **Restore Validation**
   - Validate file structure before restore
   - Check version compatibility
   - Verify checksum integrity

3. **Access Control** (Future)
   - User authentication required
   - Role-based permissions
   - Audit log for backup/restore operations

---

## Implementation Steps

1. Add Backup model to Prisma schema
2. Run db:push to create table
3. Create backup service
4. Create API routes
5. Create BackupSettingsSection component
6. Update settings page
7. Add translations
8. Test all functionality
9. Run lint check
10. Document in worklog

---

## Testing Checklist

- [ ] Create full backup (all data types)
- [ ] Create partial backup (selected data types)
- [ ] Create date-filtered backup
- [ ] Download backup file
- [ ] Upload and validate backup file
- [ ] Restore from backup
- [ ] Verify restored data
- [ ] Delete backup record and file
- [ ] Test error scenarios
- [ ] Test UI responsiveness
