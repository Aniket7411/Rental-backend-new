# Backend Implementation: Pending Order Payment Retry

## Overview
This document outlines the backend requirements for handling pending order payment retry functionality. When a user cancels payment or payment fails, the order remains in "pending" status. Users should be able to retry payment by clicking "Pay Now" from their orders page, which redirects them to `/user/checkout?orderId=<orderId>`.

## Current Flow
1. User places an order → Order created with status "pending" and paymentStatus "pending"
2. User cancels payment or payment fails → Order remains in "pending" status
3. User clicks "Pay Now" from orders page → Redirected to `/user/checkout?orderId=<orderId>`
4. Frontend loads order and shows payment interface
5. User completes payment → Order status updated to "confirmed" and paymentStatus to "paid"

## Required Backend Endpoints

### 1. Get Order by ID (Already Exists - Verify Implementation)

**Endpoint:** `GET /api/orders/:orderId`

**Purpose:** Fetch order details by orderId for payment retry

**Request:**
```
GET /api/orders/6965d46e80fb811d268c51b0
Headers: {
  Authorization: Bearer <token>
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "_id": "6965d46e80fb811d268c51b0",
    "orderId": "ORD-2024-001",
    "userId": "user_id_here",
    "status": "pending",
    "paymentStatus": "pending",
    "paymentOption": "payNow", // or "payAdvance", "payLater"
    "items": [
      {
        "type": "rental",
        "productId": "product_id",
        "name": "AC Name",
        "quantity": 1,
        "price": 5000,
        "duration": 3
      }
    ],
    "subtotal": 5000,
    "productDiscount": 0,
    "paymentDiscount": 250, // 5% discount for payNow
    "couponDiscount": 0,
    "finalTotal": 4750,
    "advanceAmount": null, // Only for payAdvance
    "address": {
      "homeAddress": "Complete address",
      "pincode": "123456",
      "nearLandmark": "Near landmark"
    },
    "createdAt": "2024-01-20T10:00:00.000Z",
    "updatedAt": "2024-01-20T10:00:00.000Z"
  }
}
```

**Response (Error - 404):**
```json
{
  "success": false,
  "message": "Order not found"
}
```

**Response (Error - 403):**
```json
{
  "success": false,
  "message": "You do not have permission to access this order"
}
```

**Backend Requirements:**
- ✅ Verify user authentication (JWT token)
- ✅ Verify order belongs to the authenticated user
- ✅ Return complete order details including all calculated amounts
- ✅ Include paymentOption, finalTotal, advanceAmount (if applicable)
- ✅ Return order status and paymentStatus

### 2. Payment Verification (Already Exists - Verify Implementation)

**Endpoint:** `POST /api/orders/:orderId/verify-payment`

**Purpose:** Verify payment for pending orders (retry payment)

**Request:**
```json
{
  "razorpay_order_id": "order_xyz123",
  "razorpay_payment_id": "pay_abc456",
  "razorpay_signature": "signature_here"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "order": {
      "_id": "6965d46e80fb811d268c51b0",
      "orderId": "ORD-2024-001",
      "status": "confirmed",
      "paymentStatus": "paid",
      "paymentDetails": {
        "razorpay_order_id": "order_xyz123",
        "razorpay_payment_id": "pay_abc456",
        "paidAt": "2024-01-20T11:00:00.000Z"
      },
      "updatedAt": "2024-01-20T11:00:00.000Z"
    }
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Payment verification failed",
  "error": "SIGNATURE_MISMATCH" // or "AMOUNT_MISMATCH", "ORDER_NOT_FOUND"
}
```

