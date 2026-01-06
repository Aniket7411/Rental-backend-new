# Backend Update Requirements

This document outlines all the frontend changes that require corresponding backend updates.

## 1. Excluded Items in Installation Charges

### Overview
Added support for `excludedItems` field in installation charges, similar to `includedItems`. This allows admins to specify what is NOT included in the installation charge.

### Changes Required

#### Product Schema Update
Update the Product/AC schema to include `excludedItems` in `installationCharges`:

```javascript
installationCharges: {
  amount: Number,
  includedItems: [String],  // Already exists
  excludedItems: [String],  // NEW FIELD - Array of items NOT included
  extraMaterialRates: {
    copperPipe: Number,
    drainPipe: Number,
    electricWire: Number
  }
}
```

#### API Endpoints
- **POST `/api/admin/products`** - Accept `excludedItems` in request body
- **PATCH `/api/admin/products/:id`** - Accept `excludedItems` in request body
- **GET `/api/admin/products`** - Return `excludedItems` in response
- **GET `/api/acs/:id`** - Return `excludedItems` in response
- **GET `/api/acs`** - Return `excludedItems` in response

#### Order Schema Update
Ensure that when orders are created, the `excludedItems` are included in the order items:

```javascript
items: [{
  type: 'rental',
  productId: String,
  // ... other fields
  productDetails: {
    // ... other fields
    installationCharges: {
      amount: Number,
      includedItems: [String],
      excludedItems: [String],  // NEW FIELD
      extraMaterialRates: Object
    }
  }
}]
```

#### Order API Endpoints
- **POST `/api/orders`** - Include `excludedItems` when creating orders
- **GET `/api/orders/:id`** - Return `excludedItems` in order items
- **GET `/api/user/orders`** - Return `excludedItems` in order items
- **GET `/api/admin/orders`** - Return `excludedItems` in order items
- **GET `/api/admin/orders/:id`** - Return `excludedItems` in order items

### Migration
If you have existing products with installation charges, you can add an empty array for `excludedItems`:

```javascript
db.products.updateMany(
  { "installationCharges.includedItems": { $exists: true } },
  { $set: { "installationCharges.excludedItems": [] } }
)
```

---

## 2. Payment Options - Rentals vs Services

### Overview
The payment options differ based on whether the order contains rentals or services:

- **For Rentals**: 
  - `payNow` - Pay full amount upfront with discount
  - `payAdvance` - Book with advance payment (partial payment), remaining after installation

- **For Services**:
  - `payNow` - Pay full amount upfront with discount
  - `payLater` - Pay after service completion (no upfront payment)

### Changes Required

#### Backend Verification
Verify that the backend Order schema supports all three payment options:

```javascript
{
  paymentOption: {
    type: String,
    enum: ['payNow', 'payAdvance', 'payLater'],  // All three should be supported
    default: 'payNow'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  }
}
```

#### Payment Option Logic

**For Rentals (`payAdvance`)**:
- Order should be created with `paymentStatus: 'pending'`
- `advanceAmount` should be set (e.g., ₹999 or configured amount)
- `remainingAmount` should be calculated (finalTotal - advanceAmount)
- Payment verification required for the advance amount
- Remaining amount is paid after installation

**For Services (`payLater`)**:
- Order should be created with `paymentStatus: 'pending'`
- No payment verification required at order creation
- `advanceAmount` should be `null`
- `remainingAmount` should be `null`
- Full payment is made after service completion

**For Both (`payNow`)**:
- Order should be created with `paymentStatus: 'pending'`
- Payment verification required for full amount
- Order status updated to `'confirmed'` or `'paid'` after payment

#### Order API Endpoints
- **POST `/api/orders`** - Accept all three payment options:
  - `paymentOption: 'payNow'` - Full payment upfront
  - `paymentOption: 'payAdvance'` - Advance payment for rentals
  - `paymentOption: 'payLater'` - Pay after service for services

#### Order Creation Logic
When creating orders:

1. **If `paymentOption === 'payAdvance'`**:
   - Validate that order contains rentals (not services-only)
   - Set `advanceAmount` and `remainingAmount`
   - Require payment verification for advance amount
   - Set `priorityServiceScheduling: true` (if applicable)

2. **If `paymentOption === 'payLater'`**:
   - Validate that order contains services (not rentals-only)
   - Set `advanceAmount: null` and `remainingAmount: null`
   - Don't require payment verification
   - Order status can be `'confirmed'` or `'pending'`

