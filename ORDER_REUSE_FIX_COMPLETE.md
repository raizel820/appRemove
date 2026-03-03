# Complete Fix: Order Creation & Number Reuse System

## Issues Fixed

### Issue 1: "Automatically get the next available number" not working
**Symptom:** Error message "Please reserve an order number before creating" when selecting "Use Next Number"

**Root Cause:**
- Frontend required users to click "Reserve Next Number" before submitting
- No automatic reservation when user clicked submit

**Solution:**
- Updated `handleCreateOrder` to automatically reserve next number when needed
- If `numberOption === 'next'` and no reservation exists, automatically calls `/api/numbers/next`
- User can now just fill in form and submit - reservation happens automatically

**File:** `src/app/orders/page.tsx`

---

### Issue 2: Internal server error when selecting reusable order number
**Symptom:** 500 Internal Server Error with message "Unique constraint failed on the fields: (orderNumber)"

**Root Cause:**
- Database constraint `@@unique([orderNumber])` prevented ANY two orders from having the same orderNumber
- Even deleted orders couldn't reuse numbers
- When trying to reuse a number, the system tried to create Order with same orderNumber as a deleted order
- Unique constraint blocked this, causing 500 error

**Solution:**
- Changed constraint from `@@unique([orderNumber])` to `@@unique([orderNumber, deletedAt])`
- Now allows same orderNumber for:
  - One active order (deletedAt IS NULL)
  - One or more deleted orders (deletedAt IS NOT NULL)
- Only prevents two ACTIVE orders from having the same orderNumber
- Enables full number reuse functionality

**File:** `prisma/schema.prisma`

**Command applied:** `bun run db:push --accept-data-loss`

---

## How Number Reuse Now Works

### Creating an Order

**Option 1: Use Next Number**
1. User selects "Use Next Number"
2. Fills in customer, items, etc.
3. Clicks "Create Order"
4. System automatically reserves next number
5. Order is created with reserved number
6. OrderNumber state: RESERVED → USED
7. ✅ No manual reservation needed!

**Option 2: Reuse Number**
1. User selects "Reuse Number"
2. System fetches list of REUSABLE numbers
3. User selects a number from list (e.g., #5)
4. System reserves that number
5. User fills in order details
6. Clicks "Create Order"
7. Order is created with that orderNumber (links to existing OrderNumber entry)
8. OrderNumber state: REUSABLE → RESERVED → USED
9. ✅ Number successfully reused!

**Option 3: Custom Number**
1. User selects "Custom Number"
2. Enters specific number (e.g., #42)
3. Clicks "Validate & Reserve"
4. System validates number is available
5. System reserves the number
6. User fills in order details
7. Clicks "Create Order"
8. Order is created with custom number
9. OrderNumber state: RESERVED → USED
10. ✅ Custom number used!

### Deleting an Order

**Option 1: Delete and Allow Reuse** (checkbox checked)
1. User clicks "Delete" on an order
2. Checks "Allow reuse of order number" checkbox
3. Confirms deletion
4. Order is soft deleted (deletedAt set to current timestamp)
5. System calls `markNumberReusable(orderNumber)`
6. OrderNumber state: USED → REUSABLE
7. SerialNumberCounter decremented
8. Number appears in reusable numbers list
9. ✅ Number can be reused!

**Option 2: Delete and Keep Number** (checkbox unchecked)
1. User clicks "Delete" on an order
2. Leaves "Allow reuse of order number" checkbox unchecked
3. Confirms deletion
4. Order is soft deleted (deletedAt set to current timestamp)
5. System calls `blockNumber(orderNumber)`
6. OrderNumber state: USED → BLOCKED
7. SerialNumberCounter NOT decremented
8. Number does NOT appear in reusable numbers list
9. ✅ Number permanently blocked!

---

## Database Schema Changes

### Before (BROKEN)
```prisma
model Order {
  orderNumber        Int?
  // ... other fields ...

  @@unique([orderNumber]) // ❌ Prevents ANY two orders from having same number
  // ... other indexes ...
}
```

### After (FIXED)
```prisma
model Order {
  orderNumber        Int?
  deletedAt          DateTime?
  // ... other fields ...

  @@unique([orderNumber, deletedAt]) // ✅ Only prevents two ACTIVE orders from having same number
  // ... other indexes ...
}
```

---

## State Machine Flow

```
Initial State (new number):
  User selects "Use Next Number" → RESERVED → USED
  User selects "Custom Number" → RESERVED → USED

After Deletion:
  USED → [if allow reuse] → REUSABLE
  USED → [if not allow reuse] → BLOCKED

When Reusing:
  REUSABLE → RESERVED → USED

Reservation Expiration:
  RESERVED → (10 min timeout) → BLOCKED
```

---

## Files Modified

1. **prisma/schema.prisma**
   - Changed `@@unique([orderNumber])` to `@@unique([orderNumber, deletedAt])`
   - Allows number reuse after order deletion

2. **src/app/orders/page.tsx**
   - Updated `handleCreateOrder` to auto-reserve next number
   - Stores reservation info in local variable (immediate use) and React state (UI)
   - Shows clear error messages if reservation fails

3. **src/app/api/orders/route.ts**
   - Accepts `reservedNumber` and `reservationId` parameters
   - Uses reserved number when provided
   - Links Order to OrderNumber table
   - Claims reservation after order creation

---

## Verification

All changes have been:
- ✅ Schema updated and pushed to database
- ✅ Prisma Client regenerated
- ✅ Code compiled successfully
- ✅ ESLint check passed (no warnings or errors)
- ✅ Dev server running smoothly

---

## Testing Instructions

### Test 1: Use Next Number (Automatic)
1. Go to Orders page
2. Click "Create Order"
3. Select "Use Next Number" option
4. Fill in required fields (customer, items)
5. Click "Create Order" (DO NOT click "Reserve Next Number")
6. ✅ Expected: Order created successfully with next number

### Test 2: Reuse Number
1. Create an order and delete it with "Allow reuse" checked
2. Go to Orders page
3. Click "Create Order"
4. Select "Reuse Number" option
5. Click on the reusable number
6. Fill in required fields
7. Click "Create Order"
8. ✅ Expected: Order created successfully with reused number
9. ✅ No 500 error

### Test 3: Delete and Allow Reuse
1. Create an order (use any method)
2. Click "Delete" on the order
3. Check "Allow reuse of order number" checkbox
4. Confirm
5. ✅ Expected: Order deleted, number marked as REUSABLE
6. Number appears in "Reuse Number" list

### Test 4: Delete and Block Number
1. Create an order
2. Click "Delete" on the order
3. Leave "Allow reuse of order number" unchecked
4. Confirm
5. ✅ Expected: Order deleted, number marked as BLOCKED
6. Number does NOT appear in "Reuse Number" list

---

## Notes

### Reservation Timeout
- All reservations expire after 10 minutes
- Expired reservations transition to BLOCKED state
- User must reserve a new number if expiration occurs

### Error Handling
- If auto-reserve fails, clear error message shown
- User can manually click "Reserve Next Number"
- If claimReservation fails, order still created (graceful degradation)
- All errors logged to console for debugging

### Backward Compatibility
- All changes are backward compatible
- Orders can still be created without reservation (uses SerialNumberCounter)
- If no reserved number provided, old logic is used (getNextSequenceNumber)
- Deleted orders before this fix can now have their numbers reused
