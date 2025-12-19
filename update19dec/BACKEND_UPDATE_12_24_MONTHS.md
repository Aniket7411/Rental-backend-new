# Backend Update: 12 and 24 Months Rental Duration Support

## Overview
This document provides precise backend changes required to support the new rental duration options (12 and 24 months) that have been added to the frontend.

**Frontend Status**: ✅ Complete
- Admin Add Product Form: Updated
- Vendor Add Product Form: Updated  
- Admin Edit Product Form: Updated
- Product Detail Page: Already supports 12 and 24 months selection

**Backend Status**: ⚠️ Required Updates

---

## 1. Product Schema Updates

### 1.1 Price Object Schema
The `price` object in product documents must now support 12 and 24 months.

**Current Schema (Before):**
```json
{
  "price": {
    "3": 3000,
    "6": 5500,
    "9": 8000,
    "11": 10000
  }
}
```

**Updated Schema (After):**
```json
{
  "price": {
    "3": 3000,
    "6": 5500,
    "9": 8000,
    "11": 10000,
    "12": 11000,    // NEW - Required
    "24": 20000     // NEW - Required
  }
}
```

### 1.2 Database Schema Changes

#### MongoDB (NoSQL)
- **No schema migration required** if using flexible schema
- Update validation to ensure `price.12` and `price.24` are present
- Make fields required for new products, optional for existing (backward compatibility)

#### SQL Database
If using SQL with JSON column:
- No schema change needed
- Update validation logic

If using separate columns:
- Add columns: `price_12` (DECIMAL/NUMBER) and `price_24` (DECIMAL/NUMBER)
- Migration script:
```sql
ALTER TABLE products 
ADD COLUMN price_12 DECIMAL(10,2) NULL,
ADD COLUMN price_24 DECIMAL(10,2) NULL;
```

---

## 2. API Endpoint Updates

### 2.1 Create Product Endpoint

**Endpoint**: `POST /api/admin/products` or `POST /api/admin/acs`

**Request Body Update:**
```json
{
  "name": "Product Name",
  "brand": "Brand Name",
  "category": "AC",
  "capacity": "1.5 Ton",
  "type": "Split",
  "location": "Mumbai",
  "price": {
    "3": 3000,
    "6": 5500,
    "9": 8000,
    "11": 10000,
    "12": 11000,    // NEW - Required
    "24": 20000     // NEW - Required
  },
  "status": "Available"
}
```

**Validation Rules:**
```javascript
// Pseudo-code validation
const validDurations = [3, 6, 9, 11, 12, 24];
const price = req.body.price;

// Check all required durations are present
for (const duration of validDurations) {
  if (!price[duration] || price[duration] <= 0) {
    return res.status(400).json({
      success: false,
      message: `Price for ${duration} months is required and must be greater than 0`
    });
  }
}

// Optional: Validate price consistency
if (price[12] < price[11]) {
  return res.status(400).json({
    success: false,
    message: "12 months price should be greater than or equal to 11 months price"
  });
}

if (price[24] < price[12] * 1.5) {
  // Warning: 24 months should offer better value
  console.warn("24 months price may not offer sufficient discount");
}
```

### 2.2 Update Product Endpoint

**Endpoint**: `PATCH /api/admin/products/:id` or `PATCH /api/admin/acs/:id`

**Request Body:**
```json
{
  "price": {
    "12": 11000,    // Can update individually
    "24": 20000     // Can update individually
  }
}
```

**Implementation:**
- Support partial updates (only update provided price fields)
- Validate that updated prices are positive numbers
- Allow updating existing products to add 12/24 months pricing

### 2.3 Get Product Endpoint

**Endpoint**: `GET /api/products/:id` or `GET /api/acs/:id`

**Response Update:**
```json
{
  "success": true,
  "data": {
    "_id": "product_id",
    "name": "Product Name",
    "brand": "Brand Name",
    "price": {
      "3": 3000,
      "6": 5500,
      "9": 8000,
      "11": 10000,
      "12": 11000,    // NEW - Must be included
      "24": 20000     // NEW - Must be included
    }
  }
}
```

