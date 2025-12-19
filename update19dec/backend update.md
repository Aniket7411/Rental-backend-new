# Backend Update Documentation

## Overview
This document outlines the backend changes required to support the new rental duration options (12 and 24 months) and updated filter options in the frontend.

---

## 1. Rental Duration Options Update

### Current Implementation
- **Previous Options**: 3, 6, 9, 11 months
- **New Options**: 3, 6, 9, 11, 12, 24 months

### Required Backend Changes

#### 1.1 Product Price Schema Update
The product price object needs to support 12 and 24 months pricing.

**Current Schema:**
```json
{
  "price": {
    "3": 1000,
    "6": 2500,
    "9": 4000,
    "11": 5000
  }
}
```

**Updated Schema:**
```json
{
  "price": {
    "3": 1000,
    "6": 2500,
    "9": 4000,
    "11": 5000,
    "12": 5500,
    "24": 10000
  }
}
```

#### 1.2 Database Schema Changes
If using MongoDB or similar NoSQL database:
- No schema changes required if using flexible schema
- Ensure validation allows keys: `3`, `6`, `9`, `11`, `12`, `24`

If using SQL database:
- Update price table to include `price_12` and `price_24` columns
- Or maintain JSON column with updated validation

#### 1.3 API Endpoints to Update

**1. Create Product Endpoint** (`POST /api/products` or `/api/acs`)
- Update validation to accept `price.12` and `price.24`
- Make these fields optional (for backward compatibility)

**2. Update Product Endpoint** (`PUT /api/products/:id` or `/api/acs/:id`)
- Allow updating `price.12` and `price.24`
- Support partial updates

**3. Get Product Endpoint** (`GET /api/products/:id` or `/api/acs/:id`)
- Ensure response includes all price options (3, 6, 9, 11, 12, 24)
- Return `null` or `0` for missing price options

**4. List Products Endpoint** (`GET /api/products` or `/api/acs`)
- Return all price options in product objects
- Support filtering by duration (add 12 and 24 to filter options)

#### 1.4 Order Creation Endpoint
**Endpoint**: `POST /api/orders`

**Current Request Body:**
```json
{
  "items": [
    {
      "type": "rental",
      "productId": "123",
      "duration": 3,  // or 6, 9, 11
      "price": 1000
    }
  ]
}
```

**Updated Request Body:**
```json
{
  "items": [
    {
      "type": "rental",
      "productId": "123",
      "duration": 12,  // Now accepts: 3, 6, 9, 11, 12, 24
      "price": 5500
    }
  ]
}
```

**Validation Required:**
- Accept duration values: `3`, `6`, `9`, `11`, `12`, `24`
- Validate that the price matches the product's price for the selected duration
- Return error if invalid duration is provided

---

## 2. Filter Options Update

### 2.1 Browse/Filter Endpoint
**Endpoint**: `GET /api/products` or `GET /api/acs`

**Current Query Parameters:**
```
?category=AC&brand=LG&duration=3
```

**Updated Query Parameters:**
- Duration filter should accept: `3`, `6`, `9`, `11`, `12`, `24`
- Support multiple duration values: `?duration=3,6,12`

**Example:**
```
GET /api/acs?category=AC&duration=12
GET /api/acs?category=AC&duration=3,6,12,24
```

**Backend Implementation:**
```javascript
// Pseudo-code
if (req.query.duration) {
  const durations = req.query.duration.split(',').map(Number);
  // Validate durations are in [3, 6, 9, 11, 12, 24]
  // Filter products that have prices for at least one of these durations
}
```

---

## 3. Admin/Vendor Product Management

### 3.1 Add Product Form
**Endpoints**: 
- `POST /api/admin/products` (Admin)
- `POST /api/vendor/products` (Vendor)

**Required Updates:**
- Add input fields for 12 months and 24 months pricing
- Update validation to require or make optional these fields
- Update form validation rules

**Request Body:**
```json
{
  "name": "Product Name",
  "brand": "Brand Name",
  "category": "AC",
  "price": {
    "3": 1000,
    "6": 2500,
    "9": 4000,
    "11": 5000,
    "12": 5500,    // NEW
    "24": 10000    // NEW
  }
}
```

### 3.2 Edit Product Form
**Endpoints**:
- `PUT /api/admin/products/:id`
- `PUT /api/vendor/products/:id`

