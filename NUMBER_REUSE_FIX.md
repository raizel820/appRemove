# Order Creation Number Reuse - Complete Fix

## Problem Description

**User reported:**
1. Order create dialog "allow reuse number" checkbox is not working
2. Numbers are blocked and cannot be reused despite allowing them to be reused
3. The number reservation system exists but is not integrated with order creation

## Root Causes Identified

### Root Cause 1: Frontend doesn't pass reservation info
- **Location:** `src/app/orders/page.tsx`, line 263-267 (handleCreateOrder function)
- **Issue:** The `handleCreateOrder` function only sends `formData` to the API
- **Impact:** The `reservationInfo` state (containing `number`, `reservationId`, `expiresAt`) is never sent to backend
- **Result:** User's number selection (next/reuse/custom) is completely ignored by the API

### Root Cause 2: Create Order API doesn't support reservations
- **Location:** `src/app/api/orders/route.ts`, POST endpoint
- **Issue:** The CreateOrderInput schema doesn't accept `reservedNumber` or `reservationId` parameters
- **Impact:** Even if frontend sends reservation info, API cannot process it
- **Result:** API always generates a new number regardless of user's selection

### Root Cause 3: Order creation always generates new number
- **Location:** `src/app/api/orders/route.ts`, line 228 (old)
- **Issue:** `const sequenceNumber = await getNextSequenceNumber(year);` is called unconditionally
- **Impact:** The system always generates the next sequence number
- **Result:** Numbers reserved by user are never used for the order

### Root Cause 4: OrderNumber field not set
- **Location:** `src/app/api/orders/route.ts`, line 260-292 (order.create)
- **Issue:** The `orderNumber` field (foreign key to OrderNumber table) is never set
- **Impact:** Orders don't link to the OrderNumber table entries created by reservations
- **Result:** Two separate number management systems running independently

### Root Cause 5: Reservations never claimed
- **Location:** `src/app/api/orders/route.ts`
- **Issue:** No call to `claimReservation()` after order creation
- **Impact:** Reserved numbers remain in RESERVED state indefinitely
- **Result:** OrderNumber state machine not properly maintained

## Solution Implementation

### Fix 1: Frontend - Pass Reservation Info
**File:** `src/app/orders/page.tsx`

**Changes to handleCreateOrder:**
1. Added validation to ensure a number is reserved before creating order
2. Added expiration check to prevent using expired reservations
3. Updated the API call to include `reservedNumber` and `reservationId` in the request body
4. Calls `resetFormData()` instead of manually resetting (includes number state)

**Code:**
```typescript
// Validate that a number is reserved
if (!reservationInfo) {
  toast({
    title: t("error") || "Error",
    description: "Please reserve an order number before creating",
    variant: "destructive",
  });
  return;
}

// Check if reservation has expired
if (new Date() > new Date(reservationInfo.expiresAt)) {
  toast({
    title: t("error") || "Error",
    description: "Number reservation has expired. Please reserve a new number.",
    variant: "destructive",
  });
  setReservationInfo(null);
  setNumberOption('next');
  return;
}

// Send reservation info to API
body: JSON.stringify({
  ...formData,
  reservedNumber: reservationInfo.number,
  reservationId: reservationInfo.reservationId,
})
```

**Changes to CreateOrderData interface:**
```typescript
interface CreateOrderData {
  // ... existing fields ...
  reservedNumber?: number;
  reservationId?: string;
}
```

### Fix 2: Backend API - Accept Reservation Parameters
**File:** `src/app/api/orders/route.ts`

**Changes to CreateOrderInput schema:**
```typescript
const CreateOrderInput = z.object({
  // ... existing fields ...
  reservedNumber: z.number().optional(),
  reservationId: z.string().optional(),
});
```

### Fix 3: Backend API - Use Reserved Number
**File:** `src/app/api/orders/route.ts`

**Changes to number generation logic (replaced lines 228-243):**
```typescript
// Step 4: Get sequence number - use reserved number if provided
let sequenceNumber: number;
let orderNumber: number | null = null;

if (input.reservedNumber && input.reservationId) {
  // User provided a reserved number
  sequenceNumber = input.reservedNumber;
  orderNumber = input.reservedNumber;
} else {
  // Generate next number using existing logic
  sequenceNumber = await getNextSequenceNumber(year);
}

// Format: orderCount/year, e.g., 001/2026, 002/2026, etc.
const fullNumber = `${String(sequenceNumber).padStart(3, '0')}/${year}`;
```

**Changes to order.create data:**
```typescript
const newOrder = await tx.order.create({
  data: {
    type: 'INVOICE',
    numberYear: year,
    numberSequence: sequenceNumber,
    fullNumber,
    orderNumber: orderNumber,  // NEW: Link to OrderNumber table
    customerId: customer?.id || input.customerId,
    customerName,
    date: orderDateISO,
    status: 'DRAFT',
    currency,
    subtotal: Math.round(subtotal * 100) / 100,
    taxRate,
    taxAmount,
    total,
    notes: input.notes || null,
    documentLanguage: input.documentLanguage || 'fr',
  },
});
```

### Fix 4: Claim Reservation After Order Creation
**File:** `src/app/api/orders/route.ts`

**Added after transaction completion (before audit log):**
```typescript
// Step 8.5: Claim the reservation if a reserved number was used
if (orderNumber && input.reservationId) {
  try {
    const { getOrderNumberRepository } = await import('@/server/repositories/orderNumberRepository');
    const orderNumberRepo = getOrderNumberRepository();
    await orderNumberRepo.claimReservation(orderNumber, input.reservationId);
  } catch (error) {
    // Log but don't fail the order creation
    console.error('Failed to claim reservation:', error);
  }
}
```