**Backward Compatibility:**
- If product doesn't have 12/24 months pricing, return `null` or `0`
- Frontend should handle missing prices gracefully

### 2.4 List Products Endpoint

**Endpoint**: `GET /api/products` or `GET /api/acs`

**Response Update:**
- All products in response must include `price.12` and `price.24`
- If missing, return `null` or `0` for backward compatibility

**Filter Update:**
- Duration filter should accept: `3`, `6`, `9`, `11`, `12`, `24`
- Support multiple durations: `?duration=3,6,12,24`

**Example Query:**
```
GET /api/acs?category=AC&duration=12
GET /api/acs?category=AC&duration=3,6,12,24
```

**Backend Filter Logic:**
```javascript
// Pseudo-code
if (req.query.duration) {
  const durations = req.query.duration.split(',').map(Number);
  const validDurations = [3, 6, 9, 11, 12, 24];
  
  // Validate durations
  const invalidDurations = durations.filter(d => !validDurations.includes(d));
  if (invalidDurations.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Invalid duration(s): ${invalidDurations.join(', ')}. Allowed: ${validDurations.join(', ')}`
    });
  }
  
  // Filter products that have prices for at least one of the requested durations
  query.$or = durations.map(d => ({
    [`price.${d}`]: { $exists: true, $ne: null, $gt: 0 }
  }));
}
```

---

## 3. Order Creation Endpoint

**Endpoint**: `POST /api/orders`

### 3.1 Request Body Update

**Current Request:**
```json
{
  "items": [
    {
      "type": "rental",
      "productId": "product_id",
      "selectedDuration": 3,  // or 6, 9, 11
      "price": 3000
    }
  ]
}
```

**Updated Request:**
```json
{
  "items": [
    {
      "type": "rental",
      "productId": "product_id",
      "selectedDuration": 12,  // Now accepts: 3, 6, 9, 11, 12, 24
      "price": 11000
    }
  ]
}
```

### 3.2 Validation Rules

```javascript
// Pseudo-code validation
const validDurations = [3, 6, 9, 11, 12, 24];

for (const item of req.body.items) {
  if (item.type === 'rental') {
    // Validate duration
    if (!validDurations.includes(item.selectedDuration)) {
      return res.status(400).json({
        success: false,
        message: `Invalid duration: ${item.selectedDuration}. Allowed values: ${validDurations.join(', ')}`
      });
    }
    
    // Fetch product to validate price
    const product = await Product.findById(item.productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    
    // Validate price matches product price for selected duration
    const expectedPrice = product.price[item.selectedDuration];
    if (!expectedPrice || expectedPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: `Price for ${item.selectedDuration} months is not available for this product`
      });
    }
    
    if (item.price !== expectedPrice) {
      return res.status(400).json({
        success: false,
        message: `Price mismatch. Expected: ${expectedPrice}, Received: ${item.price}`
      });
    }
  }
}
```

### 3.3 Order Document Update

**Order Schema:**
```json
{
  "_id": "order_id",
  "userId": "user_id",
  "items": [
    {
      "type": "rental",
      "productId": "product_id",
      "selectedDuration": 12,  // Can now be 12 or 24
      "price": 11000,
      "rentalDuration": 12     // Store duration in months
    }
  ],
  "total": 11000,
  "status": "pending"
}
```

---

## 4. Coupon Validation (If Applicable)

**Endpoint**: `POST /api/coupons/validate`

**Update**: Ensure coupon validation accepts 12 and 24 months durations

**Request Body:**
```json
{
  "code": "COUPON123",
  "orderTotal": 11000,
  "items": [
    {
      "type": "rental",
      "category": "AC",
      "duration": 12  // Now accepts 12 and 24
    }
  ]
}
```

**Validation:**
- Update duration validation to include 12 and 24
- Ensure coupon rules (if duration-specific) work with new durations

---

## 5. Data Migration

### 5.1 Existing Products Without 12/24 Months Pricing

**Option 1: Calculate Automatically (Recommended)**
```javascript
// Migration script pseudo-code
const products = await Product.find({
  $or: [
    { 'price.12': { $exists: false } },
    { 'price.12': null },
    { 'price.24': { $exists: false } },
    { 'price.24': null }
  ]
});

