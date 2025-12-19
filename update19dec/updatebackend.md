# Backend Update Requirements

This document outlines all the backend changes needed to support the new installation charges feature for AC products.

## Overview

The frontend now supports installation charges for AC products only. When an admin adds an AC product, they can specify:
1. Installation charge amount
2. List of items included in the installation charge
3. Extra material rates (copper pipe, drain pipe, electric wire)

## Database Schema Changes

### Product Model Updates

Add the following fields to the Product/AC model (only applicable when `category === 'AC'`):

```javascript
{
  // ... existing fields ...
  
  installationCharges: {
    amount: {
      type: Number,
      default: 0,
      required: false
    },
    includedItems: [{
      type: String
    }],
    extraMaterialRates: {
      copperPipe: {
        type: Number,
        default: 0
      },
      drainPipe: {
        type: Number,
        default: 0
      },
      electricWire: {
        type: Number,
        default: 0
      }
    }
  }
}
```

**Note:** This field should only be set when `category === 'AC'`. For other categories (Refrigerator, Washing Machine), this field should be `null` or `undefined`.

## API Endpoints Updates

### 1. POST `/api/admin/products` (Add Product)

**Request Body:**
```json
{
  "category": "AC",
  "name": "1 Ton 3 Star Split AC",
  "brand": "LG",
  "model": "LS-Q12ENZA",
  "capacity": "1 Ton",
  "type": "Split",
  "price": {
    "3": 1500,
    "6": 2700,
    "9": 2600,
    "11": 3850
  },
  "installationCharges": {
    "amount": 2499,
    "includedItems": [
      "Cable (3m) + 3pin plug",
      "Copper + Drain pipe (3m each)",
      "Condenser Stand (ODU)",
      "Indoor Mounting Kit"
    ],
    "extraMaterialRates": {
      "copperPipe": 900,
      "drainPipe": 100,
      "electricWire": 120
    }
  },
  // ... other fields
}
```

**Response:** Should include the `installationCharges` field in the saved product.

### 2. PATCH `/api/admin/products/:id` (Update Product)

**Request Body:** Same structure as above. The `installationCharges` field can be:
- Included to update installation charges
- Omitted to keep existing installation charges
- Set to `null` to remove installation charges

### 3. GET `/api/acs/:id` (Get AC by ID)

**Response:** Should include `installationCharges` field if present:
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "category": "AC",
    "brand": "LG",
    // ... other fields ...
    "installationCharges": {
      "amount": 2499,
      "includedItems": [
        "Cable (3m) + 3pin plug",
        "Copper + Drain pipe (3m each)",
        "Condenser Stand (ODU)",
        "Indoor Mounting Kit"
      ],
      "extraMaterialRates": {
        "copperPipe": 900,
        "drainPipe": 100,
        "electricWire": 120
      }
    }
  }
}
```

### 4. GET `/api/acs` (Get All ACs)

**Response:** Should include `installationCharges` field for each AC product if present.

## Validation Rules

1. **Category Check:**
   - `installationCharges` should only be accepted when `category === 'AC'`
   - If `category !== 'AC'` and `installationCharges` is provided, either:
     - Ignore it, or
     - Return an error: "Installation charges are only applicable for AC products"

2. **Amount Validation:**
   - `installationCharges.amount` should be a non-negative number
   - If `amount` is 0 or not provided, `installationCharges` can be `null` or omitted

3. **Included Items:**
   - `includedItems` should be an array of strings
   - Each string should be non-empty
   - Array can be empty

4. **Extra Material Rates:**
   - All rates (`copperPipe`, `drainPipe`, `electricWire`) should be non-negative numbers
   - Can be 0 if not applicable

## Order/Cart Calculations

When calculating order totals, include installation charges for AC products:

```javascript
// Pseudo-code for order total calculation
function calculateOrderTotal(items) {
  let total = 0;
  
  items.forEach(item => {
    // Rental price based on selected duration
    const rentalPrice = item.price[item.selectedDuration] || 0;
    total += rentalPrice;
    
    // Add installation charges for AC products
    if (item.category === 'AC' && item.installationCharges && item.installationCharges.amount) {
      total += item.installationCharges.amount;
    }
  });
  
  return total;
}
```

## Example Implementation (MongoDB/Mongoose)

```javascript
const productSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['AC', 'Refrigerator', 'Washing Machine'],
    required: true
  },
  // ... other fields ...
  installationCharges: {
    amount: {
      type: Number,
      default: 0
    },
    includedItems: [{
      type: String
    }],
    extraMaterialRates: {
      copperPipe: {
        type: Number,
        default: 0
      },
      drainPipe: {
        type: Number,
        default: 0
      },
      electricWire: {
        type: Number,
        default: 0
      }
    }
  }
}, {
  timestamps: true
});

// Validation middleware
productSchema.pre('save', function(next) {
  // Only allow installationCharges for AC category
  if (this.category !== 'AC' && this.installationCharges) {
    // Option 1: Remove installationCharges for non-AC products
    this.installationCharges = undefined;
    // Option 2: Or throw an error
    // return next(new Error('Installation charges are only applicable for AC products'));
  }
  next();
});
```

## Migration Script (if needed)

If you have existing AC products in the database, you may want to add default installation charges:

```javascript
// Migration script example
async function migrateInstallationCharges() {
  const acs = await Product.find({ category: 'AC' });
  
  for (const ac of acs) {
    if (!ac.installationCharges) {
      ac.installationCharges = {
        amount: 0,
        includedItems: [],
        extraMaterialRates: {
          copperPipe: 0,
          drainPipe: 0,
          electricWire: 0
        }
      };
      await ac.save();
    }
  }
}
```

## Testing Checklist

- [ ] Add AC product with installation charges
- [ ] Add AC product without installation charges
- [ ] Add Refrigerator/Washing Machine (should not accept installation charges)
- [ ] Update AC product installation charges
- [ ] Remove installation charges from AC product
- [ ] Get AC by ID returns installation charges
- [ ] Get all ACs returns installation charges
- [ ] Order calculation includes installation charges
- [ ] Cart calculation includes installation charges

## Notes

1. **Backward Compatibility:** Existing products without `installationCharges` should still work. The field should be optional.

2. **Default Values:** If `installationCharges` is not provided, it should default to:
   ```javascript
   {
     amount: 0,
     includedItems: [],
     extraMaterialRates: {
       copperPipe: 0,
       drainPipe: 0,
       electricWire: 0
     }
   }
   ```

3. **Frontend Integration:** The frontend will:
   - Show installation charges modal when adding AC to cart
   - Include installation charges in cart total calculation
   - Display installation charges in order summary

4. **Payment:** Installation charges are paid along with the first month's rent, as mentioned in the modal.

## Summary

The main changes required are:
1. Add `installationCharges` field to Product/AC model
2. Validate that installation charges are only for AC category
3. Include installation charges in API responses
4. Include installation charges in order/cart total calculations
5. Ensure backward compatibility with existing products