**Required Updates:**
- Allow updating 12 and 24 months pricing
- Support partial updates (only update provided fields)

---

## 4. Data Migration (If Required)

### 4.1 Existing Products
If you have existing products without 12 and 24 months pricing:

**Option 1: Calculate Automatically**
- Calculate 12 months price based on 11 months price (e.g., 11 months * 1.1)
- Calculate 24 months price based on 12 months price (e.g., 12 months * 1.8)

**Option 2: Set Default Values**
- Set 12 months = 11 months price (same as 11 months)
- Set 24 months = 11 months price * 2

**Option 3: Leave Null**
- Allow null values and handle in frontend
- Admin/Vendor can update later

### 4.2 Migration Script Example
```javascript
// Pseudo-code for migration
db.products.find({}).forEach(product => {
  if (!product.price[12]) {
    product.price[12] = product.price[11] * 1.1; // 10% increase
  }
  if (!product.price[24]) {
    product.price[24] = product.price[12] * 1.8; // 80% of 12 months
  }
  db.products.save(product);
});
```

---

## 5. Validation Rules

### 5.1 Price Validation
- All duration prices must be positive numbers
- 12 months price should typically be >= 11 months price
- 24 months price should typically be >= 12 months price * 1.5 (better value for longer commitment)
- Validate price consistency (longer duration should offer better value per month)

### 5.2 Duration Validation
- Accept only: `3`, `6`, `9`, `11`, `12`, `24`
- Reject any other values
- Return clear error messages

---

## 6. API Response Examples

### 6.1 Product Response
```json
{
  "success": true,
  "data": {
    "_id": "123",
    "brand": "LG",
    "model": "1.5 Ton Split AC",
    "category": "AC",
    "price": {
      "3": 3000,
      "6": 5500,
      "9": 8000,
      "11": 9500,
      "12": 10000,
      "24": 18000
    }
  }
}
```

### 6.2 Order Response
```json
{
  "success": true,
  "data": {
    "orderId": "ORD-2024-001",
    "items": [
      {
        "type": "rental",
        "productId": "123",
        "duration": 12,
        "price": 10000
      }
    ],
    "total": 10000
  }
}
```

---

## 7. Error Handling

### 7.1 Invalid Duration
```json
{
  "success": false,
  "message": "Invalid duration. Allowed values: 3, 6, 9, 11, 12, 24",
  "error": "VALIDATION_ERROR"
}
```

### 7.2 Missing Price
```json
{
  "success": false,
  "message": "Price for selected duration (12 months) is not available for this product",
  "error": "PRICE_NOT_AVAILABLE"
}
```

---

## 8. Testing Checklist

- [ ] Create product with 12 and 24 months pricing
- [ ] Update existing product to include 12 and 24 months pricing
- [ ] Filter products by 12 months duration
- [ ] Filter products by 24 months duration
- [ ] Create order with 12 months duration
- [ ] Create order with 24 months duration
- [ ] Validate error handling for invalid duration
- [ ] Validate error handling for missing price
- [ ] Test backward compatibility (products without 12/24 months pricing)
- [ ] Test admin/vendor product creation forms
- [ ] Test admin/vendor product edit forms

---

## 9. Frontend Changes Summary (For Reference)

The following frontend changes have been implemented:

1. **ACDetail.js**: Updated tenure options to include 12 and 24 months
2. **Cart.js**: Updated rental duration slider to include 12 and 24 months
3. **Checkout.js**: Updated validation to accept 12 and 24 months
4. **BrowseACs.js**: Updated filter buttons to include 12M and 24M options
5. **CartContext.js**: Updated comments to reflect new duration options

---

## 10. Priority Actions

### High Priority
1. Update product price schema validation
2. Update order creation endpoint to accept 12 and 24 months
3. Update filter endpoint to support 12 and 24 months filtering

### Medium Priority
4. Update admin/vendor product creation forms
5. Add data migration for existing products
6. Update API documentation

### Low Priority
7. Add price validation rules (consistency checks)
8. Add analytics tracking for new duration options

---

## Contact
For questions or clarifications about these backend updates, please refer to the frontend implementation in:
- `src/pages/ACDetail.js`
- `src/pages/user/Cart.js`
- `src/pages/user/Checkout.js`
- `src/pages/BrowseACs.js`

---

**Last Updated**: [Current Date]
**Version**: 1.0