for (const product of products) {
  // Calculate 12 months price (10% increase from 11 months)
  if (!product.price[12] || product.price[12] <= 0) {
    product.price[12] = Math.round(product.price[11] * 1.1);
  }
  
  // Calculate 24 months price (80% of 12 months * 2, offering discount)
  if (!product.price[24] || product.price[24] <= 0) {
    product.price[24] = Math.round(product.price[12] * 1.8);
  }
  
  await product.save();
}
```

**Option 2: Set Default Values**
```javascript
// Set 12 months = 11 months price
product.price[12] = product.price[11];

// Set 24 months = 11 months * 2
product.price[24] = product.price[11] * 2;
```

**Option 3: Leave Null (Not Recommended)**
- Allow null values
- Frontend will handle missing prices
- Admin/Vendor must update manually

### 5.2 Migration Script Example (MongoDB)

```javascript
// migration/add-12-24-months-pricing.js
const mongoose = require('mongoose');
const Product = require('./models/Product'); // Adjust path

async function migratePrices() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const products = await Product.find({
      $or: [
        { 'price.12': { $exists: false } },
        { 'price.12': null },
        { 'price.24': { $exists: false } },
        { 'price.24': null }
      ]
    });
    
    console.log(`Found ${products.length} products to update`);
    
    let updated = 0;
    for (const product of products) {
      const hasPrice11 = product.price && product.price[11] && product.price[11] > 0;
      
      if (hasPrice11) {
        // Calculate 12 months (10% increase)
        if (!product.price[12] || product.price[12] <= 0) {
          product.price[12] = Math.round(product.price[11] * 1.1);
        }
        
        // Calculate 24 months (80% of 12 months * 2)
        if (!product.price[24] || product.price[24] <= 0) {
          product.price[24] = Math.round(product.price[12] * 1.8);
        }
        
        await product.save();
        updated++;
        console.log(`Updated product: ${product.name || product._id}`);
      } else {
        console.warn(`Product ${product._id} missing 11 months price, skipping`);
      }
    }
    
    console.log(`Migration complete. Updated ${updated} products`);
    await mongoose.disconnect();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migratePrices();
```

---

## 6. Validation Rules Summary

### 6.1 Price Validation

```javascript
const validatePrice = (price) => {
  const validDurations = [3, 6, 9, 11, 12, 24];
  
  // Check all durations are present
  for (const duration of validDurations) {
    if (!price[duration] || price[duration] <= 0) {
      throw new Error(`Price for ${duration} months is required and must be greater than 0`);
    }
    
    // Type validation
    if (typeof price[duration] !== 'number') {
      throw new Error(`Price for ${duration} months must be a number`);
    }
  }
  
  // Price consistency checks (optional but recommended)
  if (price[6] < price[3] * 1.5) {
    console.warn('6 months price may not offer sufficient discount');
  }
  
  if (price[12] < price[11]) {
    throw new Error('12 months price should be greater than or equal to 11 months price');
  }
  
  if (price[24] < price[12] * 1.5) {
    console.warn('24 months price may not offer sufficient discount');
  }
  
  return true;
};
```

### 6.2 Duration Validation

```javascript
const validDurations = [3, 6, 9, 11, 12, 24];

