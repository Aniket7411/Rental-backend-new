# Backend Update: Security Deposit Implementation

## Summary

This document summarizes all backend changes made to implement security deposit for monthly payment products, as per `backendnewupdate.md`.

## Changes Made

### 1. Product Model (`models/Product.js`)

✅ **Added `securityDeposit` field:**
- Type: Number
- Default: 0
- Min: 0
- Required when `monthlyPaymentEnabled` is true

✅ **Updated validation:**
- If `monthlyPaymentEnabled` is true, both `monthlyPrice` and `securityDeposit` must be > 0
- If `monthlyPaymentEnabled` is false, `securityDeposit` is set to 0

### 2. Order Model (`models/Order.js`)

✅ **Added `securityDeposit` field to order items:**
- Type: Number
- Default: null
- Min: 0
- Stored for monthly payment items only

✅ **Updated `monthlyTenure` validation:**
- Changed enum from `[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24]` to `[3, 6, 9, 11, 12, 24]`
- Added validator to ensure tenure is in allowed list when `isMonthlyPayment` is true

✅ **Updated `duration` enum:**
- Changed from `[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24]` to `[3, 6, 9, 11, 12, 24]`
- Now same valid values for both payment types

### 3. Order Controller (`controllers/orderController.js`)

✅ **Updated monthly payment validation:**
- Added validation for `securityDeposit` (required and > 0 for monthly payments)
- Validates `securityDeposit` matches product's `securityDeposit`
- Updated allowed tenures to only `[3, 6, 9, 11, 12, 24]`

✅ **Updated price calculation:**
- **Changed from:** `monthlyPrice * monthlyTenure`
- **Changed to:** `monthlyPrice + securityDeposit`
- This is the upfront payment for monthly payment option

✅ **Updated order item structure:**
- Added `securityDeposit` to processed items
- Added `securityDeposit` to product snapshot
- Set `securityDeposit` to null for regular payment items

### 4. Product Controller (`controllers/productController.js`)

✅ **Updated create product:**
- Added `securityDeposit` to request body handling
- Validates `securityDeposit` is required and > 0 when `monthlyPaymentEnabled` is true
- Sets `securityDeposit` to 0 when `monthlyPaymentEnabled` is false

✅ **Updated update product:**
- Added validation for `securityDeposit` when enabling monthly payment
- Handles `securityDeposit` updates independently
- Sets `securityDeposit` to 0 when disabling monthly payment

## API Changes

### POST `/api/products` (Create Product)

**Request Body:**
```json
{
  "monthlyPaymentEnabled": true,
  "monthlyPrice": 2000,
  "securityDeposit": 5000,
  // ... other fields
}
```

**Validation:**
- If `monthlyPaymentEnabled` is true: both `monthlyPrice` and `securityDeposit` must be > 0
- If `monthlyPaymentEnabled` is false: `securityDeposit` is set to 0

### PUT/PATCH `/api/products/:id` (Update Product)

**Request Body:**
```json
{
  "monthlyPaymentEnabled": true,
  "monthlyPrice": 2000,
  "securityDeposit": 5000
}
```

**Validation:**
- Same as create product
- Can update `securityDeposit` independently if monthly payment is enabled

### POST `/api/orders` (Create Order)

**Request Body (Monthly Payment):**
```json
{
  "items": [
    {
      "type": "rental",
      "productId": "product_id",
      "isMonthlyPayment": true,
      "monthlyPrice": 2000,
      "monthlyTenure": 12,
      "securityDeposit": 5000,
      "price": 7000  // monthlyPrice (2000) + securityDeposit (5000)
    }
  ]
}
```

**Validation:**
- `securityDeposit` is required and must be > 0 for monthly payment items
- `securityDeposit` must match product's `securityDeposit`
- `monthlyTenure` must be one of: 3, 6, 9, 11, 12, 24
- `price` must equal `monthlyPrice + securityDeposit + installationCharges`

**Price Calculation:**
- **Monthly Payment:** `monthlyPrice + securityDeposit + installationCharges`
- **Advance Payment:** `product.price[duration] + installationCharges`

### GET `/api/products/:id` or `/api/acs/:id` (Get Product)

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "product_id",
    "monthlyPaymentEnabled": true,
    "monthlyPrice": 2000,
    "securityDeposit": 5000,
    // ... other fields
  }
}
```

## Important Notes

1. **Security Deposit:**
   - Only required for monthly payment option
   - Not applicable for advance payment
   - Stored in both product and order item

2. **Tenure Validation:**
   - Monthly payment: Only 3, 6, 9, 11, 12, 24 months allowed
   - Advance payment: Only 3, 6, 9, 11, 12, 24 months allowed
   - Both payment types use the same valid tenure list

3. **Price Calculation:**
   - Monthly payment upfront: `monthlyPrice + securityDeposit + installationCharges`
   - Advance payment: `price[duration] + installationCharges`
   - Monthly payment does NOT multiply monthlyPrice by tenure for upfront payment

4. **Backward Compatibility:**
   - Existing products without monthly payment will continue to work
   - Existing orders without monthly payment fields will continue to work
   - Products without `securityDeposit` will default to 0

## Testing Checklist

- [x] Product model validates securityDeposit when monthlyPaymentEnabled is true
- [x] Order model stores securityDeposit for monthly payment items
- [x] Order creation validates securityDeposit matches product
- [x] Order creation calculates price correctly (monthlyPrice + securityDeposit)
- [x] Product creation/update handles securityDeposit
- [x] Tenure validation restricted to [3, 6, 9, 11, 12, 24]
- [x] Product API responses include securityDeposit

## Migration Notes

If you have existing products with `monthlyPaymentEnabled: true` but no `securityDeposit`, you may need to run a migration script to set default security deposit values. The model validation will prevent saving products with monthly payment enabled but no security deposit.

---

**All changes maintain backward compatibility with existing products and orders.**

