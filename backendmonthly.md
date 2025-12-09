# Backend Implementation Guide: Monthly Payment Feature

## Overview
This document outlines all the backend changes required to implement the monthly payment option for products. This feature allows users to pay for rental products on a monthly basis instead of upfront payment, with a minimum tenure of 3 months.

## 1. Database Schema Changes

### 1.1 Product Model Updates
Add the following fields to the Product/AC model:

```javascript
{
  monthlyPaymentEnabled: {
    type: Boolean,
    default: false,
    required: false
  },
  monthlyPrice: {
    type: Number,
    default: null,
    required: false,
    min: 0
  }
}
```

**Location**: Product schema/model file (e.g., `models/Product.js` or `models/AC.js`)

**Validation**:
- `monthlyPrice` should only be required if `monthlyPaymentEnabled` is `true`
- `monthlyPrice` must be greater than 0 if provided
- If `monthlyPaymentEnabled` is `false`, `monthlyPrice` should be `null` or `undefined`

### 1.2 Order Model Updates
Add the following fields to the Order model for order items:

```javascript
{
  items: [{
    // ... existing fields ...
    isMonthlyPayment: {
      type: Boolean,
      default: false
    },
    monthlyPrice: {
      type: Number,
      default: null
    },
    monthlyTenure: {
      type: Number,
      default: null,
      min: 3  // Minimum 3 months
    },
    // ... rest of item fields ...
  }]
}
```

**Location**: Order schema/model file (e.g., `models/Order.js`)

**Notes**:
- `monthlyPrice` and `monthlyTenure` should only be set if `isMonthlyPayment` is `true`
- `monthlyTenure` must be at least 3 months
- The `duration` field should reflect the `monthlyTenure` when `isMonthlyPayment` is `true`

## 2. API Endpoint Changes

### 2.1 Product Creation Endpoint (POST /api/admin/products)
**No changes required** - The endpoint should already accept the new fields from the frontend.

**Validation to add**:
```javascript
// In product creation/update validation middleware
if (req.body.monthlyPaymentEnabled) {
  if (!req.body.monthlyPrice || req.body.monthlyPrice <= 0) {
    return res.status(400).json({
      message: 'Monthly price is required and must be greater than 0 when monthly payment is enabled'
    });
  }
}
```

### 2.2 Product Update Endpoint (PATCH /api/admin/products/:id)
**No changes required** - The endpoint should already accept the new fields.

**Validation to add**: Same as above.

### 2.3 Product Get Endpoints (GET /api/acs, GET /api/acs/:id)
**No changes required** - These endpoints should automatically return the new fields if they exist in the database.

### 2.4 Order Creation Endpoint (POST /api/orders)
**Changes required**:

1. **Accept monthly payment fields in order items**:
```javascript
{
  items: [{
    // ... existing fields ...
    isMonthlyPayment: Boolean,
    monthlyPrice: Number,
    monthlyTenure: Number,
    // ... rest of fields ...
  }]
}
```

2. **Validation**:
```javascript
// Validate monthly payment data
items.forEach((item, index) => {
  if (item.isMonthlyPayment) {
    if (!item.monthlyPrice || item.monthlyPrice <= 0) {
      throw new Error(`Item ${index + 1}: Monthly price is required and must be greater than 0`);
    }
    if (!item.monthlyTenure || item.monthlyTenure < 3) {
      throw new Error(`Item ${index + 1}: Monthly tenure must be at least 3 months`);
    }
    // Set duration to monthlyTenure for consistency
    item.duration = item.monthlyTenure;
  }
});
```

3. **Price Calculation**:
```javascript
// Calculate item price based on payment type
items.forEach(item => {
  if (item.isMonthlyPayment && item.monthlyPrice && item.monthlyTenure) {
    // For monthly payment: monthlyPrice * monthlyTenure
    item.price = item.monthlyPrice * item.monthlyTenure;
  } else {
    // For regular payment: use existing price calculation
    // (item.price should already be set from frontend)
  }
});
```

## 3. Business Logic Requirements

### 3.1 Price Calculation
- **Regular Payment**: Use the existing price structure (price for 3, 6, 9, 11, 12, or 24 months)
- **Monthly Payment**: Calculate as `monthlyPrice × monthlyTenure`
- **Installation Charges**: Should be added to both payment types (one-time charge)

### 3.2 Minimum Tenure Validation
- **Minimum Tenure**: 3 months (enforced on frontend and backend)
- **Maximum Tenure**: Can be flexible (3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24 months as shown in frontend)

### 3.3 Order Processing
When processing orders with monthly payment:
1. Store the monthly payment information in the order
2. Calculate the total amount as `(monthlyPrice × monthlyTenure) + installationCharges`
3. Include payment schedule information (if needed for future monthly payment tracking)

### 3.4 Order Display (Admin/User)
When displaying orders:
- Show "Monthly Payment" badge if `isMonthlyPayment` is `true`
- Display: "₹{monthlyPrice}/month for {monthlyTenure} months"
- Show total as: "₹{monthlyPrice × monthlyTenure} (Monthly Payment)"

