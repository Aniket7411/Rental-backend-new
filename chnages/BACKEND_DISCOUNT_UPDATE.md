# Backend Update: Default Discount Change from 5% to 10%

## Overview
The frontend has been updated to change the default discount from **5%** to **10%** for products. This document outlines the backend changes required to align with this update.

## Changes Required

### 1. Default Discount Value Update

**Current Behavior:**
- Default discount is 5% when product discount is not specified or is 0

**New Behavior:**
- Default discount should be 10% when product discount is not specified or is 0

### 2. API Response Considerations

The frontend now expects:
- If a product has `discount` field set and > 0, use that value
- If `discount` is null, undefined, 0, or not set, default to **10%** (changed from 5%)

**Product Model/Schema:**
```javascript
{
  discount: Number, // Optional field
  // If discount is not set or is 0, frontend will default to 10%
}
```

### 3. Calculation Updates (if applicable)

If the backend calculates discount-related values, ensure:

**Discount Calculation:**
```javascript
// Example calculation
const discountPercent = (product.discount && product.discount > 0) ? product.discount : 10;
const savingAmount = Math.round((price * discountPercent) / 100);
```

### 4. Database Considerations

**Option 1: Keep existing products unchanged (Recommended)**
- No database migration needed
- Products without discount or with discount = 0 will use 10% default in frontend

**Option 2: Update existing products (if needed)**
- Update all products where `discount` is null or 0 to have `discount: 10`
- Only if you want the discount value explicitly stored in database

### 5. Testing Checklist

- [ ] Verify products without discount field show 10% discount (not 5%)
- [ ] Verify products with discount = 0 show 10% discount (not 5%)
- [ ] Verify products with discount > 0 show their custom discount
- [ ] Verify discount calculation is correct: `savingAmount = (price * discountPercent) / 100`
- [ ] Test cart/checkout flows to ensure discount is applied correctly
- [ ] Verify API responses include discount field appropriately

### 6. API Endpoints Affected

Review the following endpoints to ensure they handle the discount correctly:

1. **GET /api/products** - Product listing
2. **GET /api/products/:id** - Single product details
3. **GET /api/browse** - Browse/search products
4. **POST /api/cart** - Add to cart (should preserve discount info)
5. **GET /api/cart** - Get cart items (should include discount info)

### 7. Admin Panel Considerations

If admin panel allows setting discount:
- Ensure discount field can be set to 0 (which will default to 10% on frontend)
- Consider adding a note: "Leave empty or set to 0 for 10% default discount"

### 8. Example Implementation

**Backend API Response Example:**
```json
{
  "_id": "123",
  "name": "AC Product",
  "price": 5000,
  "discount": 0,  // or null, or not included - frontend will use 10%
  // OR
  "discount": 15, // Custom discount - frontend will use 15%
  ...
}
```

**Frontend Handling:**
```javascript
// Frontend code (already implemented)
const discountPercent = (product.discount && product.discount > 0) 
  ? product.discount 
  : 10; // Changed from 5 to 10
```

## Migration Steps

1. **No database migration required** if you choose Option 1 (recommended)
   - Frontend handles the default logic
   - Existing products will automatically use 10% default

2. **If choosing Option 2** (update existing records):
   ```javascript
   // Example migration script
   db.products.updateMany(
     { $or: [{ discount: { $exists: false } }, { discount: 0 }, { discount: null }] },
     { $set: { discount: 10 } }
   )
   ```

## Notes

- This is primarily a **frontend change**
- Backend may not need changes if it simply stores and returns the `discount` field
- Consider this document as a reference to ensure backend behavior aligns with frontend expectations
- If your backend calculates discounts differently, review and update those calculations accordingly

## Frontend Files Changed

- `src/pages/ACDetail.js`:
  - Default discount changed from 5% to 10% in discount calculation
  - Discount display updated to show "10%" instead of "5%"

## Contact

If you have questions or need clarification on these changes, please refer to the frontend code in `src/pages/ACDetail.js` for the exact implementation.