**Backend Requirements:**
- ✅ Verify Razorpay signature
- ✅ Verify payment amount matches order amount (finalTotal or advanceAmount)
- ✅ Update order status from "pending" to "confirmed"
- ✅ Update paymentStatus from "pending" to "paid"
- ✅ Save payment details (razorpay_order_id, razorpay_payment_id, paidAt)
- ✅ Handle duplicate payment attempts (don't process same payment twice)
- ✅ Return updated order object

### 3. Create Razorpay Order (Already Exists - Verify Implementation)

**Endpoint:** `POST /api/orders/:orderId/create-razorpay-order`

**Purpose:** Create Razorpay order for pending order payment retry

**Request:**
```json
{
  "amount": 4750 // finalTotal or advanceAmount in paise
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "razorpay_order_id": "order_xyz123",
    "amount": 475000, // in paise
    "currency": "INR"
  }
}
```

**Backend Requirements:**
- ✅ Verify order exists and belongs to user
- ✅ Verify order status is "pending"
- ✅ Verify paymentStatus is "pending"
- ✅ Use order's finalTotal or advanceAmount (based on paymentOption)
- ✅ Create Razorpay order with correct amount
- ✅ Return razorpay_order_id for frontend

## Business Logic Requirements

### Order Status Flow
```
pending (payment pending) 
  → [Payment Success] 
  → confirmed (payment paid)
  
pending (payment pending)
  → [Payment Failed/Cancelled]
  → pending (payment pending) [Can retry]
```

### Payment Amount Logic
1. **For payNow:** Use `finalTotal` (includes all discounts)
2. **For payAdvance:** Use `advanceAmount` (booking amount)
3. **For payLater:** No payment required at checkout

### Security Requirements
1. **User Authorization:**
   - Only order owner can retry payment
   - Verify JWT token on all endpoints
   - Check userId matches order.userId

2. **Order Validation:**
   - Only "pending" orders can be paid
   - Only orders with paymentStatus "pending" can be paid
   - Cancelled orders cannot be paid
   - Already paid orders should return appropriate message

3. **Payment Validation:**
   - Verify Razorpay signature
   - Verify payment amount matches order amount exactly
   - Prevent duplicate payment processing
   - Handle race conditions (multiple payment attempts)

### Error Handling

**Order Not Found:**
```json
{
  "success": false,
  "message": "Order not found"
}
```

**Order Already Paid:**
```json
{
  "success": false,
  "message": "This order has already been paid"
}
```

**Order Cancelled:**
```json
{
  "success": false,
  "message": "This order has been cancelled and cannot be paid"
}
```

**Unauthorized Access:**
```json
{
  "success": false,
  "message": "You do not have permission to access this order"
}
```

**Payment Amount Mismatch:**
```json
{
  "success": false,
  "message": "Payment amount mismatch",
  "error": "AMOUNT_MISMATCH",
  "details": {
    "expectedAmount": 4750,
    "providedAmount": 5000
  }
}
```

## Database Schema Requirements

### Orders Collection
```javascript
{
  _id: ObjectId,
  orderId: String, // Unique order identifier (e.g., "ORD-2024-001")
  userId: ObjectId, // Reference to User
  status: String, // "pending", "confirmed", "processing", "shipped", "delivered", "completed", "cancelled"
  paymentStatus: String, // "pending", "paid", "failed", "refunded"
  paymentOption: String, // "payNow", "payAdvance", "payLater"
  items: Array, // Order items
  subtotal: Number,
  productDiscount: Number,
  paymentDiscount: Number,
  couponDiscount: Number,
  finalTotal: Number,
  advanceAmount: Number, // Only for payAdvance
  address: Object,
  paymentDetails: {
    razorpay_order_id: String,
    razorpay_payment_id: String,
    paidAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

## Testing Scenarios

### Scenario 1: Successful Payment Retry
1. User has pending order with orderId
2. User navigates to `/user/checkout?orderId=<orderId>`
3. Frontend loads order details
4. User clicks "Pay Now"
5. Payment gateway opens
6. User completes payment
7. Backend verifies payment
8. Order status updated to "confirmed"
9. PaymentStatus updated to "paid"

### Scenario 2: Payment Cancellation
1. User has pending order
2. User starts payment
3. User cancels payment
4. Order remains in "pending" status
5. User can retry payment later

### Scenario 3: Payment Failure
1. User has pending order
2. Payment fails (insufficient funds, network error, etc.)
3. Order remains in "pending" status
4. User can retry payment later

### Scenario 4: Unauthorized Access
1. User A tries to access User B's order
2. Backend returns 403 Forbidden
3. Frontend shows error message

### Scenario 5: Already Paid Order
1. User tries to pay for already paid order
2. Backend returns appropriate message
3. Frontend redirects to order details

### Scenario 6: Cancelled Order
1. User tries to pay for cancelled order
2. Backend returns error
3. Frontend shows "Order cancelled" message

## Frontend Integration Points

### 1. Load Pending Order
```javascript
// Frontend calls: GET /api/orders/:orderId
const response = await apiService.getOrderById(orderId);
if (response.success && response.data.status === 'pending') {
  // Show payment interface
}
```

### 2. Create Razorpay Order
```javascript
// Frontend calls: POST /api/orders/:orderId/create-razorpay-order
const response = await apiService.createRazorpayOrder(orderId, amount);
// Use response.data.razorpay_order_id for Razorpay checkout
```

### 3. Verify Payment
```javascript
// Frontend calls: POST /api/orders/:orderId/verify-payment
const response = await apiService.verifyPayment(orderId, paymentData);
if (response.success) {
  // Order confirmed, show success message
}
```

## Priority

**CRITICAL PRIORITY** - This is a delivery day requirement. Users must be able to retry payment for pending orders without issues.

## Implementation Checklist

- [ ] Verify `GET /api/orders/:orderId` endpoint exists and returns complete order data
- [ ] Verify `POST /api/orders/:orderId/verify-payment` handles pending orders correctly
- [ ] Verify `POST /api/orders/:orderId/create-razorpay-order` works for pending orders
- [ ] Add user authorization check (order belongs to user)
- [ ] Add order status validation (only pending orders can be paid)
- [ ] Add payment amount validation (must match order amount)
- [ ] Add duplicate payment prevention
- [ ] Test all error scenarios
- [ ] Test payment retry flow end-to-end
- [ ] Verify order status updates correctly after payment

## Notes

1. **Order Amount Calculation:** The backend must return the exact amount that was calculated when the order was created. This includes:
   - Product discounts
   - Payment discounts (payNow discount, advance payment discount)
   - Coupon discounts
   - Final total or advance amount

2. **Payment Retry:** Users should be able to retry payment multiple times until successful or order is cancelled.

3. **Order Locking:** Consider implementing order locking during payment to prevent race conditions.

4. **Payment History:** Consider logging all payment attempts for audit purposes.

5. **Email Notifications:** Send confirmation email when payment is successful for pending order retry.

## API Endpoint Summary

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/orders/:orderId` | GET | Get order details | Yes |
| `/api/orders/:orderId/create-razorpay-order` | POST | Create Razorpay order | Yes |
| `/api/orders/:orderId/verify-payment` | POST | Verify payment | Yes |

## Frontend Changes Summary

The frontend has been updated to:
1. ✅ Read orderId from URL parameters
2. ✅ Load order details when orderId is present
3. ✅ Show payment interface for pending orders
4. ✅ Handle different order statuses (pending, paid, cancelled)
5. ✅ Display appropriate messages for payment retry

Backend must support these frontend changes to ensure seamless payment retry experience.

