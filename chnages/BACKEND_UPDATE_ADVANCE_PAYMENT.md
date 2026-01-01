# Backend Update - Advance Payment Feature

## Date: Weekend Update
## Feature: Advance Payment with 5% Discount and Priority Service Scheduling

---

## Overview
This document describes the backend changes required to support the new "Pay Advance" payment option that provides:
1. **5% Additional Discount** on the total order amount
2. **Priority Service Scheduling** for orders paid with advance payment

---

## Changes Required

### 1. Order Model Updates

#### New Fields to Add:
```javascript
{
  // ... existing order fields ...
  
  priorityServiceScheduling: {
    type: Boolean,
    default: false,
    description: 'Indicates if order has priority service scheduling (true for advance payment orders)'
  },
  
  advanceAmount: {
    type: Number,
    default: null,
    description: 'Advance payment amount (₹999) for advance payment orders'
  },
  
  remainingAmount: {
    type: Number,
    default: null,
    description: 'Remaining amount to be paid after installation for advance payment orders'
  }
}
```

#### Payment Option Field Update:
The `paymentOption` field should now accept three values:
- `'payNow'` - Full payment upfront with instant discount
- `'payAdvance'` - Advance payment (₹999) with 5% discount and priority scheduling
- `'payLater'` - Payment after service completion/delivery (no discount)

---

### 2. Order Creation Endpoint (`POST /api/orders`)

#### Request Body Changes:

The order creation request now includes these additional fields when `paymentOption === 'payAdvance'`:

```json
{
  // ... existing order fields ...
  
  "paymentOption": "payAdvance",
  "priorityServiceScheduling": true,
  "advanceAmount": 999,
  "remainingAmount": <calculated remaining amount>,
  "paymentDiscount": <5% discount amount>,
  "finalTotal": <total after discount>,
  
  // ... rest of order data ...
}
```

#### Example Request:

```json
{
  "orderId": "ORD-2025-001",
  "items": [
    {
      "type": "service",
      "serviceId": "service123",
      "quantity": 1,
      "price": 1000,
      "serviceDetails": {
        "title": "AC Cleaning Service",
        "description": "Complete AC cleaning service"
      },
      "bookingDetails": {
        "name": "John Doe",
        "phone": "+919876543210",
        "preferredDate": "2025-01-20",
        "preferredTime": "10-12",
        "address": "123 Main Street, Mumbai"
      }
    }
  ],
  "total": 1000,
  "paymentDiscount": 50,
  "finalTotal": 950,
  "paymentOption": "payAdvance",
  "priorityServiceScheduling": true,
  "advanceAmount": 999,
  "remainingAmount": -49,
  "paymentStatus": "pending",
  "customerInfo": {
    "userId": "user123",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+919876543210"
  }
}
```

**Note:** The `remainingAmount` can be negative if the advance payment (₹999) exceeds the discounted total. The backend should handle this appropriately (either adjust the advance amount or set remaining to 0).

---

### 3. Payment Processing Updates

#### For Advance Payment Orders:

1. **Initial Payment**: When order is created with `paymentOption: 'payAdvance'`, the initial payment should be processed for **₹999** (not the full `finalTotal`).

2. **Payment Status**: After ₹999 payment is confirmed:
   ```javascript
   paymentStatus: 'advance_paid'  // or keep as 'paid' with additional flag
   ```

3. **Remaining Payment**: The remaining amount should be collected:
   - After installation (for rentals)
   - After service completion (for services)
   - The `remainingAmount` field tracks how much is left to pay

#### Payment Status Values:
Consider adding these status values:
- `'pending'` - No payment received
- `'advance_paid'` - Advance payment (₹999) received
- `'partial'` - Partial payment received (for advance payments)
- `'paid'` - Full payment received
- `'refunded'` - Payment refunded

---

### 4. Service Scheduling Logic

#### Priority Scheduling Implementation:

When `priorityServiceScheduling: true`:

1. **Service Booking Queries**: When querying service bookings, prioritize orders with `priorityServiceScheduling: true`:
   ```javascript
   // Example query
   const bookings = await ServiceBooking.find({
     status: 'pending',
     preferredDate: date
   }).sort({ priorityServiceScheduling: -1, createdAt: 1 });
   ```

2. **Admin Dashboard**: 
   - Display priority bookings with a badge/indicator
   - Sort/filter options to show priority bookings first
   - Alert admins when priority bookings are pending

3. **Notification System**:
   - Send priority notifications for advance payment orders
   - Ensure faster response times for priority bookings

---

### 5. Order Validation

Add validation to ensure:

1. **Advance Payment Amount**: 
   - `advanceAmount` should be exactly 999 when `paymentOption === 'payAdvance'`
   - `advanceAmount` should be null/undefined for other payment options

