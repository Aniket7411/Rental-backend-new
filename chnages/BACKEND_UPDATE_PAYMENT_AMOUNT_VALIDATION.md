# Backend Update: Payment Amount Validation

## Issue Description
Payment initiation is failing with the error:
```
Failed to initiate payment. Payment amount (₹5266.8) does not match order total (₹5255.25)
```

This occurs when creating a Razorpay payment order. The payment amount sent from the frontend doesn't match the order's `finalTotal` stored in the database.

## Root Cause
1. **Floating Point Precision**: Different calculation paths may result in slightly different values due to floating point arithmetic
2. **Rounding Inconsistencies**: Amounts may be rounded at different stages, causing mismatches
3. **Backend Recalculation**: Backend might be recalculating the amount instead of using the stored `finalTotal`

## Frontend Fixes Applied

### 1. Use Order's FinalTotal from Backend Response
**File:** `src/pages/user/Checkout.js`

**Fix:** When creating Razorpay payment order, use the `finalTotal` from the order response instead of recalculating it.

**Code Changes:**
```javascript
// Before: Used calculated finalTotal
amount={selectedPaymentOption === 'payAdvance' ? advancePaymentAmount : finalTotal}

// After: Use order's finalTotal from backend (if available)
amount={(() => {
  if (selectedPaymentOption === 'payAdvance') {
    return roundMoney(advancePaymentAmount);
  }
  // Use finalTotal from created order to ensure exact match
  const orderFinalTotal = createdOrder?.finalTotal;
  if (orderFinalTotal !== undefined && orderFinalTotal !== null) {
    return roundMoney(orderFinalTotal);
  }
  return roundMoney(finalTotal);
})()}
```

### 2. Ensure Proper Rounding in Payment Component
**File:** `src/components/RazorpayPaymentCheckout.jsx`

**Fix:** Round the amount to 2 decimal places before sending to backend.

**Code Changes:**
```javascript
// Ensure amount is properly rounded to 2 decimal places
const roundedAmount = Math.round(amount * 100) / 100;
const orderResponse = await apiService.createRazorpayOrder(orderId, roundedAmount);
```

## Backend API Requirements

### Endpoint: `POST /api/payments/create-order`

**Authentication:** Required (User/Admin)
- Header: `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "orderId": "ORD123456789",
  "amount": 5255.25
}
```

**Field Descriptions:**
- `orderId` (string, required): The order ID for which payment is being created
- `amount` (number, required): Payment amount in rupees (must match order's finalTotal exactly)

**Validation Rules:**
1. **CRITICAL**: The `amount` must exactly match the order's `finalTotal` field
2. Allow a tolerance of ±0.01 (1 paise) for floating point precision
3. If amount doesn't match, return error with both values for debugging
4. Order must exist and belong to the authenticated user
5. Order payment status should be 'pending' (not already paid)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Razorpay order created successfully",
  "data": {
    "orderId": "ORD123456789",
    "paymentId": "PAY_abc123",
    "razorpayOrderId": "order_xyz789",
    "amount": 5255.25,
    "currency": "INR",
    "key": "rzp_live_xxxxx" // or test key
  }
}
```

**Error Responses:**

**400 Bad Request - Amount Mismatch:**
```json
{
  "success": false,
  "message": "Payment amount mismatch",
  "error": "AMOUNT_MISMATCH",
  "details": {
    "providedAmount": 5266.8,
    "orderFinalTotal": 5255.25,
    "difference": 11.55,
    "orderId": "ORD123456789"
  }
}
```

**400 Bad Request - Invalid Order:**
```json
{
  "success": false,
  "message": "Order not found or does not belong to user",
  "error": "ORDER_NOT_FOUND"
}
```

**400 Bad Request - Order Already Paid:**
```json
{
  "success": false,
  "message": "Order payment already completed",
  "error": "ORDER_ALREADY_PAID"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized. Please login."
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to create payment order"
}
```

## Backend Implementation Guide

### Step 1: Fetch Order from Database
```javascript
const order = await Order.findOne({ 
  orderId: req.body.orderId,
  'customerInfo.userId': req.user._id // Ensure order belongs to user
});

if (!order) {
  return res.status(400).json({
    success: false,
    message: 'Order not found or does not belong to user',
    error: 'ORDER_NOT_FOUND'
  });
}
```

### Step 2: Validate Payment Amount
```javascript
const providedAmount = parseFloat(req.body.amount);
const orderFinalTotal = parseFloat(order.finalTotal);

// Round both to 2 decimal places for comparison
const roundedProvided = Math.round(providedAmount * 100) / 100;
const roundedOrderTotal = Math.round(orderFinalTotal * 100) / 100;

