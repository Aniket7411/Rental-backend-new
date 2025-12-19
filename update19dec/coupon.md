# Coupon Management API Documentation

## Overview
This document describes the backend API endpoints required for the coupon management system. The system supports both user-facing coupon validation and admin coupon management.

---

## Data Model

### Coupon Schema
```javascript
{
  _id: ObjectId,                    // Auto-generated
  code: String,                      // Unique coupon code (e.g., "SUMMER20")
  title: String,                     // Display title (e.g., "Summer Sale")
  description: String,                // Description of the coupon
  type: String,                      // "percentage" or "fixed"
  value: Number,                     // Discount value (percentage: 1-100, fixed: amount in ₹)
  minAmount: Number,                 // Minimum order amount required (default: 0)
  maxDiscount: Number,               // Maximum discount for percentage type (optional, null for fixed)
  validFrom: Date,                   // Start date (ISO format)
  validUntil: Date,                  // End date (ISO format, optional)
  usageLimit: Number,                // Total usage limit (null = unlimited)
  userLimit: Number,                 // Usage limit per user (null = unlimited)
  applicableCategories: [String],    // ["AC", "Refrigerator", "Washing Machine"] (empty = all)
  applicableDurations: [Number],     // [3, 6, 9, 11, 12, 24] months (empty = all)
  isActive: Boolean,                 // Active status
  usageCount: Number,                // Current usage count (auto-tracked, default: 0)
  createdAt: Date,                  // Auto-generated
  updatedAt: Date                    // Auto-generated
}
```

---

## User-Facing APIs

### 1. Get Available Coupons
**Endpoint:** `GET /api/coupons/available`

**Description:** Returns all active coupons available to users, optionally filtered by category and minimum amount.

**Query Parameters:**
- `userId` (optional): User ID to check user-specific usage limits
- `category` (optional): Filter by category ("AC", "Refrigerator", "Washing Machine")
- `minAmount` (optional): Filter by minimum order amount

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "coupon_id",
      "code": "SUMMER20",
      "title": "Summer Sale",
      "description": "Get 20% off on all AC rentals",
      "type": "percentage",
      "value": 20,
      "minAmount": 5000,
      "maxDiscount": 2000,
      "validFrom": "2024-01-01T00:00:00.000Z",
      "validUntil": "2024-12-31T23:59:59.999Z",
      "usageLimit": 100,
      "userLimit": 1,
      "applicableCategories": ["AC"],
      "applicableDurations": [3, 6, 9, 11, 12, 24],
      "isActive": true,
      "usageCount": 45
    }
  ]
}
```

**Filters Applied:**
- Only return coupons where `isActive === true`
- Only return coupons where current date is between `validFrom` and `validUntil` (if set)
- If `userId` provided, check if user has reached `userLimit`
- If `category` provided, only return coupons where `applicableCategories` includes the category or is empty
- If `minAmount` provided, only return coupons where `minAmount <= provided minAmount`

---

### 2. Validate Coupon
**Endpoint:** `POST /api/coupons/validate`

**Description:** Validates a coupon code against an order and returns the discount amount if valid.

**Request Body:**
```json
{
  "code": "SUMMER20",
  "orderTotal": 15000,
  "items": [
    {
      "type": "rental",
      "category": "AC",
      "duration": 6
    },
    {
      "type": "rental",
      "category": "Refrigerator",
      "duration": 12
    }
  ]
}
```

**Validation Rules:**
1. Coupon exists and `isActive === true`
2. Current date is between `validFrom` and `validUntil` (if set)
3. `orderTotal >= minAmount`
4. If `usageLimit` is set, `usageCount < usageLimit`
5. If `userLimit` is set, check user's usage count for this coupon
6. If `applicableCategories` is not empty, at least one item's category must match
7. If `applicableDurations` is not empty, at least one item's duration must match

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "_id": "coupon_id",
    "code": "SUMMER20",
    "title": "Summer Sale",
    "description": "Get 20% off on all AC rentals",
    "type": "percentage",
    "value": 20,
    "minAmount": 5000,
    "maxDiscount": 2000,
    "discountAmount": 2000,          // Calculated discount for this order
    "validFrom": "2024-01-01T00:00:00.000Z",
    "validUntil": "2024-12-31T23:59:59.999Z",
    "applicableCategories": ["AC"],
    "applicableDurations": [3, 6, 9, 11, 12, 24]
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Coupon code is invalid or expired",
  "error": "COUPON_INVALID" | "COUPON_EXPIRED" | "COUPON_USAGE_LIMIT_REACHED" | "COUPON_MIN_AMOUNT_NOT_MET" | "COUPON_NOT_APPLICABLE"
}
```

