# Backend Implementation: Pay Later Option for Rental Products

## Overview

This document outlines the backend implementation requirements for adding "Pay Later" payment option for rental products. Previously, "Pay Later" was only available for services. Now it should also be available for rental products, where users will pay after installation completion.

---

## Table of Contents

1. [Feature Summary](#1-feature-summary)
2. [Order Schema Updates](#2-order-schema-updates)
3. [Order Creation Endpoint](#3-order-creation-endpoint)
4. [Payment Status Handling](#4-payment-status-handling)
5. [Order Status Workflow](#5-order-status-workflow)
6. [Admin Updates](#6-admin-updates)
7. [API Endpoint Updates](#7-api-endpoint-updates)
8. [Testing Requirements](#8-testing-requirements)
9. [Migration Notes](#9-migration-notes)

---

## 1. Feature Summary

### What Changed
- **Pay Later** option is now available for **both rentals and services**
- For rentals: Users pay after installation completion
- For services: Users pay after service completion
- Payment status remains `pending` until payment is collected after installation/service

### Payment Options
1. **Pay Now** (`payNow`) - Full payment upfront with discount (applies to both rentals and services)
2. **Pay Advance** (`payAdvance`) - Advance payment for rentals only (₹999 or calculated amount)
3. **Pay Later** (`payLater`) - Pay after installation/service (NEW for rentals, existing for services)

---

## 2. Order Schema Updates

### Payment Option Enum

The `paymentOption` field in the Order schema should accept all three values:

```javascript
paymentOption: {
  type: String,
  enum: ['payNow', 'payAdvance', 'payLater'], // All three should be supported
  required: true,
  default: 'payNow'
}
```

### Payment Status

The `paymentStatus` field should handle `payLater` orders:

```javascript
paymentStatus: {
  type: String,
  enum: ['pending', 'paid', 'failed', 'refunded'],
  default: 'pending',
  required: true
}
```

**Important Notes:**
- For `payLater` orders: `paymentStatus` should be set to `pending` initially
- After installation/service completion and payment collection: Update to `paid`
- No payment gateway integration needed for `payLater` orders at creation time

### Order Status

For rental orders with `payLater`, the order status workflow should be:

```javascript
status: {
  type: String,
  enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'installed', 'completed', 'cancelled'],
  default: 'pending',
  required: true
}
```

**Status Flow for Pay Later Rentals:**
1. Order created → `status: 'pending'`, `paymentStatus: 'pending'`
2. Admin confirms order → `status: 'confirmed'`
3. Product shipped → `status: 'shipped'`
4. Product delivered → `status: 'delivered'`
5. Installation scheduled/completed → `status: 'installed'`
6. Payment collected after installation → `paymentStatus: 'paid'`, `status: 'completed'`

---

## 3. Order Creation Endpoint

### Endpoint: `POST /api/orders`

### Request Body (Pay Later for Rentals)

```json
{
  "orderId": "ORD-2024-123",
  "items": [
    {
      "type": "rental",
      "productId": "product_id_here",
      "quantity": 1,
      "price": 5000,
      "installationCharges": 1000,
      "duration": 6,
      "productDetails": {
        "brand": "LG",
        "model": "1.5 Ton Split AC",
        "capacity": "1.5",
        "productType": "Split",
        "location": "Delhi"
      },
      "deliveryInfo": {
        "address": "123 Main St",
        "nearLandmark": "Near Metro",
        "pincode": "110001",
        "contactName": "John Doe",
        "contactPhone": "+919999999999"
      }
    }
  ],
  "total": 6000,
  "productDiscount": 0,
  "discount": 0,
  "couponDiscount": 0,
  "paymentDiscount": 0,
  "finalTotal": 6000,
  "paymentOption": "payLater",
  "paymentStatus": "pending",
  "priorityServiceScheduling": false,
  "advanceAmount": null,
  "remainingAmount": null,
  "customerInfo": {
    "userId": "user_id_here",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+919999999999",
    "address": {
      "homeAddress": "123 Main St",
      "nearLandmark": "Near Metro",
      "pincode": "110001"
    }
  },
  "deliveryAddresses": [
    {
      "type": "rental",
      "address": "123 Main St",
      "nearLandmark": "Near Metro",
      "pincode": "110001",
      "contactName": "John Doe",
      "contactPhone": "+919999999999"
    }
  ],
  "orderDate": "2024-12-20T10:00:00.000Z",
  "notes": "Order contains rental products - Pay Later option selected"
}
```

### Validation Rules

1. **Payment Option Validation:**
   ```javascript
   // Allow payLater for both rentals and services
   if (paymentOption === 'payLater') {
     // Valid for both rental and service orders
     // No advance amount should be required
     // Payment status should be 'pending'
   }
   ```

2. **Payment Status:**
   - For `payLater`: Always set `paymentStatus: 'pending'`
   - For `payNow` or `payAdvance`: Set `paymentStatus: 'pending'` initially (will be updated after payment verification)

3. **Advance Amount:**
   - For `payLater`: `advanceAmount` should be `null`
   - For `payAdvance`: `advanceAmount` should be calculated (₹999 or configured amount)
   - For `payNow`: `advanceAmount` should be `null`

### Response

```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "orderId": "ORD-2024-123",
    "paymentOption": "payLater",
    "paymentStatus": "pending",
    "status": "pending",
    "finalTotal": 6000,
    "advanceAmount": null,
    "remainingAmount": null,
    "createdAt": "2024-12-20T10:00:00.000Z"
  }
}
```

---

## 4. Payment Status Handling

### Payment Status Update Endpoint

When payment is collected after installation, update the order:

**Endpoint:** `PATCH /api/orders/:orderId/payment-status`

**Request:**
```json
{
  "paymentStatus": "paid",
  "paymentMethod": "cash" | "online" | "upi",
  "paymentReference": "optional_reference_id",
  "notes": "Payment collected after installation"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment status updated successfully",
  "data": {
    "orderId": "ORD-2024-123",
    "paymentStatus": "paid",
    "status": "completed",
    "updatedAt": "2024-12-20T15:00:00.000Z"
  }
}
```

### Payment Collection Logic

```javascript
// When admin collects payment after installation
async function updatePaymentStatus(orderId, paymentData) {
  const order = await Order.findById(orderId);
  
  if (!order) {
    throw new Error('Order not found');
  }
  
  if (order.paymentOption === 'payLater' && order.paymentStatus === 'pending') {
    // Update payment status
    order.paymentStatus = 'paid';
    order.paymentMethod = paymentData.paymentMethod;
    order.paymentReference = paymentData.paymentReference || null;
    order.paidAt = new Date();
    
    // Update order status if installation is complete
    if (order.status === 'installed') {
      order.status = 'completed';
    }
    
    await order.save();
    
    // Send confirmation notification
    if (order.customerInfo.email) {
      await sendPaymentConfirmationEmail(order);
    }
    
    return order;
  }
  
  throw new Error('Payment status cannot be updated for this order');
}
```

---

## 5. Order Status Workflow

### For Pay Later Rental Orders

```
1. Order Created
   - status: 'pending'
   - paymentStatus: 'pending'
   - paymentOption: 'payLater'

2. Admin Confirms Order
   - status: 'confirmed'
   - paymentStatus: 'pending'

3. Product Processing/Shipping
   - status: 'processing' → 'shipped'

4. Product Delivered
   - status: 'delivered'
   - paymentStatus: 'pending' (still pending)

5. Installation Scheduled/Completed
   - status: 'installed'
   - paymentStatus: 'pending' (awaiting payment)

6. Payment Collected
   - paymentStatus: 'paid'
   - status: 'completed'
   - paidAt: timestamp
```

### Important Notes

- For `payLater` orders, `paymentStatus` remains `pending` until payment is collected
- Order status can progress through delivery and installation stages without payment
- Payment should be collected after installation completion
- Once payment is collected, mark order as `completed`

---

## 6. Admin Updates

### Admin Dashboard - Orders List

1. **Display Pay Later Status:**
   - Show "Pay Later" badge for orders with `paymentOption: 'payLater'`
   - Show "Payment Pending" status for unpaid payLater orders
   - Highlight orders awaiting payment collection

2. **Order Details Page:**
   - Display payment option clearly
   - Show payment status prominently
   - For payLater orders: Show "Awaiting Payment After Installation"
   - Add "Mark Payment Received" button for payLater orders with status 'installed'

3. **Payment Collection Feature:**
   ```javascript
   // Admin can mark payment as received
   PATCH /api/admin/orders/:orderId/mark-payment-received
   {
     "paymentMethod": "cash" | "online" | "upi",
     "paymentReference": "optional",
     "notes": "Payment collected after installation"
   }
   ```

### Admin Order Management

1. **Filter Orders:**
   - Filter by payment option: `payNow`, `payAdvance`, `payLater`
   - Filter by payment status: `pending`, `paid`, `failed`
   - Filter by order status

2. **Reports:**
   - Track payLater orders separately
   - Monitor pending payments
   - Generate payment collection reports

---

## 7. API Endpoint Updates

### 7.1 Get Orders Endpoint

**Endpoint:** `GET /api/orders` or `GET /api/user/orders`

**Response should include:**
```json
{
  "success": true,
  "data": [
    {
      "orderId": "ORD-2024-123",
      "paymentOption": "payLater",
      "paymentStatus": "pending",
      "status": "installed",
      "finalTotal": 6000,
      "advanceAmount": null,
      "remainingAmount": null,
      "items": [...]
    }
  ]
}
```

### 7.2 Get Order Details

**Endpoint:** `GET /api/orders/:orderId`

**Response should include payment information:**
```json
{
  "success": true,
  "data": {
    "orderId": "ORD-2024-123",
    "paymentOption": "payLater",
    "paymentStatus": "pending",
    "status": "installed",
    "finalTotal": 6000,
    "paymentMessage": "You will pay ₹6,000.00 after installation completion",
    "items": [...]
  }
}
```

### 7.3 Admin Update Order Status

**Endpoint:** `PATCH /api/admin/orders/:orderId/status`

**Request:**
```json
{
  "status": "installed"
}
```

**For Pay Later Orders:**
- When status is updated to `installed`, the order should remain with `paymentStatus: 'pending'`
- Admin should then be able to mark payment as received

---

## 8. Testing Requirements

### Test Cases

1. **Order Creation with Pay Later (Rentals):**
   - ✅ Create rental order with `paymentOption: 'payLater'`
   - ✅ Verify `paymentStatus` is set to `pending`
   - ✅ Verify `advanceAmount` is `null`
   - ✅ Verify order is created successfully without payment

2. **Order Status Updates:**
   - ✅ Verify order status can progress from `pending` → `confirmed` → `shipped` → `delivered` → `installed` without payment
   - ✅ Verify `paymentStatus` remains `pending` throughout

3. **Payment Collection:**
   - ✅ Admin can mark payment as received after installation
   - ✅ Verify `paymentStatus` updates to `paid`
   - ✅ Verify order status updates to `completed`

4. **Order Retrieval:**
   - ✅ User can view their payLater orders
   - ✅ Payment status is clearly displayed
   - ✅ Order details show payment message

5. **Validation:**
   - ✅ PayLater option is accepted for rental orders
   - ✅ Payment status validation works correctly
   - ✅ No payment gateway integration for payLater orders

6. **Edge Cases:**
   - ✅ Mixed orders (rentals + services) with payLater
   - ✅ Order cancellation before payment collection
   - ✅ Payment collection workflow

---

## 9. Migration Notes

### Existing Data

1. **Existing Orders:**
   - Existing orders with `paymentOption: 'payLater'` should continue to work (these were services)
   - No data migration needed

2. **Schema Updates:**
   - Ensure `paymentOption` enum includes `'payLater'` (should already be there)
   - Verify order schema accepts `payLater` for both rental and service orders
   - No breaking changes required

### Backward Compatibility

1. **Existing Service Orders:**
   - Service orders with `payLater` should continue to work as before
   - No changes needed to existing service payment flow

2. **Existing Rental Orders:**
   - Rental orders with `payNow` or `payAdvance` continue to work
   - New rental orders can use `payLater` option

---

## 10. Email Notifications

### Order Confirmation Email (Pay Later Rentals)

```javascript
Subject: Order Confirmed - Pay After Installation

Dear [Customer Name],

Your order #ORD-2024-123 has been confirmed!

Order Details:
- Product: [Product Name]
- Total Amount: ₹[Amount]
- Payment Option: Pay After Installation
- Payment Status: Pending

You will pay ₹[Amount] after the installation is completed.

Our team will contact you soon to schedule the installation.

Thank you for your order!
```

### Payment Collection Email (After Installation)

```javascript
Subject: Payment Received - Order #ORD-2024-123

Dear [Customer Name],

We have received your payment for order #ORD-2024-123.

Payment Details:
- Amount: ₹[Amount]
- Payment Method: [Cash/Online/UPI]
- Payment Date: [Date]

Your order has been completed successfully.

Thank you for your business!
```

---

## 11. Implementation Checklist

### Backend Tasks

- [ ] Update order schema validation to accept `payLater` for rental orders
- [ ] Update order creation endpoint to handle `payLater` for rentals
- [ ] Ensure `paymentStatus` is set to `pending` for `payLater` orders
- [ ] Implement payment collection endpoint for admin
- [ ] Update order status workflow to support payLater
- [ ] Add payment status update logic after installation
- [ ] Update admin order management UI/API
- [ ] Add email notifications for payLater orders
- [ ] Update order retrieval endpoints to show payment information
- [ ] Add validation for payment collection
- [ ] Test all payment flows

### Testing

- [ ] Test order creation with payLater for rentals
- [ ] Test order status updates for payLater orders
- [ ] Test payment collection workflow
- [ ] Test admin payment marking feature
- [ ] Test email notifications
- [ ] Test mixed orders (rentals + services) with payLater
- [ ] Test edge cases and error handling

---

## 12. Summary

### Key Changes Required

1. **Order Creation:**
   - Accept `paymentOption: 'payLater'` for rental orders
   - Set `paymentStatus: 'pending'` for payLater orders
   - Set `advanceAmount: null` for payLater orders

2. **Order Status Workflow:**
   - Allow order status to progress without payment for payLater orders
   - Payment collection happens after installation completion

3. **Payment Collection:**
   - Admin can mark payment as received after installation
   - Update `paymentStatus` from `pending` to `paid`
   - Mark order as `completed` after payment

4. **Admin Features:**
   - Display payLater orders prominently
   - Provide payment collection interface
   - Track pending payments

### No Breaking Changes

- Existing service orders with payLater continue to work
- Existing rental orders with payNow/payAdvance continue to work
- All existing APIs remain compatible

---

## Contact

For any questions or clarifications regarding this implementation, please refer to the frontend code in `src/pages/user/Checkout.js` to understand the expected behavior.

**Last Updated:** December 2024