// Allow tolerance of ±0.01 (1 paise) for floating point precision
const difference = Math.abs(roundedProvided - roundedOrderTotal);

if (difference > 0.01) {
  return res.status(400).json({
    success: false,
    message: 'Payment amount mismatch',
    error: 'AMOUNT_MISMATCH',
    details: {
      providedAmount: roundedProvided,
      orderFinalTotal: roundedOrderTotal,
      difference: difference,
      orderId: order.orderId
    }
  });
}
```

### Step 3: Check Payment Status
```javascript
if (order.paymentStatus === 'paid' || order.paymentStatus === 'completed') {
  return res.status(400).json({
    success: false,
    message: 'Order payment already completed',
    error: 'ORDER_ALREADY_PAID'
  });
}
```

### Step 4: Create Razorpay Order
```javascript
// Use the order's finalTotal (not the provided amount) to ensure consistency
const razorpayAmount = Math.round(order.finalTotal * 100); // Convert to paise

const razorpayOrder = await razorpay.orders.create({
  amount: razorpayAmount,
  currency: 'INR',
  receipt: order.orderId,
  notes: {
    orderId: order.orderId,
    userId: req.user._id.toString()
  }
});

// Create payment record in database
const payment = await Payment.create({
  orderId: order._id,
  paymentId: generatePaymentId(), // Your payment ID generation logic
  razorpayOrderId: razorpayOrder.id,
  amount: order.finalTotal, // Use order's finalTotal
  currency: 'INR',
  status: 'pending',
  paymentMethod: 'razorpay',
  createdAt: new Date()
});
```

### Step 5: Return Response
```javascript
res.json({
  success: true,
  message: 'Razorpay order created successfully',
  data: {
    orderId: order.orderId,
    paymentId: payment.paymentId,
    razorpayOrderId: razorpayOrder.id,
    amount: order.finalTotal, // Return order's finalTotal
    currency: 'INR',
    key: process.env.RAZORPAY_KEY_ID // Return Razorpay key ID
  }
});
```

## Important Notes

### 1. Use Order's FinalTotal, Not Provided Amount
**CRITICAL**: Always use `order.finalTotal` from the database when creating Razorpay order, not the `amount` provided in the request. The provided amount is only for validation.

**Why?**
- The order's `finalTotal` is the source of truth
- It was calculated and saved when the order was created
- Using it ensures consistency across all payment attempts

### 2. Amount Validation Tolerance
Allow a tolerance of ±0.01 (1 paise) when comparing amounts:
- Floating point arithmetic can cause tiny differences
- Rounding at different stages may result in 1 paise difference
- This is acceptable and won't cause payment issues

### 3. Rounding Consistency
- Always round amounts to 2 decimal places before comparison
- Use `Math.round(amount * 100) / 100` for consistent rounding
- Store amounts as numbers (not strings) in database

### 4. Payment Amount for Different Options
- **Pay Now**: Use `order.finalTotal`
- **Pay Advance**: Use `order.advanceAmount` (if stored) or `order.finalTotal` if advance amount equals final total
- The frontend will send the correct amount based on payment option

### 5. Error Messages
Provide detailed error messages with both amounts when validation fails:
- Helps with debugging
- Shows exact difference
- Allows frontend to handle gracefully

## Database Schema

### Order Model
Ensure the order has these fields:
```javascript
{
  orderId: String, // Unique order ID
  finalTotal: Number, // Final amount after all discounts (rounded to 2 decimals)
  advanceAmount: Number, // Advance payment amount (if applicable)
  remainingAmount: Number, // Remaining amount after advance (if applicable)
  paymentStatus: String, // 'pending', 'paid', 'failed', 'refunded'
  paymentOption: String, // 'payNow', 'payAdvance', etc.
  // ... other fields
}
```

### Payment Model
```javascript
{
  orderId: ObjectId, // Reference to Order
  paymentId: String, // Unique payment ID
  razorpayOrderId: String, // Razorpay order ID
  amount: Number, // Payment amount (should match order.finalTotal)
  currency: String, // 'INR'
  status: String, // 'pending', 'success', 'failed'
  paymentMethod: String, // 'razorpay'
  createdAt: Date,
  updatedAt: Date
}
```

## Testing Guide

### Test Case 1: Valid Payment Amount
```bash
POST /api/payments/create-order
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Body:
{
  "orderId": "ORD123456789",
  "amount": 5255.25
}

Expected: 200 OK with Razorpay order details
```

### Test Case 2: Amount Mismatch
```bash
POST /api/payments/create-order
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Body:
{
  "orderId": "ORD123456789",
  "amount": 5266.80  // Different from order's finalTotal
}