**Discount Calculation:**
- **Percentage Type:**
  - `discountAmount = orderTotal * (value / 100)`
  - If `maxDiscount` is set: `discountAmount = Math.min(discountAmount, maxDiscount)`
- **Fixed Type:**
  - `discountAmount = value`
  - Ensure `discountAmount <= orderTotal`

**Note:** This endpoint should NOT increment `usageCount`. Usage count should be incremented only when the order is successfully placed.

---

## Admin APIs

### 3. Get All Coupons (Admin)
**Endpoint:** `GET /api/admin/coupons`

**Description:** Returns all coupons (active and inactive) for admin management.

**Authentication:** Requires admin authentication

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "coupon_id",
      "code": "SUMMER20",
      "title": "Summer Sale",
      "description": "Get 20% off on all AC rentals",
      "type": "percentage",
      "value": 20,
      "minAmount": 5000,
      "maxDiscount": 2000,
      "validFrom": "2024-01-01T00:00:00.000Z",
      "validUntil": "2024-12-31T23:59:59.999Z",
      "usageLimit": 100,
      "userLimit": 1,
      "applicableCategories": ["AC"],
      "applicableDurations": [3, 6, 9, 11, 12, 24],
      "isActive": true,
      "usageCount": 45,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### 4. Create Coupon (Admin)
**Endpoint:** `POST /api/admin/coupons`

**Description:** Creates a new coupon.

**Authentication:** Requires admin authentication

**Request Body:**
```json
{
  "code": "SUMMER20",
  "title": "Summer Sale",
  "description": "Get 20% off on all AC rentals",
  "type": "percentage",
  "value": 20,
  "minAmount": 5000,
  "maxDiscount": 2000,
  "validFrom": "2024-01-01",
  "validUntil": "2024-12-31",
  "usageLimit": 100,
  "userLimit": 1,
  "applicableCategories": ["AC"],
  "applicableDurations": [3, 6, 9, 11, 12, 24],
  "isActive": true
}
```

**Validation:**
- `code`: Required, unique, alphanumeric (uppercase recommended)
- `title`: Required
- `type`: Required, must be "percentage" or "fixed"
- `value`: Required
  - For percentage: must be between 1 and 100
  - For fixed: must be > 0
- `minAmount`: Optional, default 0, must be >= 0
- `maxDiscount`: Optional, only for percentage type, must be > 0
- `validFrom`: Optional, default to current date
- `validUntil`: Optional
- `usageLimit`: Optional, null = unlimited, must be > 0 if provided
- `userLimit`: Optional, null = unlimited, must be > 0 if provided
- `applicableCategories`: Optional, array of strings, must be valid categories
- `applicableDurations`: Optional, array of numbers, must be valid durations [3, 6, 9, 11, 12, 24]
- `isActive`: Optional, default true

**Response (Success):**
```json
{
  "success": true,
  "message": "Coupon created successfully",
  "data": {
    "_id": "coupon_id",
    "code": "SUMMER20",
    "title": "Summer Sale",
    // ... all coupon fields
    "usageCount": 0,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Coupon code already exists" | "Invalid coupon data"
}
```

---

### 5. Update Coupon (Admin)
**Endpoint:** `PUT /api/admin/coupons/:couponId`

**Description:** Updates an existing coupon.

**Authentication:** Requires admin authentication