3. **If `paymentOption === 'payNow'`**:
   - Works for both rentals and services
   - Require payment verification for full amount
   - Apply payment discount

#### Order Status Flow

**For `payAdvance` orders (Rentals)**:
- Initial: `'pending'` (advance payment pending)
- After advance payment: `'confirmed'` (booking confirmed)
- After installation: Remaining amount can be collected
- Final: `'delivered'` or `'completed'`

**For `payLater` orders (Services)**:
- Initial: `'pending'` or `'confirmed'` (service scheduled)
- After service completion: Admin updates payment status to `'paid'` when customer pays
- Final: `'completed'`

**For `payNow` orders**:
- Initial: `'pending'` (payment pending)
- After payment: `'confirmed'` or `'paid'`
- Final: `'delivered'` or `'completed'`

#### Admin Order Management
- Admin should be able to see and filter orders by payment option
- For `payAdvance` orders: Show advance amount and remaining amount
- For `payLater` orders: Show payment status and allow updating to `'paid'` after service
- Consider adding badges/filters:
  - "Pay Now" orders
  - "Book Now" orders (payAdvance)
  - "Pay Later" orders

---

## 3. Success Modal Implementation

### Overview
Success modal now properly displays after every successful order placement with the following behavior:
- Shows immediately after order creation
- Displays appropriate message based on payment option
- Auto-closes after 5 seconds with countdown timer
- Can be manually closed by clicking the close button or "View My Orders" button
- Automatically redirects to orders page after closing

### Payment Option Messages

**For `payLater` (Service Orders)**:
- Title: "Service Order Placed Successfully! 🎉"
- Message: "Your service order #[orderId] has been placed successfully! You will pay ₹[amount] after service completion. We are redirecting you to the orders page."
- Auto-redirect: 5 seconds

**For `payNow` or `payAdvance` (Order Created)**:
- Title: "Order Created Successfully! ✅"
- Message: "Your order #[orderId] has been created successfully! Please complete the payment below to confirm your order."
- Auto-redirect: 3 seconds (to allow user to see payment options)

**For `payNow` (After Payment)**:
- Title: "Order Placed Successfully! 🎉"
- Message: "Your order #[orderId] has been placed successfully! Payment completed. We are redirecting you to the orders page."
- Auto-redirect: 5 seconds

### Changes Required
**No backend changes required.** This is purely a frontend implementation.

However, ensure that:
- Order creation endpoint returns complete order data including `orderId`
- Payment verification endpoint returns complete order data
- Order status is properly updated to `'confirmed'` or `'paid'` after payment verification
- Order data includes all necessary fields for display in success modal

---

## 4. Services vs Rentals Separation

### Overview
Frontend now properly distinguishes between services and rentals throughout the application.

### Changes Required
Ensure backend maintains clear separation:

#### Order Items
- `type: 'rental'` - For rental products
- `type: 'service'` - For services

#### Order Creation
- Validate that services and rentals are handled separately
- Services should support `payNow` and `payLater` options
- Rentals should support `payNow` and `payAdvance` options
- Mixed orders (both rentals and services) should support `payNow` and `payAdvance` (rental-based)

#### Order Display
- Ensure order items properly identify their type
- Service items should include `serviceDetails` and `bookingDetails`
- Rental items should include `productDetails` and `deliveryInfo`

---

## Summary of Backend Changes

### Schema Updates
1. **Product Schema**: Add `excludedItems: [String]` to `installationCharges`
2. **Order Schema**: 
   - Verify all three payment options are in enum: `['payNow', 'payAdvance', 'payLater']`
   - Ensure `excludedItems` are stored in order items
   - Ensure `advanceAmount` and `remainingAmount` are properly handled

### API Updates
1. **Product APIs**: Accept and return `excludedItems`
2. **Order APIs**: 
   - Accept all three payment options: `payNow`, `payAdvance`, `payLater`
   - Validate payment option based on order contents (rentals vs services)
   - Return `excludedItems` in order items
   - Handle payment logic for each option correctly

### Validation Rules
1. **Payment Option Validation**:
   - `payAdvance` should only be allowed when order contains rentals
   - `payLater` should only be allowed when order contains services
   - `payNow` is allowed for both rentals and services

### Migration
1. Add `excludedItems: []` to existing products with installation charges
2. Verify existing orders with `payAdvance` or `payLater` still work correctly