## How the Number Reuse System Now Works

### Order Creation Flow (with Number Reuse)

1. **User opens Create Order dialog**
   - Three options: "Use Next Number", "Reuse Number", "Custom Number"
   - Selects "Reuse Number"

2. **User selects a reusable number**
   - Frontend calls `/api/numbers/available` to get list of reusable numbers
   - User clicks on a number (e.g., #5)
   - Frontend calls `/api/numbers/reuse` with the number
   - OrderNumber repository changes state: REUSABLE → RESERVED
   - `reservationInfo` state is set with: `{number: 5, reservationId: '...', expiresAt: '...'}`

3. **User fills in order details and submits**
   - Frontend validates that `reservationInfo` exists
   - Frontend validates that reservation hasn't expired
   - Frontend sends to API: `formData + {reservedNumber: 5, reservationId: '...'}`

4. **Backend creates order**
   - API receives `reservedNumber: 5` and `reservationId: '...'`
   - API sets `sequenceNumber = 5`, `orderNumber = 5`
   - API creates Order with `orderNumber: 5` (links to OrderNumber table)
   - API calls `claimReservation(5, '...')`
   - OrderNumber state changes: RESERVED → USED
   - Order is created with fullNumber "005/2026"

### Order Deletion Flow (with Number Reuse)

1. **User clicks Delete on an order**
   - Delete dialog opens with checkbox: "Allow reuse of order number"
   - Default is unchecked (block reuse by default for safety)

2. **User selects option and confirms**
   - **If unchecked (block reuse):**
     - Frontend sends `reserveNumber: true` (keep number)
     - Backend soft deletes order (sets `deletedAt`)
     - Backend calls `blockNumber(orderNumber)`
     - OrderNumber state: USED → BLOCKED (cannot be reused)
     - SerialNumberCounter NOT decremented

   - **If checked (allow reuse):**
     - Frontend sends `reserveNumber: false` (allow reuse)
     - Backend soft deletes order (sets `deletedAt`)
     - Backend calls `markNumberReusable(orderNumber)`
     - OrderNumber state: USED → REUSABLE
     - SerialNumberCounter decremented (allows number to be used again)

3. **Number becomes available for reuse**
   - Frontend can call `/api/numbers/available`
   - Returns list of REUSABLE numbers
   - User can select and reuse the number

## State Machine for Order Numbers

```
RESERVED (created by user reserving a number)
   ↓ (order created with this number)
USED (number is currently used by an order)
   ↓ (order deleted)
   ↓ (two possible paths)

   Path A: User checked "allow reuse"
   → REUSABLE (number can be reused for new orders)
      ↓ (user reuses this number)
      → RESERVED
      → USED (loop continues)

   Path B: User did NOT check "allow reuse"
   → BLOCKED (number permanently blocked)
```

## Verification Steps

### 1. Create Order with Reserved Number
1. Open Orders page
2. Click "Create Order"
3. Select "Reuse Number"
4. Pick a reusable number from list
5. Fill in required fields (customer, items)
6. Submit
7. ✅ Order should be created with the selected number
8. ✅ OrderNumber table should show state: USED
9. ✅ Order.orderNumber should link to the number

### 2. Delete Order and Mark as Reusable
1. Find an order
2. Click Delete
3. Check "Allow reuse of order number" checkbox
4. Confirm
5. ✅ Order should be soft deleted (deletedAt set)
6. ✅ OrderNumber table should show state: REUSABLE
7. ✅ Number should appear in reusable numbers list

### 3. Delete Order and Block Number
1. Find an order
2. Click Delete
3. Leave "Allow reuse of order number" checkbox unchecked
4. Confirm
5. ✅ Order should be soft deleted (deletedAt set)
6. ✅ OrderNumber table should show state: BLOCKED
7. ✅ Number should NOT appear in reusable numbers list

## Files Modified

1. **src/app/orders/page.tsx**
   - Updated `handleCreateOrder` to validate and pass reservation info
   - Added reservation expiration check
   - Updated `CreateOrderData` interface to include reservation fields

2. **src/app/api/orders/route.ts**
   - Updated `CreateOrderInput` schema to accept `reservedNumber` and `reservationId`
   - Updated number generation logic to use reserved number when provided
   - Added `orderNumber` to order.create call
   - Added `claimReservation` call after order creation

## Testing

All changes have been:
- ✅ Compiled successfully
- ✅ Passed ESLint checks (no warnings or errors)
- ✅ Dev server running smoothly on port 3000
- ✅ API endpoints responding correctly

## Notes

### Reservations expire after 10 minutes
- If a user reserves a number but doesn't create the order within 10 minutes
- The reservation expires
- User must reserve a new number
- This prevents numbers from being stuck in RESERVED state

### Error handling
- If `claimReservation` fails, the order creation still succeeds
- Error is logged but not shown to user
- This ensures order creation is not blocked by reservation system issues

### Backward compatibility
- The changes are fully backward compatible
- Orders can still be created without reservation (uses automatic number generation)
- If no `reservedNumber` is provided, the old logic is used

### Two number systems
- The project has two number management systems:
  1. SerialNumberCounter (simple year-based counter)
  2. OrderNumber (full state machine with reservations)
- This fix integrates both systems
- OrderNumber is now used when reservation is provided
- SerialNumberCounter is still used for non-reserved orders
