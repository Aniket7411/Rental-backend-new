# Backend Update: Monthly Rental Option Removal

## Summary
The frontend has been updated to **remove the "monthly" rental option**. Only **3, 6, 9, and 11 months** rental durations are now supported.

---

## Changes Required in Backend

### 1. Product Schema Update

**Remove:**
- `price.monthly` field

**Keep:**
- `price.3` (3 months rental price)
- `price.6` (6 months rental price)
- `price.9` (9 months rental price)
- `price.11` (11 months rental price)

**Updated Product Price Schema:**
```json
{
  "price": {
    "3": 3000,   // 3 months rental price per month
    "6": 5000,   // 6 months rental price per month
    "9": 7000,   // 9 months rental price per month
    "11": 9000   // 11 months rental price per month
  }
}
```

---

### 2. API Endpoints to Update

#### **POST `/admin/products`** (Create Product)
**Request Body - Remove:**
```json
{
  "price": {
    "monthly": 2000,  // ❌ REMOVE THIS
    "3": 3000,
    "6": 5000,
    "9": 7000,
    "11": 9000
  }
}
```

**Request Body - Updated:**
```json
{
  "price": {
    "3": 3000,   // ✅ Required
    "6": 5000,   // ✅ Required
    "9": 7000,   // ✅ Required
    "11": 9000   // ✅ Required
  }
}
```

#### **PATCH `/admin/products/:id`** (Update Product)
- Remove validation for `price.monthly`
- Only validate `price.3`, `price.6`, `price.9`, `price.11`

#### **GET `/acs`** (Get Products)
- Response should only include `price.3`, `price.6`, `price.9`, `price.11`
- Remove `price.monthly` from response

---

### 3. Validation Rules

**Old Validation:**
```javascript
// ❌ REMOVE
if (!price.monthly || !price[3] || !price[6] || !price[9] || !price[11]) {
  return error;
}
```

**New Validation:**
```javascript
// ✅ USE THIS
if (!price[3] || !price[6] || !price[9] || !price[11]) {
  return error('All rental duration prices (3, 6, 9, 11 months) are required');
}
```

---

### 4. Order Creation Update

#### **POST `/orders`**
When creating orders, the frontend now sends:
```json
{
  "items": [
    {
      "type": "rental",
      "productId": "product_id",
      "quantity": 1,
      "price": 3000,        // Price based on selected duration
      "duration": 3         // ✅ NEW: Selected duration (3, 6, 9, or 11)
    }
  ]
}
```

**Backend should:**
- Accept `duration` field in order items
- Store `duration` with the order item
- Use the `duration` to calculate total price correctly

---

### 5. Database Migration (If Needed)

If you have existing products with `price.monthly`:
- Option 1: Remove `price.monthly` field from all products
- Option 2: Keep it for backward compatibility but don't use it in new products
- Option 3: Migrate `price.monthly` to `price.3` if needed

**Example Migration (MongoDB):**
```javascript
db.products.updateMany(
  {},
  { $unset: { "price.monthly": "" } }
);
```

---

### 6. Default Behavior

- **Default Duration:** When no duration is specified, assume **3 months**
- **Price Calculation:** Always use the selected duration (3, 6, 9, or 11) from `price[duration]`

---

## Testing Checklist

- [ ] Create product with only 3, 6, 9, 11 months prices (no monthly)
- [ ] Update product - should not require monthly field
- [ ] Get products - should not return monthly price
- [ ] Create order with duration field - should accept and store duration
- [ ] Verify price calculations use selected duration

---

## Frontend Changes Summary

✅ **Completed:**
- Removed monthly option from all forms (Admin/Vendor Add/Edit)
- Removed monthly from product detail page duration selector
- Removed monthly from browse page filters
- Updated all price displays to use 3 months as default
- Cart now has duration selector (3, 6, 9, 11 months)
- Checkout shows selected duration and correct price
- Order creation includes `duration` field

---

## Notes

- All frontend code is ready and will work once backend is updated
- Frontend defaults to **3 months** if no duration is selected
- The `duration` field in order items is **new** - backend should accept and store it
- Price calculations should use: `price[duration]` where duration is 3, 6, 9, or 11

---

## Contact

If you have questions about these changes, refer to the frontend code in:
- `src/pages/admin/AddAC.js` - See how products are created
- `src/pages/user/Cart.js` - See how duration is selected
- `src/pages/user/Checkout.js` - See how orders are created with duration

