# Backend Update: Monthly Payment with Security Deposit

## Overview

This document outlines all backend changes required to support the new monthly payment feature with security deposit. The key changes include:

1. **Product Model**: Add `securityDeposit` field for products with monthly payment enabled
2. **Order Model**: Store security deposit information in order items
3. **Validation**: Ensure security deposit is required when monthly payment is enabled
4. **Price Calculation**: Update order total calculation to include security deposit for monthly payments
5. **Tenure Validation**: Restrict monthly payment tenure to only: 3, 6, 9, 11, 12, 24 months

---

## 1. Database Schema Changes

### 1.1 Product Model Updates

Add the following field to the Product schema:

```javascript
{
  // ... existing fields ...
  
  // Monthly payment option fields
  monthlyPaymentEnabled: {
    type: Boolean,
    default: false
  },
  monthlyPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  securityDeposit: {
    type: Number,
    default: 0,
    min: 0,
    // Required only if monthlyPaymentEnabled is true
    required: function() {
      return this.monthlyPaymentEnabled === true;
    }
  }
}
```

**Validation Rules:**
- If `monthlyPaymentEnabled` is `true`, `securityDeposit` must be provided and > 0
- If `monthlyPaymentEnabled` is `false`, `securityDeposit` should be 0 or null
- `monthlyPrice` must be > 0 if `monthlyPaymentEnabled` is `true`

### 1.2 Order Model Updates

Update the Order item schema to include security deposit:

```javascript
{
  items: [{
    // ... existing fields ...
    
    // Monthly payment fields
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
      // Valid values: 3, 6, 9, 11, 12, 24
      enum: [3, 6, 9, 11, 12, 24],
      validate: {
        validator: function(value) {
          if (this.isMonthlyPayment) {
            return [3, 6, 9, 11, 12, 24].includes(value);
          }
          return true;
        },
        message: 'Monthly tenure must be one of: 3, 6, 9, 11, 12, 24 months'
      }
    },
    securityDeposit: {
      type: Number,
      default: null,
      min: 0
    },
    
    // Price calculation for monthly payment
    // Total upfront payment = monthlyPrice + securityDeposit + installationCharges
    price: {
      type: Number,
      required: true
      // For monthly payment: price = monthlyPrice + securityDeposit
      // For advance payment: price = price[duration]
    }
  }]
}
```

---

## 2. API Endpoint Changes

### 2.1 POST `/api/products` (Add Product)

**Request Body Updates:**

```json
{
  "category": "AC",
  "name": "Product Name",
  "brand": "Brand Name",
  "model": "Model Name",
  "capacity": "1.5 Ton",
  "type": "Split",
  "price": {
    "3": 3000,
    "6": 5500,
    "9": 8000,
    "11": 10000,
    "12": 12000,
    "24": 22000
  },
  "monthlyPaymentEnabled": true,
  "monthlyPrice": 2000,
  "securityDeposit": 5000,
  // ... other fields ...
}
```

**Validation:**
- If `monthlyPaymentEnabled` is `true`:
  - `monthlyPrice` is required and must be > 0
  - `securityDeposit` is required and must be > 0
- If `monthlyPaymentEnabled` is `false`:
  - `monthlyPrice` and `securityDeposit` should be ignored or set to 0

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "product_id",
    "monthlyPaymentEnabled": true,
    "monthlyPrice": 2000,
    "securityDeposit": 5000,
    // ... other fields ...
  }
}
```

### 2.2 PUT `/api/products/:id` (Update Product)

Same request/response structure as Add Product.

**Validation:**
- When updating, if `monthlyPaymentEnabled` is changed from `false` to `true`, ensure `monthlyPrice` and `securityDeposit` are provided
- When updating, if `monthlyPaymentEnabled` is changed from `true` to `false`, set `monthlyPrice` and `securityDeposit` to 0

### 2.3 GET `/api/acs/:id` (Get Product Details)

**Response Updates:**

```json
{
  "success": true,
  "data": {
    "_id": "product_id",
    "brand": "LG",
    "model": "Model X",
    "price": {
      "3": 3000,
      "6": 5500,
      "9": 8000,
      "11": 10000,
      "12": 12000,
      "24": 22000
    },
    "monthlyPaymentEnabled": true,
    "monthlyPrice": 2000,
    "securityDeposit": 5000,
    // ... other fields ...
  }
}
```

### 2.4 POST `/api/orders` (Create Order)

**Request Body Updates:**

```json
{
  "items": [
    {
      "type": "rental",
      "productId": "product_id",
      "quantity": 1,
      "duration": 12,
      "isMonthlyPayment": true,
      "monthlyPrice": 2000,
      "monthlyTenure": 12,
      "securityDeposit": 5000,
      "price": 7000,  // monthlyPrice (2000) + securityDeposit (5000)
      "installationCharges": 2499
    }
  ],
  "deliveryInfo": {
    // ... delivery info ...
  },
  "paymentInfo": {
    // ... payment info ...
  }
}
```

**Price Calculation Logic:**

```javascript
// For monthly payment items
if (item.isMonthlyPayment && item.monthlyPrice && item.monthlyTenure) {
  // Validate tenure
  const validTenures = [3, 6, 9, 11, 12, 24];
  if (!validTenures.includes(item.monthlyTenure)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid tenure. Must be one of: 3, 6, 9, 11, 12, 24 months'
    });
  }
  
  // Calculate upfront payment: 1 month + security deposit
  item.price = item.monthlyPrice + (item.securityDeposit || 0);
  
  // Add installation charges if applicable
  if (item.installationCharges && item.installationCharges.amount) {
    item.price += item.installationCharges.amount;
  }
}

