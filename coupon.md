# Coupon System - Backend Implementation Guide

## Overview
This document outlines the backend requirements for implementing a coupon/discount code system in the rental service application.

---

## 1. Database Schema

### 1.1 Coupon Collection/Table

**MongoDB Schema:**
```javascript
{
  _id: ObjectId,
  code: String,              // Unique coupon code (e.g., "WELCOME10")
  title: String,             // Display title (e.g., "Welcome Offer")
  description: String,       // Description of the offer
  type: String,              // "percentage" or "fixed"
  value: Number,             // Discount value (percentage or fixed amount)
  minAmount: Number,         // Optional: Minimum order amount required
  maxDiscount: Number,       // Optional: Maximum discount amount (for percentage)
  validFrom: Date,           // Coupon validity start date
  validUntil: Date,          // Coupon validity end date
  usageLimit: Number,        // Total number of times coupon can be used
  usageCount: Number,        // Current usage count
  userLimit: Number,         // Optional: Per user usage limit
  applicableCategories: [String], // Optional: ["AC", "Refrigerator", "Washing Machine"]
  applicableDurations: [Number],  // Optional: [3, 6, 9, 11, 12, 24] (months)
  isActive: Boolean,         // Whether coupon is currently active
  createdAt: Date,
  updatedAt: Date
}
```

**SQL Schema:**
```sql
CREATE TABLE coupons (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type ENUM('percentage', 'fixed') NOT NULL,
  value DECIMAL(10, 2) NOT NULL,
  min_amount DECIMAL(10, 2) DEFAULT NULL,
  max_discount DECIMAL(10, 2) DEFAULT NULL,
  valid_from DATETIME NOT NULL,
  valid_until DATETIME NOT NULL,
  usage_limit INT DEFAULT NULL,
  usage_count INT DEFAULT 0,
  user_limit INT DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE coupon_applicable_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  coupon_id INT NOT NULL,
  category VARCHAR(50) NOT NULL,
  FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
);

CREATE TABLE coupon_applicable_durations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  coupon_id INT NOT NULL,
  duration INT NOT NULL,
  FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE
);
```

### 1.2 Coupon Usage Tracking

**MongoDB Schema:**
```javascript
{
  _id: ObjectId,
  couponId: ObjectId,        // Reference to coupon
  userId: ObjectId,          // Reference to user
  orderId: String,           // Order ID where coupon was used
  discountAmount: Number,    // Actual discount applied
  usedAt: Date
}
```

**SQL Schema:**
```sql
CREATE TABLE coupon_usages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  coupon_id INT NOT NULL,
  user_id INT NOT NULL,
  order_id VARCHAR(100) NOT NULL,
  discount_amount DECIMAL(10, 2) NOT NULL,
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (coupon_id) REFERENCES coupons(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 2. API Endpoints

### 2.1 Validate Coupon Code

**Endpoint:** `POST /api/coupons/validate`

**Request Body:**
```json
{
  "code": "WELCOME10",
  "orderTotal": 5000,
  "userId": "user123",  // Optional, for user-specific validation
  "items": [            // Optional, for category/duration validation
    {
      "type": "rental",
      "category": "AC",
      "duration": 12
    }
  ]
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "code": "WELCOME10",
    "title": "Welcome Offer",
    "description": "10% off on your first order",
    "type": "percentage",
    "value": 10,
    "discountAmount": 500,  // Calculated discount
    "minAmount": null,
    "maxDiscount": null,
    "validUntil": "2025-12-31T23:59:59.000Z"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Invalid coupon code",
  "error": "COUPON_NOT_FOUND"
}
```

**Validation Rules:**
1. Check if coupon exists and is active
2. Check if current date is within validFrom and validUntil
3. Check if usageCount < usageLimit (if limit exists)
4. Check if orderTotal >= minAmount (if minAmount exists)
5. Check if user hasn't exceeded userLimit (if limit exists)
6. Check if order items match applicableCategories (if specified)
7. Check if rental duration matches applicableDurations (if specified)
8. Calculate discount amount based on type

### 2.2 Get Available Coupons

**Endpoint:** `GET /api/coupons/available`

**Query Parameters:**
- `userId` (optional): Filter user-specific coupons
- `category` (optional): Filter by product category
- `minAmount` (optional): Filter by minimum order amount

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "code": "WELCOME10",
      "title": "Welcome Offer",
      "description": "10% off on your first order",
      "type": "percentage",
      "value": 10,
      "validUntil": "2025-12-31T23:59:59.000Z"
    },
    {
      "code": "SAVE500",
      "title": "Flat Discount",
      "description": "Save ₹500 on orders above ₹5000",
      "type": "fixed",
      "value": 500,
      "minAmount": 5000,
      "validUntil": "2025-12-31T23:59:59.000Z"
    }
  ]
}
```

