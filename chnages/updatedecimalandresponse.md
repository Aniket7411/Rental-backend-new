# Backend Decimal Handling and Response Requirements

## Overview
This document outlines the decimal precision requirements for monetary values in the backend API to prevent payment failures and ensure accurate calculations.

## Problem Statement
Frontend calculations can result in floating-point precision errors (e.g., `15363.494999999999` instead of `15273.65`). The backend must handle these values correctly and ensure all monetary values are rounded to 2 decimal places.

## Frontend Changes
The frontend now rounds all monetary values to 2 decimal places before sending to the backend using the `roundMoney()` utility function. All monetary calculations use proper rounding to ensure:
- `finalTotal = subtotal - paymentDiscount - couponDiscount`
- All values are rounded to 2 decimal places
- No floating-point precision errors are sent to the backend

## Backend Requirements

### 1. Decimal Precision Handling

#### All Monetary Fields Must Be Rounded to 2 Decimal Places

The backend should round all monetary values to 2 decimal places when:
- Receiving data from frontend
- Performing calculations
- Storing in database
- Sending in API responses

**Recommended Implementation:**
```javascript
// Example: Round monetary value to 2 decimal places
function roundMoney(value) {
  if (typeof value !== 'number' || isNaN(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
}
```

### 2. Order Creation Endpoint (`POST /api/orders`)

#### Request Body Validation
All monetary fields in the request body must be validated and rounded:

```javascript
{
  "total": 17000.00,              // Subtotal (rounded to 2 decimals)
  "productDiscount": 1700.00,      // Product discount (rounded)
  "discount": 3400.00,             // Total discount (rounded)
  "couponDiscount": 850.00,        // Coupon discount (rounded)
  "paymentDiscount": 850.00,       // Payment discount (rounded)
  "finalTotal": 13600.00           // Final total (rounded)
}
```

#### Calculation Verification
The backend must verify that:
```
finalTotal = total - paymentDiscount - couponDiscount
```

If the calculation doesn't match (within 0.01 tolerance for rounding), the backend should:
1. Recalculate using rounded values
2. Use the recalculated value as the source of truth
3. Log a warning if there's a significant discrepancy

**Example Implementation:**
```javascript
// Validate and recalculate final total
const roundedTotal = roundMoney(orderData.total);
const roundedPaymentDiscount = roundMoney(orderData.paymentDiscount || 0);
const roundedCouponDiscount = roundMoney(orderData.couponDiscount || 0);

const calculatedFinalTotal = roundMoney(
  roundedTotal - roundedPaymentDiscount - roundedCouponDiscount
);

// Use calculated value if provided value differs significantly
if (Math.abs(calculatedFinalTotal - orderData.finalTotal) > 0.01) {
  console.warn('Final total mismatch, using calculated value');
  orderData.finalTotal = calculatedFinalTotal;
}
```

### 3. Database Schema

#### Decimal/Number Fields
All monetary fields in the database should use:
- **MongoDB**: `Number` type with validation to ensure 2 decimal places
- **PostgreSQL/MySQL**: `DECIMAL(10, 2)` or `NUMERIC(10, 2)`
- **Validation**: Ensure values are stored with exactly 2 decimal places

**Example Schema (Mongoose):**
```javascript
{
  total: {
    type: Number,
    required: true,
    get: (v) => roundMoney(v),
    set: (v) => roundMoney(v)
  },
  finalTotal: {
    type: Number,
    required: true,
    get: (v) => roundMoney(v),
    set: (v) => roundMoney(v)
  },
  // ... other monetary fields
}
```

### 4. Payment Processing

#### Razorpay Integration
Razorpay requires amounts in **paise** (smallest currency unit). Convert rounded rupees to paise:

```javascript
// Convert rupees to paise (multiply by 100)
const amountInPaise = Math.round(finalTotal * 100);

// Ensure it's an integer (no decimals in paise)
if (!Number.isInteger(amountInPaise)) {
  throw new Error('Invalid amount for payment gateway');
}
```

**Important:** Always use the rounded `finalTotal` value when creating payment orders.

### 5. API Response Format

#### All Monetary Values in Responses
All monetary fields in API responses must be:
- Rounded to 2 decimal places
- Formatted as numbers (not strings)
- Consistent with database values

**Example Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "ORD-2024-001",
    "total": 17000.00,
    "productDiscount": 1700.00,
    "discount": 3400.00,
    "couponDiscount": 850.00,
    "paymentDiscount": 850.00,
    "finalTotal": 13600.00,
    "paymentStatus": "pending"
  }
}
```

### 6. Error Handling

#### Invalid Decimal Values
If the backend receives invalid decimal values:
1. Round to 2 decimal places
2. Log a warning
3. Continue processing (don't fail the request)
4. Return the corrected value in the response

**Example:**
```javascript
if (orderData.finalTotal && orderData.finalTotal.toString().split('.')[1]?.length > 2) {
  console.warn('Received value with more than 2 decimal places, rounding:', orderData.finalTotal);
  orderData.finalTotal = roundMoney(orderData.finalTotal);
}
```

### 7. Testing Requirements

#### Test Cases to Verify
1. **Precision Test**: Send `15363.494999999999` → Should be rounded to `15363.49`
2. **Calculation Test**: Verify `finalTotal = total - paymentDiscount - couponDiscount`
3. **Payment Gateway Test**: Ensure payment amounts are correctly converted to paise
4. **Database Test**: Verify all monetary values are stored with 2 decimal places
5. **Response Test**: Verify all monetary values in responses are rounded

### 8. Migration Notes

#### Existing Orders
If there are existing orders with incorrect decimal precision:
1. Create a migration script to round all monetary fields
2. Run the migration during a maintenance window
3. Verify data integrity after migration

**Example Migration Script:**
```javascript
// Round all monetary fields in existing orders
db.orders.find({}).forEach(function(order) {
  db.orders.update(
    { _id: order._id },
    {
      $set: {
        total: roundMoney(order.total),
        finalTotal: roundMoney(order.finalTotal),
        discount: roundMoney(order.discount || 0),
        couponDiscount: roundMoney(order.couponDiscount || 0),
        paymentDiscount: roundMoney(order.paymentDiscount || 0)
      }
    }
  );
});
```

## Summary

### Key Points
1. ✅ All monetary values must be rounded to 2 decimal places
2. ✅ Verify `finalTotal = total - paymentDiscount - couponDiscount`
3. ✅ Use rounded values for payment gateway (convert to paise)
4. ✅ Store rounded values in database
5. ✅ Return rounded values in API responses
6. ✅ Handle floating-point precision errors gracefully

### Frontend Guarantee
The frontend now guarantees that all monetary values sent to the backend are:
- Rounded to 2 decimal places
- Calculated correctly: `finalTotal = subtotal - paymentDiscount - couponDiscount`
- Free from floating-point precision errors

### Backend Responsibility
The backend must:
- Accept and validate rounded values
- Recalculate if necessary to ensure accuracy
- Store values with 2 decimal precision
- Return consistent rounded values in responses

## Contact
For questions or issues related to decimal handling, please refer to this document or contact the development team.