// For advance payment items
else {
  // Use existing logic: price[duration]
  const duration = item.duration || item.selectedDuration || 3;
  item.price = product.price[duration] || product.price['3'] || 0;
  
  // Add installation charges if applicable
  if (item.installationCharges && item.installationCharges.amount) {
    item.price += item.installationCharges.amount;
  }
}
```

**Validation Rules:**
1. If `isMonthlyPayment` is `true`:
   - `monthlyPrice` is required and must be > 0
   - `monthlyTenure` is required and must be one of: 3, 6, 9, 11, 12, 24
   - `securityDeposit` is required and must be > 0
   - `price` should equal `monthlyPrice + securityDeposit + installationCharges`

2. If `isMonthlyPayment` is `false`:
   - `duration` is required and must be one of: 3, 6, 9, 11, 12, 24
   - `price` should equal `product.price[duration] + installationCharges`

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "order_id",
    "items": [
      {
        "type": "rental",
        "productId": "product_id",
        "isMonthlyPayment": true,
        "monthlyPrice": 2000,
        "monthlyTenure": 12,
        "securityDeposit": 5000,
        "price": 7000,
        "installationCharges": 2499
      }
    ],
    "totalAmount": 9499,
    // ... other fields ...
  }
}
```

### 2.5 GET `/api/orders/:id` (Get Order Details)

**Response Updates:**

Include all monthly payment fields in the response:

```json
{
  "success": true,
  "data": {
    "_id": "order_id",
    "items": [
      {
        "type": "rental",
        "productId": "product_id",
        "isMonthlyPayment": true,
        "monthlyPrice": 2000,
        "monthlyTenure": 12,
        "securityDeposit": 5000,
        "price": 7000,
        "installationCharges": 2499,
        // ... other fields ...
      }
    ],
    "totalAmount": 9499,
    // ... other fields ...
  }
}
```

---

## 3. Validation Functions

### 3.1 Product Validation

```javascript
// In product model or validation middleware
function validateMonthlyPayment(product) {
  if (product.monthlyPaymentEnabled) {
    if (!product.monthlyPrice || product.monthlyPrice <= 0) {
      throw new Error('monthlyPrice is required and must be greater than 0 when monthlyPaymentEnabled is true');
    }
    if (!product.securityDeposit || product.securityDeposit <= 0) {
      throw new Error('securityDeposit is required and must be greater than 0 when monthlyPaymentEnabled is true');
    }
  } else {
    // Reset to default values if disabled
    product.monthlyPrice = 0;
    product.securityDeposit = 0;
  }
  return product;
}
```

### 3.2 Order Item Validation