### 2.3 Apply Coupon to Order

**Endpoint:** `POST /api/orders` (Update existing endpoint)

**Request Body (Updated):**
```json
{
  "orderId": "ORD-2024-001",
  "items": [...],
  "total": 5000,
  "couponCode": "WELCOME10",  // NEW
  "couponDiscount": 500,      // NEW
  "paymentDiscount": 0,
  "discount": 500,
  "finalTotal": 4500,
  "paymentOption": "payNow",
  ...
}
```

**Backend Processing:**
1. Validate coupon code again (security check)
2. Verify coupon hasn't been used beyond limits
3. Calculate and verify discount amount
4. Record coupon usage in coupon_usages table
5. Increment usageCount in coupons table
6. Create order with coupon information

---

## 3. Discount Calculation Logic

### 3.1 Percentage Discount
```javascript
let discountAmount = orderTotal * (couponValue / 100);

// Apply max discount if specified
if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
  discountAmount = coupon.maxDiscount;
}
```

### 3.2 Fixed Amount Discount
```javascript
let discountAmount = couponValue;

// Ensure discount doesn't exceed order total
if (discountAmount > orderTotal) {
  discountAmount = orderTotal;
}
```

### 3.3 Combined Discounts
- Payment discount (5% for Pay Now) is calculated first
- Coupon discount is calculated on the original total (before payment discount)
- Final total = Original Total - Payment Discount - Coupon Discount

**Example:**
```
Order Total: ₹10,000
Payment Discount (5%): ₹500
Coupon Discount (10%): ₹1,000
Final Total: ₹10,000 - ₹500 - ₹1,000 = ₹8,500
```

---

## 4. Validation Rules

### 4.1 Coupon Code Validation
- Code must be unique
- Code format: Uppercase alphanumeric, 6-20 characters
- Code cannot be empty or contain special characters (except hyphens/underscores)

### 4.2 Coupon Validity
- `validFrom` must be <= `validUntil`
- Coupon is only valid if current date is between validFrom and validUntil
- Coupon must have `isActive: true`

### 4.3 Usage Limits
- If `usageLimit` is set, check `usageCount < usageLimit`
- If `userLimit` is set, check user's usage count for this coupon
- Track usage in `coupon_usages` collection/table

### 4.4 Order Requirements
- If `minAmount` is set, order total must be >= minAmount
- If `applicableCategories` is set, at least one order item must match
- If `applicableDurations` is set, rental duration must match

---

## 5. Admin Endpoints (Optional)

### 5.1 Create Coupon

**Endpoint:** `POST /api/admin/coupons`

**Request Body:**
```json
{
  "code": "WELCOME10",
  "title": "Welcome Offer",
  "description": "10% off on your first order",
  "type": "percentage",
  "value": 10,
  "minAmount": 0,
  "maxDiscount": null,
  "validFrom": "2025-01-01T00:00:00.000Z",
  "validUntil": "2025-12-31T23:59:59.000Z",
  "usageLimit": 1000,
  "userLimit": 1,
  "applicableCategories": [],
  "applicableDurations": [],
  "isActive": true
}
```

### 5.2 Update Coupon

**Endpoint:** `PUT /api/admin/coupons/:id`

### 5.3 List All Coupons

**Endpoint:** `GET /api/admin/coupons`

### 5.4 Deactivate Coupon

**Endpoint:** `PATCH /api/admin/coupons/:id/deactivate`

---

## 6. Error Codes