### Testing Checklist
- [ ] Create product with excluded items
- [ ] Update product with excluded items
- [ ] Create rental order with `payNow` option
- [ ] Create rental order with `payAdvance` option
- [ ] Create service order with `payNow` option
- [ ] Create service order with `payLater` option
- [ ] Verify excluded items appear in order details
- [ ] Verify `payAdvance` orders show advance and remaining amounts
- [ ] Verify `payLater` orders are created without payment
- [ ] Verify admin can update payment status for `payLater` orders
- [ ] Test order display with excluded items
- [ ] Test validation: `payAdvance` not allowed for services-only
- [ ] Test validation: `payLater` not allowed for rentals-only

---

## Notes

1. **Backward Compatibility**: Ensure that existing orders without `excludedItems` still work correctly (default to empty array).

2. **Payment Flow**: 
   - For `payAdvance` orders: Implement collection of remaining amount after installation
   - For `payLater` orders: Implement payment collection after service completion
   - Consider payment link generation for both scenarios

3. **Order Status**: Consider adding order statuses:
   - `'awaiting_advance_payment'` for payAdvance orders
   - `'awaiting_final_payment'` for payAdvance orders after installation
   - `'service_completed'` for payLater orders after service
   - `'awaiting_payment'` for payLater orders after service completion

4. **Admin Dashboard**: Consider adding:
   - Filter for payment options (Pay Now, Book Now, Pay Later)
   - Quick action to mark payment as received for payLater orders
   - Dashboard widget showing pending payments by type
   - Remaining amount collection interface for payAdvance orders

---

## API Examples

### Create Product with Excluded Items
```json
POST /api/admin/products
{
  "category": "AC",
  "brand": "LG",
  "model": "1.5 Ton Split AC",
  "installationCharges": {
    "amount": 2499,
    "includedItems": ["Cable (3m) + 3pin plug", "Installation labor"],
    "excludedItems": ["Wall drilling", "Additional wiring beyond 3m"],
    "extraMaterialRates": {
      "copperPipe": 900,
      "drainPipe": 100,
      "electricWire": 120
    }
  }
}
```

### Create Rental Order with Pay Advance (Book Now)
```json
POST /api/orders
{
  "items": [
    {
      "type": "rental",
      "productId": "product_id",
      "price": 15000,
      "duration": 12,
      "productDetails": { ... },
      "deliveryInfo": { ... }
    }
  ],
  "paymentOption": "payAdvance",
  "paymentStatus": "pending",
  "advanceAmount": 999,
  "remainingAmount": 14001,
  "finalTotal": 15000
}
```

### Create Service Order with Pay Later
```json
POST /api/orders
{
  "items": [
    {
      "type": "service",
      "serviceId": "service_id",
      "price": 1999,
      "serviceDetails": { ... },
      "bookingDetails": { ... }
    }
  ],
  "paymentOption": "payLater",
  "paymentStatus": "pending",
  "advanceAmount": null,
  "remainingAmount": null,
  "finalTotal": 1999
}
```

### Create Service Order with Pay Now
```json
POST /api/orders
{
  "items": [
    {
      "type": "service",
      "serviceId": "service_id",
      "price": 1999,
      "serviceDetails": { ... },
      "bookingDetails": { ... }
    }
  ],
  "paymentOption": "payNow",
  "paymentStatus": "pending",
  "finalTotal": 1799,
  "paymentDiscount": 200
}
```

### Get Order with Excluded Items
```json
GET /api/orders/:orderId
{
  "orderId": "ORD-2024-001",
  "paymentOption": "payAdvance",
  "advanceAmount": 999,
  "remainingAmount": 14001,
  "items": [
    {
      "type": "rental",
      "productDetails": {
        "installationCharges": {
          "amount": 2499,
          "includedItems": ["Cable (3m) + 3pin plug"],
          "excludedItems": ["Wall drilling", "Additional wiring beyond 3m"],
          "extraMaterialRates": { ... }
        }
      }
    }
  ]
}
```

---

## Payment Option Summary

| Payment Option | Allowed For | Description | Payment Required |
|---------------|-------------|-------------|------------------|
| `payNow` | Rentals & Services | Pay full amount upfront with discount | Yes, immediate |
| `payAdvance` | Rentals only | Book with advance payment, remaining after installation | Yes, advance amount only |
| `payLater` | Services only | Pay after service completion | No, after service |

---

**Last Updated**: January 2026
**Version**: 2.0.0