## 4. Validation Rules

### 4.1 Product Validation
```javascript
// When creating/updating a product
if (monthlyPaymentEnabled === true) {
  // monthlyPrice is required
  if (!monthlyPrice || monthlyPrice <= 0) {
    throw new Error('Monthly price is required and must be greater than 0');
  }
}

if (monthlyPaymentEnabled === false) {
  // monthlyPrice should be null/undefined
  monthlyPrice = null;
}
```

### 4.2 Order Item Validation
```javascript
// When creating an order
if (item.isMonthlyPayment === true) {
  // Validate monthly payment fields
  if (!item.monthlyPrice || item.monthlyPrice <= 0) {
    throw new Error('Monthly price is required and must be greater than 0');
  }
  if (!item.monthlyTenure || item.monthlyTenure < 3) {
    throw new Error('Monthly tenure must be at least 3 months');
  }
  // Validate that product supports monthly payment
  const product = await Product.findById(item.productId);
  if (!product.monthlyPaymentEnabled) {
    throw new Error('This product does not support monthly payment');
  }
  // Validate monthly price matches product monthly price
  if (product.monthlyPrice !== item.monthlyPrice) {
    throw new Error('Monthly price mismatch with product');
  }
}
```

## 5. Migration Script (Optional)

If you need to add these fields to existing products:

```javascript
// Migration script to add monthly payment fields
db.products.updateMany(
  {},
  {
    $set: {
      monthlyPaymentEnabled: false,
      monthlyPrice: null
    }
  }
);
```

## 6. API Response Examples

### 6.1 Product Response
```json
{
  "_id": "product123",
  "brand": "LG",
  "model": "1.5 Ton Split AC",
  "price": {
    "3": 15000,
    "6": 28000,
    "9": 40000,
    "11": 48000,
    "12": 52000,
    "24": 95000
  },
  "monthlyPaymentEnabled": true,
  "monthlyPrice": 2000,
  // ... other fields
}
```

### 6.2 Order Response
```json
{
  "_id": "order123",
  "orderId": "ORD-2024-001",
  "items": [
    {
      "type": "rental",
      "productId": "product123",
      "price": 6000,
      "duration": 3,
      "isMonthlyPayment": true,
      "monthlyPrice": 2000,
      "monthlyTenure": 3,
      "installationCharges": 0,
      // ... other fields
    }
  ],
  "total": 6000,
  // ... other fields
}
```

## 7. Testing Checklist

- [ ] Create product with monthly payment enabled
- [ ] Create product with monthly payment disabled
- [ ] Update product to enable monthly payment
- [ ] Update product to disable monthly payment
- [ ] Create order with monthly payment item
- [ ] Create order with regular payment item
- [ ] Create order with mixed payment types
- [ ] Validate minimum tenure (3 months)
- [ ] Validate monthly price is required when enabled
- [ ] Validate monthly price matches product monthly price
- [ ] Test order display with monthly payment
- [ ] Test admin order view with monthly payment
- [ ] Test user order view with monthly payment

## 8. Notes

1. **Backward Compatibility**: Existing products without monthly payment fields should work normally (default to `false` and `null`)

2. **Price Consistency**: The monthly payment total (`monthlyPrice × monthlyTenure`) may differ from the regular payment price for the same duration. This is intentional and allows for different pricing strategies.

3. **Future Enhancements**: Consider adding:
   - Monthly payment reminders/notifications
   - Payment schedule tracking
   - Auto-debit functionality
   - Payment history for monthly payments

4. **Security**: Ensure that only admins can enable/disable monthly payment and set monthly prices.

5. **Reporting**: Update admin dashboards to show:
   - Number of orders with monthly payment
   - Total revenue from monthly payments
   - Average monthly payment amount

## 9. Frontend-Backend Contract

The frontend sends the following data structure:

**Product Creation/Update**:
```javascript
{
  // ... existing fields ...
  monthlyPaymentEnabled: Boolean,
  monthlyPrice: Number (if monthlyPaymentEnabled is true)
}
```

**Order Creation**:
```javascript
{
  items: [{
    // ... existing fields ...
    isMonthlyPayment: Boolean,
    monthlyPrice: Number (if isMonthlyPayment is true),
    monthlyTenure: Number (if isMonthlyPayment is true, min: 3),
    duration: Number (should match monthlyTenure if isMonthlyPayment is true),
    price: Number (calculated as monthlyPrice * monthlyTenure if isMonthlyPayment is true)
  }]
}
```

## 10. Error Messages

Use these error messages for consistency:

- `"Monthly price is required and must be greater than 0 when monthly payment is enabled"`
- `"Monthly tenure must be at least 3 months"`
- `"This product does not support monthly payment"`
- `"Monthly price mismatch with product"`
- `"Monthly payment fields are required when isMonthlyPayment is true"`

---

**Implementation Priority**: High
**Estimated Development Time**: 4-6 hours
**Dependencies**: None (can be implemented independently)