**Request Body:** (Same as Create, all fields optional except those that cannot be changed)
```json
{
  "title": "Updated Summer Sale",
  "description": "Updated description",
  "type": "percentage",
  "value": 25,
  "minAmount": 6000,
  "maxDiscount": 2500,
  "validUntil": "2025-12-31",
  "usageLimit": 200,
  "userLimit": 2,
  "applicableCategories": ["AC", "Refrigerator"],
  "applicableDurations": [6, 12, 24],
  "isActive": false
}
```

**Note:** `code` should NOT be updatable after creation to maintain consistency.

**Response (Success):**
```json
{
  "success": true,
  "message": "Coupon updated successfully",
  "data": {
    "_id": "coupon_id",
    // ... updated coupon fields
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Coupon not found" | "Invalid coupon data"
}
```

---

### 6. Delete Coupon (Admin)
**Endpoint:** `DELETE /api/admin/coupons/:couponId`

**Description:** Deletes a coupon permanently.

**Authentication:** Requires admin authentication

**Response (Success):**
```json
{
  "success": true,
  "message": "Coupon deleted successfully"
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Coupon not found"
}
```

---

## Order Integration

### Increment Coupon Usage
When an order is successfully placed with a coupon:

1. **Increment `usageCount`** in the coupon document
2. **Track user usage** (if `userLimit` is set, maintain a separate collection or field to track per-user usage)

**Example:**
```javascript
// When order is placed
await Coupon.findByIdAndUpdate(couponId, {
  $inc: { usageCount: 1 }
});

// Track user usage (if userLimit is set)
await UserCouponUsage.create({
  userId: order.userId,
  couponId: couponId,
  orderId: order._id,
  usedAt: new Date()
});
```

---

## Error Codes

| Error Code | Description |
|------------|-------------|
| `COUPON_INVALID` | Coupon code does not exist |
| `COUPON_EXPIRED` | Coupon has expired (past validUntil) |
| `COUPON_NOT_STARTED` | Coupon is not yet valid (before validFrom) |
| `COUPON_INACTIVE` | Coupon is inactive |
| `COUPON_USAGE_LIMIT_REACHED` | Total usage limit reached |
| `COUPON_USER_LIMIT_REACHED` | User has reached their usage limit |
| `COUPON_MIN_AMOUNT_NOT_MET` | Order total is less than minimum amount |
| `COUPON_NOT_APPLICABLE` | Coupon does not apply to selected items (category/duration mismatch) |

---

## Additional Notes

1. **Date Handling:** All dates should be stored in ISO 8601 format and handled in UTC.

2. **Case Sensitivity:** Coupon codes should be case-insensitive for validation (e.g., "SUMMER20" and "summer20" should be treated as the same).

3. **User Usage Tracking:** If `userLimit` is implemented, you may need a separate collection to track per-user coupon usage:
   ```javascript
   {
     userId: ObjectId,
     couponId: ObjectId,
     orderId: ObjectId,
     usedAt: Date
   }
   ```

4. **Discount Calculation:** Always ensure the final discount does not exceed the order total.

5. **Validation Order:** Validate coupons in this order:
   - Existence and active status
   - Date validity
   - Usage limits
   - Minimum amount
   - Applicability (categories/durations)

6. **Security:** 
   - Admin endpoints must require admin authentication
   - Validate all input data
   - Sanitize coupon codes to prevent injection attacks

---

## Testing Examples

### Valid Coupon Request
```json
POST /api/coupons/validate
{
  "code": "SUMMER20",
  "orderTotal": 15000,
  "items": [
    { "type": "rental", "category": "AC", "duration": 6 }
  ]
}
```

### Invalid Coupon (Expired)
```json
Response:
{
  "success": false,
  "message": "Coupon has expired",
  "error": "COUPON_EXPIRED"
}
```

### Invalid Coupon (Min Amount Not Met)
```json
Response:
{
  "success": false,
  "message": "Minimum order amount of ₹5000 required",
  "error": "COUPON_MIN_AMOUNT_NOT_MET"
}
```