| Error Code | Message | Description |
|------------|---------|-------------|
| `COUPON_NOT_FOUND` | Invalid coupon code | Coupon doesn't exist |
| `COUPON_EXPIRED` | Coupon has expired | Current date > validUntil |
| `COUPON_NOT_ACTIVE` | Coupon is not active | isActive = false |
| `COUPON_USAGE_LIMIT_REACHED` | Coupon usage limit reached | usageCount >= usageLimit |
| `COUPON_USER_LIMIT_REACHED` | You have already used this coupon | User exceeded userLimit |
| `COUPON_MIN_AMOUNT_NOT_MET` | Minimum order amount not met | orderTotal < minAmount |
| `COUPON_CATEGORY_NOT_APPLICABLE` | Coupon not applicable for selected category | Category mismatch |
| `COUPON_DURATION_NOT_APPLICABLE` | Coupon not applicable for selected duration | Duration mismatch |
| `COUPON_INVALID_DATE` | Coupon is not yet valid | Current date < validFrom |

---

## 7. Sample Coupon Data

```json
[
  {
    "code": "WELCOME10",
    "title": "Welcome Offer",
    "description": "Get 10% off on your first rental order",
    "type": "percentage",
    "value": 10,
    "minAmount": 0,
    "maxDiscount": null,
    "validFrom": "2025-01-01T00:00:00.000Z",
    "validUntil": "2025-12-31T23:59:59.000Z",
    "usageLimit": 1000,
    "userLimit": 1,
    "applicableCategories": [],
    "applicableDurations": [],
    "isActive": true
  },
  {
    "code": "SAVE500",
    "title": "Flat Discount",
    "description": "Save ₹500 on orders above ₹5000",
    "type": "fixed",
    "value": 500,
    "minAmount": 5000,
    "maxDiscount": null,
    "validFrom": "2025-01-01T00:00:00.000Z",
    "validUntil": "2025-12-31T23:59:59.000Z",
    "usageLimit": 500,
    "userLimit": null,
    "applicableCategories": [],
    "applicableDurations": [],
    "isActive": true
  },
  {
    "code": "LONGTERM15",
    "title": "Long Term Rental",
    "description": "Get 15% off on 12+ months rental",
    "type": "percentage",
    "value": 15,
    "minAmount": 0,
    "maxDiscount": 2000,
    "validFrom": "2025-01-01T00:00:00.000Z",
    "validUntil": "2025-12-31T23:59:59.000Z",
    "usageLimit": null,
    "userLimit": null,
    "applicableCategories": [],
    "applicableDurations": [12, 24],
    "isActive": true
  }
]
```

---

## 8. Testing Checklist

- [ ] Validate coupon code (valid)
- [ ] Validate coupon code (invalid)
- [ ] Validate expired coupon
- [ ] Validate inactive coupon
- [ ] Validate usage limit reached
- [ ] Validate user limit reached
- [ ] Validate minimum amount requirement
- [ ] Validate category restriction
- [ ] Validate duration restriction
- [ ] Calculate percentage discount correctly
- [ ] Calculate fixed discount correctly
- [ ] Apply max discount limit
- [ ] Track coupon usage
- [ ] Prevent duplicate usage (same order)
- [ ] Combine with payment discount correctly
- [ ] Admin: Create coupon
- [ ] Admin: Update coupon
- [ ] Admin: Deactivate coupon
- [ ] Admin: View coupon usage statistics

---

## 9. Security Considerations

1. **Server-Side Validation**: Always validate coupon on server, never trust client
2. **Rate Limiting**: Limit coupon validation requests per user/IP
3. **Case Insensitive**: Coupon codes should be case-insensitive
4. **Usage Tracking**: Prevent same coupon being used multiple times in same order
5. **Double Validation**: Validate coupon again at order creation (not just at apply)
6. **Audit Trail**: Log all coupon validations and applications

---

## 10. Frontend Integration Points

The frontend will:
1. Show coupon modal on home page (once per user)
2. Display available coupons in modal
3. Allow user to enter coupon code at checkout
4. Call `/api/coupons/validate` to validate coupon
5. Display applied coupon and discount
6. Send `couponCode` and `couponDiscount` in order creation request

---

**Last Updated**: [Current Date]
**Version**: 1.0