const validateDuration = (duration) => {
  if (!validDurations.includes(duration)) {
    throw new Error(
      `Invalid duration: ${duration}. Allowed values: ${validDurations.join(', ')}`
    );
  }
  return true;
};
```

---

## 7. Error Responses

### 7.1 Invalid Duration
```json
{
  "success": false,
  "message": "Invalid duration: 15. Allowed values: 3, 6, 9, 11, 12, 24",
  "error": "VALIDATION_ERROR",
  "code": "INVALID_DURATION"
}
```

### 7.2 Missing Price
```json
{
  "success": false,
  "message": "Price for selected duration (12 months) is not available for this product",
  "error": "PRICE_NOT_AVAILABLE",
  "code": "MISSING_PRICE"
}
```

### 7.3 Price Mismatch
```json
{
  "success": false,
  "message": "Price mismatch. Expected: 11000, Received: 10000",
  "error": "PRICE_MISMATCH",
  "code": "INVALID_PRICE"
}
```

---

## 8. Testing Checklist

### 8.1 Product Management
- [ ] Create product with all 6 duration prices (3, 6, 9, 11, 12, 24)
- [ ] Create product missing 12 or 24 months price (should fail)
- [ ] Update existing product to add 12 and 24 months pricing
- [ ] Update product to modify 12 or 24 months price
- [ ] Get product and verify all 6 prices are returned
- [ ] List products and verify all prices are included

### 8.2 Order Management
- [ ] Create order with 12 months duration
- [ ] Create order with 24 months duration
- [ ] Create order with invalid duration (should fail)
- [ ] Create order with price mismatch (should fail)
- [ ] Create order for product without 12/24 months price (should fail)

### 8.3 Filtering
- [ ] Filter products by duration=12
- [ ] Filter products by duration=24
- [ ] Filter products by duration=3,6,12,24
- [ ] Filter with invalid duration (should fail)

### 8.4 Backward Compatibility
- [ ] Existing products without 12/24 months pricing (should return null/0)
- [ ] Old orders with 3, 6, 9, 11 months (should still work)
- [ ] API responses include all 6 prices even if some are null

### 8.5 Coupon Validation
- [ ] Validate coupon with 12 months duration
- [ ] Validate coupon with 24 months duration
- [ ] Coupon rules work correctly with new durations

---

## 9. Implementation Priority

### High Priority (Must Have)
1. ✅ Update product creation endpoint validation
2. ✅ Update product update endpoint to accept 12/24 months
3. ✅ Update order creation endpoint to accept 12/24 months
4. ✅ Update product GET endpoints to return 12/24 months prices
5. ✅ Update filter endpoint to support 12/24 months filtering

### Medium Priority (Should Have)
6. ⚠️ Add data migration script for existing products
7. ⚠️ Update coupon validation for new durations
8. ⚠️ Add price consistency validation

### Low Priority (Nice to Have)
9. 📝 Add analytics tracking for new duration selections
10. 📝 Add price recommendation logic
11. 📝 Add bulk update endpoint for pricing

---

## 10. Files to Update (Backend)

Based on typical backend structure, update these files:

### Product Model/Schema
- `models/Product.js` or `models/AC.js`
- Update schema validation for price object

### Product Controllers
- `controllers/productController.js` or `controllers/acController.js`
- Update create, update, get, list methods

### Product Routes
- `routes/productRoutes.js` or `routes/acRoutes.js`
- Update validation middleware

### Order Controllers
- `controllers/orderController.js`
- Update order creation validation

### Order Routes
- `routes/orderRoutes.js`
- Update validation middleware

### Coupon Controllers (if applicable)
- `controllers/couponController.js`
- Update coupon validation logic

### Validation Middleware
- `middleware/validation.js` or `validators/productValidator.js`
- Add duration and price validation rules

---

## 11. Example Code Snippets

### 11.1 Product Model (MongoDB/Mongoose)

```javascript
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  brand: { type: String, required: true },
  category: { type: String, required: true },
  price: {
    type: {
      3: { type: Number, required: true, min: 0 },
      6: { type: Number, required: true, min: 0 },
      9: { type: Number, required: true, min: 0 },
      11: { type: Number, required: true, min: 0 },
      12: { type: Number, required: true, min: 0 },  // NEW
      24: { type: Number, required: true, min: 0 }   // NEW
    },
    required: true
  },
  // ... other fields
});