Expected: 400 Bad Request with AMOUNT_MISMATCH error
```

### Test Case 3: Order Not Found
```bash
POST /api/payments/create-order
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Body:
{
  "orderId": "INVALID_ORDER_ID",
  "amount": 5255.25
}

Expected: 400 Bad Request with ORDER_NOT_FOUND error
```

### Test Case 4: Order Already Paid
```bash
POST /api/payments/create-order
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Body:
{
  "orderId": "ORD_ALREADY_PAID",
  "amount": 5255.25
}

Expected: 400 Bad Request with ORDER_ALREADY_PAID error
```

### Test Case 5: Amount Within Tolerance (±0.01)
```bash
POST /api/payments/create-order
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Body:
{
  "orderId": "ORD123456789",
  "amount": 5255.26  // 1 paise difference (within tolerance)
}

Expected: 200 OK (should accept)
```

## Example Backend Implementation (Node.js/Express)

```javascript
// routes/payments.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Razorpay = require('razorpay');
const { authenticateUser } = require('../middleware/auth');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// POST /api/payments/create-order
router.post('/create-order', authenticateUser, async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    // Validate input
    if (!orderId || amount === undefined || amount === null) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and amount are required'
      });
    }

    // Fetch order from database
    const order = await Order.findOne({
      orderId: orderId,
      'customerInfo.userId': req.user._id
    });

    if (!order) {
      return res.status(400).json({
        success: false,
        message: 'Order not found or does not belong to user',
        error: 'ORDER_NOT_FOUND'
      });
    }

    // Check if order is already paid
    if (order.paymentStatus === 'paid' || order.paymentStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Order payment already completed',
        error: 'ORDER_ALREADY_PAID'
      });
    }

    // Validate payment amount
    const providedAmount = parseFloat(amount);
    const orderFinalTotal = parseFloat(order.finalTotal);

    // Round both to 2 decimal places for comparison
    const roundedProvided = Math.round(providedAmount * 100) / 100;
    const roundedOrderTotal = Math.round(orderFinalTotal * 100) / 100;

    // Allow tolerance of ±0.01 (1 paise) for floating point precision
    const difference = Math.abs(roundedProvided - roundedOrderTotal);

    if (difference > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount mismatch',
        error: 'AMOUNT_MISMATCH',
        details: {
          providedAmount: roundedProvided,
          orderFinalTotal: roundedOrderTotal,
          difference: difference,
          orderId: order.orderId
        }
      });
    }

    // Determine payment amount based on payment option
    let paymentAmount = order.finalTotal;
    if (order.paymentOption === 'payAdvance' && order.advanceAmount) {
      paymentAmount = order.advanceAmount;
    }

    // Create Razorpay order
    const razorpayAmount = Math.round(paymentAmount * 100); // Convert to paise

    const razorpayOrder = await razorpay.orders.create({
      amount: razorpayAmount,
      currency: 'INR',
      receipt: order.orderId,
      notes: {
        orderId: order.orderId,
        userId: req.user._id.toString()
      }
    });

    // Generate payment ID
    const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create payment record
    const payment = await Payment.create({
      orderId: order._id,
      paymentId: paymentId,
      razorpayOrderId: razorpayOrder.id,
      amount: paymentAmount, // Use determined payment amount
      currency: 'INR',
      status: 'pending',
      paymentMethod: 'razorpay',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Return response
    res.json({
      success: true,
      message: 'Razorpay order created successfully',
      data: {
        orderId: order.orderId,
        paymentId: payment.paymentId,
        razorpayOrderId: razorpayOrder.id,
        amount: paymentAmount,
        currency: 'INR',
        key: process.env.RAZORPAY_KEY_ID
      }
    });

  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message
    });
  }
});

module.exports = router;
```

## Summary

### Frontend Changes
1. ✅ Use order's `finalTotal` from backend response when creating payment
2. ✅ Ensure proper rounding (2 decimal places) before sending amount
3. ✅ Handle both Pay Now and Pay Advance scenarios

### Backend Requirements
1. ⚠️ **Validate** that provided amount matches order's `finalTotal` (with ±0.01 tolerance)
2. ⚠️ **Use** order's `finalTotal` (or `advanceAmount` for advance payments) when creating Razorpay order
3. ⚠️ **Do NOT** recalculate the amount - use the stored value
4. ⚠️ **Return** detailed error messages with both amounts when validation fails
5. ⚠️ **Check** order payment status before allowing payment creation

### Key Points
- **Source of Truth**: Order's `finalTotal` in database is the authoritative value
- **Validation**: Provided amount is only for validation, not for payment
- **Tolerance**: Allow ±0.01 (1 paise) difference for floating point precision
- **Consistency**: Always use stored order values, never recalculate

Once the backend is updated according to this specification, the payment amount mismatch error will be resolved.

