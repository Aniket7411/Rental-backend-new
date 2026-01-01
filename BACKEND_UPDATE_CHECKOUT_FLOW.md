# Backend Update: Checkout Flow & Payment Options

This document outlines the backend changes required to support the updated checkout flow and payment options.

## Overview

The frontend has been updated with the following changes:
1. **Two Payment Options Only**: "Pay Now" (full payment) and "Book Now" (advance payment with configurable amount)
2. **Removed Payment Option**: "Pay Later" option has been removed
3. **Configurable Advance Amount**: The advance payment amount for "Book Now" should be configurable by admin (default: ₹500)
4. **Address Modal in Checkout**: Address can be added directly in checkout flow
5. **Success Modal**: Order placement shows success modal

## Required Backend Changes

### 1. Settings/Configuration API

#### Update Settings Schema

Add `advancePaymentAmount` field to the settings model:

```javascript
// Settings Model
{
  instantPaymentDiscount: Number,      // Existing (e.g., 10 for 10%)
  advancePaymentDiscount: Number,      // Existing (e.g., 5 for 5%)
  advancePaymentAmount: Number,        // NEW: Default 500 (configurable by admin)
  // ... other settings
}
```

#### Update Settings Endpoints

**GET `/api/settings` (Public endpoint)**
- Should return `advancePaymentAmount` field
- Default value: 500 if not set

```json
{
  "success": true,
  "data": {
    "instantPaymentDiscount": 10,
    "advancePaymentDiscount": 5,
    "advancePaymentAmount": 500
  }
}
```

**PUT `/api/admin/settings` (Admin endpoint)**
- Should accept `advancePaymentAmount` in request body
- Should validate that `advancePaymentAmount` is a positive number
- Should save and return updated settings

```json
// Request
{
  "instantPaymentDiscount": 10,
  "advancePaymentDiscount": 5,
  "advancePaymentAmount": 500
}

// Response
{
  "success": true,
  "message": "Settings updated successfully",
  "data": {
    "instantPaymentDiscount": 10,
    "advancePaymentDiscount": 5,
    "advancePaymentAmount": 500
  }
}
```

### 2. Order Creation API

#### Update Order Schema

The order model should already have these fields (from previous updates):
- `paymentOption`: String (values: 'payNow' or 'payAdvance')
- `advanceAmount`: Number (null for payNow, amount for payAdvance)
- `remainingAmount`: Number (null for payNow, calculated amount for payAdvance)
- `priorityServiceScheduling`: Boolean

#### Validation Updates

**POST `/api/orders`**

Ensure validation accepts only two payment options:
- `paymentOption` must be either `'payNow'` or `'payAdvance'` (reject `'payLater'` if it exists)
- When `paymentOption === 'payAdvance'`:
  - `advanceAmount` should match the current `advancePaymentAmount` from settings
  - `remainingAmount` should be calculated as: `finalTotal - advanceAmount`
  - `priorityServiceScheduling` should be `true`
- When `paymentOption === 'payNow'`:
  - `advanceAmount` should be `null`
  - `remainingAmount` should be `null`
  - `priorityServiceScheduling` should be `false`

### 3. User Profile/Address API

#### Update User Profile Endpoint

**PATCH `/api/users/profile`**

Should continue to support address updates as before:
- Accept `homeAddress`, `address` object, `nearLandmark`, `alternateNumber`, `pincode`
- Return updated user object with address fields

The frontend checkout page now includes an address modal that uses this endpoint.

### 4. Payment Processing

#### Payment Amount Calculation

**POST `/api/payments/create-order`**

When creating payment order for Razorpay:
- For `paymentOption === 'payNow'`: Use `finalTotal` as payment amount
- For `paymentOption === 'payAdvance'`: Use `advanceAmount` (from order) as payment amount

The frontend will send the correct amount based on payment option selected.

### 5. Admin Settings UI (Optional but Recommended)

If you have an admin settings page, ensure it includes:
- Input field for `advancePaymentAmount`
- Save/Update button
- Display current value
- Validation (positive number, reasonable range e.g., 100-10000)

## Migration Steps

1. **Add `advancePaymentAmount` to Settings Model**
   ```javascript
   // If using Mongoose
   const settingsSchema = new Schema({
     // ... existing fields
     advancePaymentAmount: {
       type: Number,
       default: 500,
       min: 1
     }
   });
   ```

2. **Update Settings Seed/Initialization**
   - Ensure default settings include `advancePaymentAmount: 500`
   - Update any settings initialization code

3. **Update Settings Controller**
   - Add `advancePaymentAmount` to GET `/api/settings` response
   - Add `advancePaymentAmount` to PUT `/api/admin/settings` request/response

4. **Validate Order Payment Options**
   - Remove/Update any logic that handles `paymentOption === 'payLater'`
   - Ensure only `'payNow'` and `'payAdvance'` are accepted

5. **Test Payment Flow**
   - Test order creation with `paymentOption: 'payNow'`
   - Test order creation with `paymentOption: 'payAdvance'` with different `advanceAmount` values
   - Verify payment gateway integration uses correct amounts

## API Request/Response Examples

### Create Order - Pay Now
```json
POST /api/orders
{
  "orderId": "ORD-2024-123",
  "items": [...],
  "total": 5000,
  "discount": 500,
  "finalTotal": 4500,
  "paymentOption": "payNow",
  "paymentStatus": "pending",
  "priorityServiceScheduling": false,
  "advanceAmount": null,
  "remainingAmount": null,
  ...
}
```

### Create Order - Book Now (Advance Payment)
```json
POST /api/orders
{
  "orderId": "ORD-2024-124",
  "items": [...],
  "total": 5000,
  "discount": 250,
  "finalTotal": 4750,
  "paymentOption": "payAdvance",
  "paymentStatus": "pending",
  "priorityServiceScheduling": true,
  "advanceAmount": 500,
  "remainingAmount": 4250,
  ...
}
```

### Update Settings (Admin)
```json
PUT /api/admin/settings
{
  "instantPaymentDiscount": 10,
  "advancePaymentDiscount": 5,
  "advancePaymentAmount": 500
}
```

## Testing Checklist

- [ ] Settings API returns `advancePaymentAmount` in GET `/api/settings`
- [ ] Admin can update `advancePaymentAmount` via PUT `/api/admin/settings`
- [ ] Order creation accepts only `'payNow'` or `'payAdvance'` for `paymentOption`
- [ ] Order with `'payAdvance'` has correct `advanceAmount` and `remainingAmount`
- [ ] Payment gateway receives correct amount for both payment options
- [ ] Address update via PATCH `/api/users/profile` works from checkout modal
- [ ] Orders with `'payLater'` (if any exist) are handled gracefully

## Notes

- **Backward Compatibility**: If there are existing orders with `paymentOption: 'payLater'`, consider migration or handle them gracefully
- **Default Value**: If `advancePaymentAmount` is not set, default to 500
- **Validation**: Ensure `advancePaymentAmount` is a positive number (recommended range: 100-10000)
- **Admin Control**: Admin should be able to change `advancePaymentAmount` at any time through settings

## Frontend Integration

The frontend will:
1. Fetch `advancePaymentAmount` from GET `/api/settings` on page load
2. Display "Book Now (₹{advancePaymentAmount})" as payment option
3. Send `advanceAmount: advancePaymentAmount` when `paymentOption === 'payAdvance'`
4. Use `advancePaymentAmount` for Razorpay payment creation
5. Only show "Pay Now" and "Book Now" options (no "Pay Later")

All frontend changes have been implemented. This backend update ensures the API supports the new payment flow.