2. **Priority Scheduling**:
   - `priorityServiceScheduling` should be `true` only when `paymentOption === 'payAdvance'`
   - `priorityServiceScheduling` should be `false` for other payment options

3. **Discount Calculation**:
   - Verify that `paymentDiscount` is correctly calculated (5% of subtotal for advance payment)
   - Ensure `finalTotal` accounts for the advance payment discount

---

### 6. Database Migration

#### Migration Script:

```javascript
// Migration: Add advance payment fields to orders collection

db.orders.updateMany(
  {},
  {
    $set: {
      priorityServiceScheduling: false,
      advanceAmount: null,
      remainingAmount: null
    }
  }
);
```

---

### 7. API Response Updates

#### Order Response Format:

When fetching orders, include the new fields:

```json
{
  "success": true,
  "data": {
    "_id": "order123",
    "orderId": "ORD-2025-001",
    "paymentOption": "payAdvance",
    "priorityServiceScheduling": true,
    "advanceAmount": 999,
    "remainingAmount": 100,
    "paymentStatus": "advance_paid",
    "total": 1000,
    "paymentDiscount": 50,
    "finalTotal": 950,
    // ... other order fields ...
  }
}
```

---

### 8. Admin Dashboard Updates

#### Order Management:

1. **Priority Badge**: Display a "Priority" badge on orders with `priorityServiceScheduling: true`

2. **Filtering**: Add filter option for priority orders

3. **Sorting**: Default sort should prioritize orders with `priorityServiceScheduling: true`

4. **Service Booking List**: 
   - Highlight priority bookings
   - Sort priority bookings first
   - Show priority indicator in booking cards

---

### 9. Service Booking Updates

#### Service Booking Model:

If service bookings are stored separately, add priority flag:

```javascript
{
  // ... existing fields ...
  
  priorityScheduling: {
    type: Boolean,
    default: false
  },
  
  orderId: {
    type: String,
    required: true
  }
}
```

#### Query Priority Bookings:

```javascript
// Get priority bookings for a date
const priorityBookings = await ServiceBooking.find({
  preferredDate: date,
  priorityScheduling: true,
  status: 'pending'
}).sort({ createdAt: 1 });
```

---

### 10. Testing Checklist

- [ ] Create order with `paymentOption: 'payAdvance'`
- [ ] Verify `priorityServiceScheduling` is set to `true`
- [ ] Verify `advanceAmount` is set to `999`
- [ ] Verify `remainingAmount` is calculated correctly
- [ ] Verify `paymentDiscount` is 5% of subtotal
- [ ] Process payment for ₹999 and verify status update
- [ ] Test priority sorting in service booking queries
- [ ] Test admin dashboard displays priority badge
- [ ] Test order validation rejects invalid advance payment data
- [ ] Test migration script updates existing orders correctly
- [ ] Verify remaining payment collection after service completion

---

### 11. Edge Cases to Handle

1. **Negative Remaining Amount**: 
   - If `finalTotal < 999`, set `remainingAmount` to 0
   - Consider refunding excess amount or adjusting advance payment

2. **Refund Handling**:
   - Handle refunds for advance payment orders
   - Track refund status separately

3. **Order Cancellation**:
   - Refund advance payment if order is cancelled
   - Update priority scheduling flag

4. **Multiple Payment Methods**:
   - Ensure only one payment option per order
   - Validate payment option consistency

---

### 12. Database Indexes

Consider adding indexes for performance:

```javascript
// Index for priority scheduling queries
db.orders.createIndex({ 
  priorityServiceScheduling: 1, 
  createdAt: 1 
});

// Index for payment option filtering
db.orders.createIndex({ 
  paymentOption: 1, 
  paymentStatus: 1 
});

// Index for service booking priority
db.servicebookings.createIndex({ 
  priorityScheduling: 1, 
  preferredDate: 1, 
  status: 1 
});
```

---

### 13. Email Notifications

Update email templates to include:

1. **Advance Payment Confirmation**: 
   - Mention ₹999 advance payment received
   - Show remaining amount to be paid
   - Highlight priority scheduling benefit

2. **Service Booking Confirmation**:
   - Mention priority scheduling for advance payment orders
   - Highlight faster service delivery

---

## Summary

This update adds support for advance payment option with:
- ✅ 5% discount on total order amount
- ✅ Priority service scheduling flag
- ✅ ₹999 advance payment amount tracking
- ✅ Remaining amount tracking
- ✅ Enhanced order management for priority bookings

All changes are backward compatible - existing orders without these fields will default to `priorityServiceScheduling: false` and `advanceAmount: null`.

---

## Contact
For questions or clarifications, contact: +91 8169535736