```javascript
// In order validation middleware
function validateOrderItem(item, product) {
  const validTenures = [3, 6, 9, 11, 12, 24];
  
  if (item.isMonthlyPayment) {
    // Validate monthly payment fields
    if (!item.monthlyPrice || item.monthlyPrice <= 0) {
      throw new Error('monthlyPrice is required for monthly payment items');
    }
    
    if (!item.monthlyTenure || !validTenures.includes(item.monthlyTenure)) {
      throw new Error('monthlyTenure must be one of: 3, 6, 9, 11, 12, 24 months');
    }
    
    if (!item.securityDeposit || item.securityDeposit <= 0) {
      throw new Error('securityDeposit is required for monthly payment items');
    }
    
    // Validate product has monthly payment enabled
    if (!product.monthlyPaymentEnabled) {
      throw new Error('Product does not support monthly payment');
    }
    
    // Validate monthly price matches product
    if (item.monthlyPrice !== product.monthlyPrice) {
      throw new Error('Monthly price does not match product monthly price');
    }
    
    // Validate security deposit matches product
    if (item.securityDeposit !== product.securityDeposit) {
      throw new Error('Security deposit does not match product security deposit');
    }
    
    // Calculate and validate price
    const expectedPrice = item.monthlyPrice + item.securityDeposit;
    const installationCharge = (item.installationCharges?.amount || 0);
    const expectedTotal = expectedPrice + installationCharge;
    
    if (item.price !== expectedTotal) {
      throw new Error(`Price mismatch. Expected: ${expectedTotal}, Got: ${item.price}`);
    }
  } else {
    // Validate advance payment
    if (!item.duration || !validTenures.includes(item.duration)) {
      throw new Error('duration must be one of: 3, 6, 9, 11, 12, 24 months');
    }
    
    // Validate price matches product price for duration
    const expectedPrice = product.price[item.duration] || product.price['3'] || 0;
    const installationCharge = (item.installationCharges?.amount || 0);
    const expectedTotal = expectedPrice + installationCharge;
    
    if (item.price !== expectedTotal) {
      throw new Error(`Price mismatch. Expected: ${expectedTotal}, Got: ${item.price}`);
    }
  }
  
  return item;
}
```

---

## 4. Business Logic Updates

### 4.1 Order Total Calculation

```javascript
// In order creation/update logic
function calculateOrderTotal(items) {
  return items.reduce((total, item) => {
    let itemTotal = 0;
    
    if (item.isMonthlyPayment && item.monthlyPrice && item.monthlyTenure) {
      // Monthly payment: 1 month charge + security deposit
      itemTotal = item.monthlyPrice + (item.securityDeposit || 0);
    } else {
      // Advance payment: use price from product
      itemTotal = item.price || 0;
    }
    
    // Add installation charges if applicable
    if (item.installationCharges && item.installationCharges.amount) {
      itemTotal += item.installationCharges.amount;
    }
    
    return total + itemTotal;
  }, 0);
}
```

### 4.2 Product Price Retrieval

```javascript
// Helper function to get product price based on payment type
function getProductPrice(product, paymentType, duration) {
  const validTenures = [3, 6, 9, 11, 12, 24];
  
  if (paymentType === 'monthly' && product.monthlyPaymentEnabled) {
    // Validate tenure
    if (!validTenures.includes(duration)) {
      throw new Error('Invalid tenure for monthly payment. Must be one of: 3, 6, 9, 11, 12, 24');
    }
    
    // Return monthly price + security deposit
    return {
      monthlyPrice: product.monthlyPrice,
      securityDeposit: product.securityDeposit,
      totalUpfront: product.monthlyPrice + product.securityDeposit,
      tenure: duration
    };
  } else {
    // Advance payment
    if (!validTenures.includes(duration)) {
      throw new Error('Invalid tenure. Must be one of: 3, 6, 9, 11, 12, 24');
    }
    
    return {
      totalPrice: product.price[duration] || product.price['3'] || 0,
      tenure: duration
    };
  }
}
```

---

## 5. Migration Script

If you need to migrate existing products, use this script:

```javascript
// Migration script to add securityDeposit to existing products
async function migrateProducts() {
  const products = await Product.find({ monthlyPaymentEnabled: true });
  
  for (const product of products) {
    // Set default security deposit if not set
    if (!product.securityDeposit || product.securityDeposit === 0) {
      // Calculate as 2-3 months of monthly price (adjust as needed)
      product.securityDeposit = product.monthlyPrice * 2.5;
      await product.save();
      console.log(`Updated product ${product._id} with security deposit: ${product.securityDeposit}`);
    }
  }
  
  console.log('Migration completed');
}
```

---

## 6. API Response Examples

### 6.1 Get Product with Monthly Payment

**Request:**
```
GET /api/acs/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "product_id",
    "brand": "LG",
    "model": "1.5 Ton Split AC",
    "category": "AC",
    "price": {
      "3": 9000,
      "6": 16000,
      "9": 23000,
      "11": 28000,
      "12": 30000,
      "24": 55000
    },
    "monthlyPaymentEnabled": true,
    "monthlyPrice": 2500,
    "securityDeposit": 5000,
    "status": "Available",
    "images": ["url1", "url2"]
  }
}
```

### 6.2 Create Order with Monthly Payment