// Custom validation
productSchema.pre('save', function(next) {
  const price = this.price;
  const validDurations = [3, 6, 9, 11, 12, 24];
  
  for (const duration of validDurations) {
    if (!price[duration] || price[duration] <= 0) {
      return next(new Error(`Price for ${duration} months is required`));
    }
  }
  
  // Optional: Price consistency check
  if (price[12] < price[11]) {
    return next(new Error('12 months price should be >= 11 months price'));
  }
  
  next();
});
```

### 11.2 Product Controller (Create)

```javascript
const createProduct = async (req, res) => {
  try {
    const { price } = req.body;
    
    // Validate all required durations
    const validDurations = [3, 6, 9, 11, 12, 24];
    for (const duration of validDurations) {
      if (!price[duration] || price[duration] <= 0) {
        return res.status(400).json({
          success: false,
          message: `Price for ${duration} months is required and must be greater than 0`
        });
      }
    }
    
    // Create product
    const product = await Product.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
```

### 11.3 Order Controller (Create)

```javascript
const createOrder = async (req, res) => {
  try {
    const { items } = req.body;
    const validDurations = [3, 6, 9, 11, 12, 24];
    
    for (const item of items) {
      if (item.type === 'rental') {
        // Validate duration
        if (!validDurations.includes(item.selectedDuration)) {
          return res.status(400).json({
            success: false,
            message: `Invalid duration: ${item.selectedDuration}. Allowed: ${validDurations.join(', ')}`
          });
        }
        
        // Validate price
        const product = await Product.findById(item.productId);
        if (!product) {
          return res.status(404).json({
            success: false,
            message: 'Product not found'
          });
        }
        
        const expectedPrice = product.price[item.selectedDuration];
        if (!expectedPrice || expectedPrice <= 0) {
          return res.status(400).json({
            success: false,
            message: `Price for ${item.selectedDuration} months is not available`
          });
        }
        
        if (item.price !== expectedPrice) {
          return res.status(400).json({
            success: false,
            message: `Price mismatch. Expected: ${expectedPrice}`
          });
        }
      }
    }
    
    // Create order
    const order = await Order.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
```

---

## 12. API Documentation Updates

Update your API documentation (Swagger/OpenAPI/Postman) to reflect:

1. **Product Price Schema**: Include 12 and 24 months in examples
2. **Order Duration**: Update allowed values to include 12 and 24
3. **Filter Parameters**: Update duration filter to accept 12 and 24
4. **Error Responses**: Add new error codes for invalid duration/price

---

## 13. Deployment Checklist

Before deploying to production:

- [ ] Run data migration script on staging
- [ ] Test all endpoints with 12 and 24 months
- [ ] Verify backward compatibility with existing products
- [ ] Update API documentation
- [ ] Update Postman collection (if applicable)
- [ ] Test order creation with new durations
- [ ] Test coupon validation with new durations
- [ ] Monitor error logs for validation issues
- [ ] Set up alerts for missing price errors

---

## 14. Rollback Plan

If issues occur:

1. **Frontend**: Already supports backward compatibility (handles missing prices)
2. **Backend**: Make 12/24 months prices optional temporarily
3. **Database**: No schema changes required (flexible schema)
4. **Orders**: Existing orders with 3, 6, 9, 11 months will continue to work

---

## 15. Contact & Support

For questions or issues:
- Frontend implementation: See `src/pages/admin/AddAC.js`, `src/pages/vendor/AddAC.js`
- API endpoints: See `src/services/api.js`
- Product detail page: See `src/pages/ACDetail.js`

---

**Last Updated**: 2024-12-19
**Version**: 1.0
**Status**: Ready for Implementation

