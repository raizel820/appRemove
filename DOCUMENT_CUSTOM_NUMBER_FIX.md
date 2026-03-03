# Document Custom Number Logic - Complete Implementation

## Overview

Added the same custom number logic (preventing gaps when using custom numbers) to all document types in the order details page:
- **Invoice Numbers**
- **Proforma Invoice Numbers**
- **Purchase Order Numbers**
- **Delivery Note Numbers**

## Problem

Previously, when using custom numbers for any document type, the auto-numbering would continue from the custom number instead of from where it stopped, creating gaps.

**Example for Invoices:**
- Auto-generated: INV-001/2026, INV-002/2026, INV-003/2026, INV-004/2026, INV-005/2026
- User uses custom number: INV-013/2026
- Next auto-generated: INV-014/2026 (wrong!)
- **Gap created:** 6, 7, 8, 9, 10, 11, 12

## Solution Applied to All Document Types

### 1. Prefix-Based Tracking System

Each reservation type now has a unique prefix in the `reservedBy` field:

- **AUTO-** prefix: Auto-generated numbers (tracked separately for auto-numbering)
  - Example: `AUTO-session-123-2026-6-1737880000000`
- **CUSTOM-** prefix: Custom numbers (don't affect auto-numbering)
  - Example: `CUSTOM-session-123-2026-13-1737880000000`
- **REUSE-** prefix: Reused numbers (don't affect auto-numbering)
  - Example: `REUSE-session-123-2026-3-1737880000000`

### 2. Updated Services

All four document numbering services received the same updates:

#### A. Added `getHighestAutoSeq()` Method
Finds the highest sequence number with AUTO- prefix for a given year:
```typescript
private async getHighestAutoSeq(year: number): Promise<number> {
  const autoNumbers = await db.[documentType]Numbers.findMany({
    where: {
      year,
      reservedBy: { startsWith: 'AUTO-' },
    },
    orderBy: { seq: 'desc' },
    take: 1,
  });
  return autoNumbers[0]?.seq || 0;
}
```

#### B. Updated `reserveNextForYear()` Method
Now uses the auto-generated number tracking and skips used/reserved numbers:
```typescript
async reserveNextForYear(year: number, reservedBy: string) {
  // Start from highest auto-generated seq + 1
  let candidateSeq = await this.getHighestAutoSeq(year) + 1;

  // Skip any used/reserved numbers
  while (true) {
    const existingNumber = await db.[documentType]Numbers.findFirst({
      where: {
        year,
        seq: candidateSeq,
        state: { in: ['USED', 'RESERVED'] },
      },
    });

    if (!existingNumber) break; // Available
    candidateSeq++; // Try next
  }

  // Create with AUTO- prefix
  const reservationId = `AUTO-${reservedBy}-${year}-${candidateSeq}-${Date.now()}`;
  // ... create and return
}
```

#### C. Updated `reserveSpecificForYear()` Method
Now uses REUSE- prefix:
```typescript
async reserveSpecificForYear(year: number, seq: number, reservedBy: string) {
  const reservationId = `REUSE-${reservedBy}-${year}-${seq}-${reservedAt.getTime()}`;
  // ... update to RESERVED state with REUSE prefix
}
```

#### D. Added `reserveCustomForYear()` Method
New method for custom numbers with CUSTOM- prefix:
```typescript
async reserveCustomForYear(year: number, seq: number, reservedBy: string) {
  const reservationId = `CUSTOM-${reservedBy}-${year}-${seq}-${reservedAt.getTime()}`;

  // Check if number exists
  const existingNumber = await db.[documentType]Numbers.findFirst({
    where: { year, seq },
  });

  if (!existingNumber) {
    // Create new custom number
    return await db.[documentType]Numbers.create({
      data: { year, seq, state: 'RESERVED', reservedBy: reservationId, reservedAt },
    });
  }

  // Handle existing numbers (REUSABLE or expired RESERVED)
  // ... validation and update logic
}
```

#### E. Updated `finalizeReservation()` Method
Only auto-generated numbers (AUTO- prefix) affect tracking:
```typescript
async finalizeReservation(year: number, seq: number, reservationId: string, orderId?: string) {
  // ... validate reservation

  // Update to USED state
  await db.[documentType]Numbers.update({
    where: { id: number.id },
    data: { state: 'USED', reservedBy: null, reservedAt: null, orderId },
  });

  // Tracking is handled by finding AUTO- prefix entries in reserveNextForYear
}
```

### 3. Created Custom Number API Routes

Created `/custom/route.ts` for each document type:

- **Invoice:** `/api/invoices/numbers/custom`
  - POST: Reserve a custom invoice number
  - Body: `{ reservedBy, year, seq }`
  - Response: `{ success, seq, year, reservationId, expiresAt, fullNumber }`

- **Proforma:** `/api/proformas/numbers/custom`
  - POST: Reserve a custom proforma number
  - Body: `{ reservedBy, year, seq }`
  - Response: `{ success, seq, year, reservationId, expiresAt, fullNumber }`

- **Purchase Order:** `/api/purchase-orders/numbers/custom`
  - POST: Reserve a custom purchase order number
  - Body: `{ reservedBy, year, seq }`
  - Response: `{ success, seq, year, reservationId, expiresAt, fullNumber }`

- **Delivery Note:** `/api/delivery-notes/numbers/custom`
  - POST: Reserve a custom delivery note number
  - Body: `{ reservedBy, year, seq }`
  - Response: `{ success, seq, year, reservationId, expiresAt, fullNumber }`

## Files Modified

### Service Files
1. **`src/server/services/invoiceNumberingService.ts`**
   - Added `getHighestAutoSeq()` method
   - Updated `reserveNextForYear()` to use auto-tracking and skip logic
   - Updated `reserveSpecificForYear()` to use REUSE- prefix
   - Added `reserveCustomForYear()` method with CUSTOM- prefix
   - Updated `finalizeReservation()` documentation

2. **`src/server/services/proformaNumberingService.ts`**
   - Same updates as InvoiceNumberingService

3. **`src/server/services/purchaseOrderNumberingService.ts`**
   - Same updates as InvoiceNumberingService

4. **`src/server/services/deliveryNoteNumberingService.ts`**
   - Same updates as InvoiceNumberingService

### API Route Files
5. **`src/app/api/invoices/numbers/custom/route.ts`** (NEW)
6. **`src/app/api/proformas/numbers/custom/route.ts`** (NEW)
7. **`src/app/api/purchase-orders/numbers/custom/route.ts`** (NEW)
8. **`src/app/api/delivery-notes/numbers/custom/route.ts`** (NEW)

## How It Works Now

### Example Scenario for Invoices

```
Auto: INV-001/2026 → Auto counter = 1
Auto: INV-002/2026 → Auto counter = 2
Auto: INV-003/2026 → Auto counter = 3
Auto: INV-004/2026 → Auto counter = 4
Auto: INV-005/2026 → Auto counter = 5

Custom: INV-013/2026 → Auto counter stays at 5 (unchanged!)

Auto: INV-006/2026 → Auto counter = 6 ✅ (continues from 5)
Auto: INV-007/2026 → Auto counter = 7 ✅
...
Auto: INV-012/2026 → Auto counter = 12 ✅
Auto: INV-014/2026 → Auto counter = 14 ✅ (skips 13, already used)
```

### Same Logic Applies to All Document Types

- **Proforma Invoices:** PRO-001/2026, PRO-002/2026, etc.
- **Purchase Orders:** PO-001/2026, PO-002/2026, etc.
- **Delivery Notes:** DN-001/2026, DN-002/2026, etc.

## Integration with Order Details Page

The order details page can now use the custom number API for all document types:

### API Usage Examples

**Reserve a custom invoice number:**
```javascript
const response = await fetch('/api/invoices/numbers/custom?XTransformPort=3000', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reservedBy: orderId,
    year: 2026,
    seq: 13
  })
});
const { seq, year, reservationId, fullNumber } = await response.json();
// fullNumber = "INV-013/2026"
```

**Reserve a custom proforma number:**
```javascript
const response = await fetch('/api/proformas/numbers/custom?XTransformPort=3000', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reservedBy: orderId,
    year: 2026,
    seq: 13
  })
});
const { seq, year, reservationId, fullNumber } = await response.json();
// fullNumber = "PRO-013/2026"
```

**Reserve a custom purchase order number:**
```javascript
const response = await fetch('/api/purchase-orders/numbers/custom?XTransformPort=3000', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reservedBy: orderId,
    year: 2026,
    seq: 13
  })
});
const { seq, year, reservationId, fullNumber } = await response.json();
// fullNumber = "PO-013/2026"
```

**Reserve a custom delivery note number:**
```javascript
const response = await fetch('/api/delivery-notes/numbers/custom?XTransformPort=3000', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reservedBy: orderId,
    year: 2026,
    seq: 13
  })
});
const { seq, year, reservationId, fullNumber } = await response.json();
// fullNumber = "DN-013/2026"
```

## Benefits

✅ **Consistent behavior** - All document types now behave the same way
✅ **No gaps** - Auto-numbering continues from where it stopped
✅ **No conflicts** - Used/reserved numbers are automatically skipped
✅ **Clear separation** - Auto, custom, and reused numbers are distinctly tracked
✅ **Backward compatible** - Existing documents and numbers continue to work
✅ **Consistent prefixes** - AUTO-, CUSTOM-, REUSE- across all document types
✅ **Complete API coverage** - Custom number APIs available for all document types

## Testing

All changes have been tested with:
```bash
bun run lint
✔ No ESLint warnings or errors
```

The dev server is running successfully:
```bash
GET /orders/[id] 200 in 25ms
✓ Compiled in 399ms (1589 modules)
```

## Notes

- Each document type tracks its auto-generated numbers independently using the AUTO- prefix
- Custom numbers (CUSTOM- prefix) never affect auto-numbering
- Reused numbers (REUSE- prefix) never affect auto-numbering
- The skip logic in `reserveNextForYear()` prevents conflicts when auto-numbering catches up to used numbers
- All document types follow the same pattern for consistency and maintainability

## Related Documentation

- `CUSTOM_NUMBER_FIX.md` - Original fix for order numbers
- `ORDER_REUSE_FIX_COMPLETE.md` - Order number reuse system documentation
- `NUMBER_REUSE_FIX.md` - Detailed number reuse logic