**Request:**
```
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "type": "rental",
      "productId": "product_id",
      "quantity": 1,
      "isMonthlyPayment": true,
      "monthlyPrice": 2500,
      "monthlyTenure": 12,
      "securityDeposit": 5000,
      "price": 7500,
      "installationCharges": {
        "amount": 2499
      }
    }
  ],
  "deliveryInfo": {
    "address": "123 Main St",
    "pincode": "400001",
    "contactName": "John Doe",
    "contactPhone": "+919999999999"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "order_id",
    "userId": "user_id",
    "items": [
      {
        "type": "rental",
        "productId": "product_id",
        "isMonthlyPayment": true,
        "monthlyPrice": 2500,
        "monthlyTenure": 12,
        "securityDeposit": 5000,
        "price": 7500,
        "installationCharges": {
          "amount": 2499
        }
      }
    ],
    "totalAmount": 9999,
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 7. Error Handling

### 7.1 Validation Errors

```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "securityDeposit",
      "message": "securityDeposit is required when monthlyPaymentEnabled is true"
    }
  ]
}
```

### 7.2 Invalid Tenure Error

```json
{
  "success": false,
  "message": "Invalid tenure. Must be one of: 3, 6, 9, 11, 12, 24 months"
}
```

### 7.3 Monthly Payment Not Enabled Error

```json
{
  "success": false,
  "message": "Product does not support monthly payment"
}
```

---

## 8. Testing Checklist

### 8.1 Product Management

- [ ] Create product with monthly payment enabled (with security deposit)
- [ ] Create product with monthly payment enabled (without security deposit) - should fail
- [ ] Create product with monthly payment disabled
- [ ] Update product to enable monthly payment (add security deposit)
- [ ] Update product to disable monthly payment (remove security deposit)
- [ ] Update monthly price and security deposit
- [ ] Get product details - verify monthly payment fields are returned

### 8.2 Order Creation

- [ ] Create order with monthly payment (valid tenure: 3, 6, 9, 11, 12, 24)
- [ ] Create order with monthly payment (invalid tenure: 4, 5, 7, 8, 10, 18) - should fail
- [ ] Create order with monthly payment (missing security deposit) - should fail
- [ ] Create order with advance payment (valid tenure)
- [ ] Verify order total calculation for monthly payment
- [ ] Verify order total calculation for advance payment
- [ ] Create order with installation charges + monthly payment
- [ ] Create order with installation charges + advance payment

### 8.3 Order Retrieval

- [ ] Get order details - verify monthly payment fields are returned
- [ ] Get order list - verify monthly payment fields are included
- [ ] Get user orders - verify monthly payment information

### 8.4 Edge Cases

- [ ] Product with monthly payment enabled but monthlyPrice = 0 - should fail
- [ ] Product with monthly payment enabled but securityDeposit = 0 - should fail
- [ ] Order with monthly payment but product doesn't support it - should fail
- [ ] Order with mismatched monthly price - should fail
- [ ] Order with mismatched security deposit - should fail
- [ ] Order with price calculation mismatch - should fail

---

## 9. Important Notes

1. **Security Deposit**: 
   - Only required for monthly payment option
   - Not applicable for advance payment
   - Should be stored in both product and order item

2. **Tenure Validation**:
   - Monthly payment: Only 3, 6, 9, 11, 12, 24 months allowed
   - Advance payment: Only 3, 6, 9, 11, 12, 24 months allowed
   - Both payment types use the same valid tenure list

3. **Price Calculation**:
   - Monthly payment upfront: `monthlyPrice + securityDeposit + installationCharges`
   - Advance payment: `price[duration] + installationCharges`
   - Monthly payment does NOT multiply monthlyPrice by tenure for upfront payment

4. **Backward Compatibility**:
   - Existing products without monthly payment will continue to work
   - Existing orders without monthly payment fields will continue to work
   - Add default values for securityDeposit in queries if needed

5. **Data Integrity**:
   - Always validate that securityDeposit matches product.securityDeposit when creating orders
   - Always validate that monthlyPrice matches product.monthlyPrice when creating orders
   - Always validate tenure is in the allowed list

---

## 10. Database Indexes (Optional but Recommended)

```javascript
// Add indexes for better query performance
ProductSchema.index({ monthlyPaymentEnabled: 1 });
ProductSchema.index({ monthlyPaymentEnabled: 1, monthlyPrice: 1 });
OrderSchema.index({ 'items.isMonthlyPayment': 1 });
```

---

## Summary

The backend needs to:

1. ✅ Add `securityDeposit` field to Product model
2. ✅ Add `securityDeposit` field to Order item model
3. ✅ Validate security deposit is required when monthly payment is enabled
4. ✅ Restrict tenure to [3, 6, 9, 11, 12, 24] for both payment types
5. ✅ Update price calculation: Monthly payment = monthlyPrice + securityDeposit
6. ✅ Validate order items match product monthly payment settings
7. ✅ Return security deposit in all product and order API responses
8. ✅ Handle edge cases and validation errors properly

All changes maintain backward compatibility with existing products and orders.

