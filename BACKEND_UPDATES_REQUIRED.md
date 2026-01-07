# Backend Updates Required

This document outlines all the backend changes required to fix the identified issues in the rental service application.

## Table of Contents
1. [Date Selection Fix](#1-date-selection-fix)
2. [Checkout Without Email](#2-checkout-without-email)
3. [Razorpay Refund Implementation](#3-razorpay-refund-implementation)

---

## 1. Date Selection Fix

### Issue
The frontend date picker was only allowing selection of dates starting from tomorrow. Users should be able to select today and future dates (not past dates).

### Frontend Fix (Already Done)
- Updated `ServiceBookingModal.js` to allow selecting today's date
- Changed `getMinDate()` to return today instead of tomorrow

### Backend Requirements
**No backend changes required** - This is purely a frontend validation fix.

---

## 2. Checkout Without Email

### Issue
When users proceed to payment without registering or logging in, the checkout process fails if the user doesn't have an email address in the database.

### Frontend Fix (Already Done)
- Updated `Checkout.js` to send `email: null` instead of empty string when email is not available
- Email field is now optional in the order creation payload

### Backend Requirements

#### 2.1 Order Creation Endpoint (`POST /api/orders`)

**Current Behavior:**
- May require email field or fail if email validation is too strict

**Required Changes:**
1. **Make email optional in order schema:**
   ```javascript
   customerInfo: {
     userId: { type: String, required: true },
     name: { type: String, required: true },
     email: { type: String, required: false }, // Make optional
     phone: { type: String, required: true },
     alternatePhone: { type: String, required: false },
     address: {
       homeAddress: { type: String, required: false },
       nearLandmark: { type: String, required: false },
       pincode: { type: String, required: false },
     }
   }
   ```

2. **Update order creation validation:**
   - Remove email requirement from validation
   - Allow `email: null` or `email: undefined` in order data
   - If email is provided, validate format (if not null/undefined)
   - If email is not provided, set it to `null` in the database

3. **Update email notification logic:**
   - Check if email exists before sending order confirmation emails
   - If email is null/undefined, skip email notification (don't fail the order creation)
   - Log a warning if email is missing but don't block order creation
   - Example:
     ```javascript
     if (order.customerInfo.email) {
       // Send email notification
       sendOrderConfirmationEmail(order).catch(err => {
         console.warn('Email notification failed:', err);
         // Don't fail order creation
       });
     } else {
       console.log('Order created without email - skipping email notification');
     }
     ```

#### 2.2 Payment Processing Endpoint (`POST /api/payments/verify`)

**Required Changes:**
1. **Make email optional in payment records:**
   - Payment records should not require email
   - Store email if available, otherwise store `null`

2. **Update payment verification:**
   - Don't fail payment verification if email is missing
   - Email is not required for payment processing

#### 2.3 User Model (if applicable)

**Required Changes:**
1. **Make email optional in user schema:**
   ```javascript
   email: {
     type: String,
     required: false, // Change from true to false
     unique: true,
     sparse: true, // Allow multiple null values
     lowercase: true,
     trim: true,
     validate: {
       validator: function(v) {
         // Only validate if email is provided
         return !v || /^\S+@\S+\.\S+$/.test(v);
       },
       message: 'Please provide a valid email address'
     }
   }
   ```

2. **Update user creation/update:**
   - Allow user creation without email
   - Phone number should be the primary identifier (already implemented via OTP)

---

## 3. Razorpay Refund Implementation

### Issue
When a user cancels an order, the system doesn't automatically process a refund through Razorpay. Users should receive refunds when they cancel paid orders.

### Frontend Fix (Already Done)
- Added `createRefund` API function in `api.js` for manual refunds if needed
- Order cancellation flow already calls `cancelOrder` endpoint

### Backend Requirements

#### 3.1 Install Razorpay SDK (if not already installed)

```bash
npm install razorpay
```

#### 3.2 Order Cancellation Endpoint (`PATCH /api/orders/:orderId/cancel`)

**Required Changes:**

1. **Check if order has payment:**
   ```javascript
   // Find the order
   const order = await Order.findById(orderId);
   
   // Check if order has a payment record
   const payment = await Payment.findOne({ orderId: orderId });
   
   // Check if payment was successful
   if (payment && payment.status === 'paid' && payment.razorpayPaymentId) {
     // Process refund
   }
   ```

2. **Implement Razorpay Refund:**
   ```javascript
   const Razorpay = require('razorpay');
   
   const razorpay = new Razorpay({
     key_id: process.env.RAZORPAY_KEY_ID,
     key_secret: process.env.RAZORPAY_KEY_SECRET
   });
   
   // Create refund
   async function processRefund(paymentId, amount, orderId, reason) {
     try {
       const refund = await razorpay.payments.refund(paymentId, {
         amount: amount, // Amount in paise (e.g., 10000 for ₹100)
         notes: {
           reason: reason || 'Order cancelled by user',
           orderId: orderId,
           cancelledAt: new Date().toISOString()
         }
       });
       
       return {
         success: true,
         refundId: refund.id,
         amount: refund.amount,
         status: refund.status,
         razorpayRefundId: refund.id
       };
     } catch (error) {
       console.error('Razorpay refund error:', error);
       throw error;
     }
   }
   ```

3. **Update Order Cancellation Logic:**
   ```javascript
   // PATCH /api/orders/:orderId/cancel
   router.patch('/orders/:orderId/cancel', async (req, res) => {
     try {
       const { orderId } = req.params;
       const { cancellationReason } = req.body;
       
       // Find order
       const order = await Order.findById(orderId);
       if (!order) {
         return res.status(404).json({
           success: false,
           message: 'Order not found'
         });
       }
       
       // Check if order can be cancelled
       if (order.status === 'cancelled') {
         return res.status(400).json({
           success: false,
           message: 'Order is already cancelled'
         });
       }
       
       if (order.status === 'completed' || order.status === 'delivered') {
         return res.status(400).json({
           success: false,
           message: 'Cannot cancel completed or delivered orders'
         });
       }
       
       // Find payment record
       const payment = await Payment.findOne({ orderId: orderId });
       
       let refundData = null;
       
       // Process refund if payment was made
       if (payment && payment.status === 'paid' && payment.razorpayPaymentId) {
         try {
           // Determine refund amount
           // For payNow: refund full amount
           // For payAdvance: refund advance amount only
           let refundAmount = 0;
           
           if (order.paymentOption === 'payNow') {
             refundAmount = order.finalTotal;
           } else if (order.paymentOption === 'payAdvance') {
             refundAmount = order.advanceAmount || 0;
           }
           
           // Convert to paise (Razorpay uses paise)
           const refundAmountInPaise = Math.round(refundAmount * 100);
           
           if (refundAmountInPaise > 0) {
             // Process refund through Razorpay
             const refund = await razorpay.payments.refund(
               payment.razorpayPaymentId,
               {
                 amount: refundAmountInPaise,
                 notes: {
                   reason: cancellationReason || 'Order cancelled by user',
                   orderId: order.orderId,
                   cancelledAt: new Date().toISOString()
                 }
               }
             );
             
             // Create refund record in database
             refundData = {
               refundId: refund.id,
               razorpayRefundId: refund.id,
               paymentId: payment._id,
               orderId: order._id,
               amount: refundAmount,
               amountInPaise: refundAmountInPaise,
               status: refund.status, // 'processed', 'pending', 'failed'
               reason: cancellationReason || 'Order cancelled by user',
               processedAt: new Date(),
               razorpayRefundData: refund
             };
             
             // Save refund record
             const refundRecord = new Refund(refundData);
             await refundRecord.save();
             
             // Update payment record with refund info
             payment.refundId = refund.id;
             payment.refundStatus = refund.status;
             payment.refundAmount = refundAmount;
             payment.refundedAt = new Date();
             await payment.save();
             
             refundData = refundRecord;
           }
         } catch (refundError) {
           console.error('Refund processing error:', refundError);
           
           // Log refund error but don't fail order cancellation
           // Order will be cancelled but refund will need manual processing
           refundData = {
             error: refundError.message,
             status: 'failed',
             note: 'Refund processing failed - requires manual intervention'
           };
         }
       }
       
       // Update order status
       order.status = 'cancelled';
       order.cancellationReason = cancellationReason;
       order.cancelledAt = new Date();
       await order.save();
       
       // Return response
       return res.json({
         success: true,
         message: refundData && refundData.status === 'processed' 
           ? 'Order cancelled and refund processed successfully'
           : refundData && refundData.status === 'failed'
           ? 'Order cancelled but refund processing failed. Please contact support.'
           : 'Order cancelled successfully',
         data: {
           order: order,
           refund: refundData
         }
       });
       
     } catch (error) {
       console.error('Cancel order error:', error);
       return res.status(500).json({
         success: false,
         message: 'Failed to cancel order',
         error: error.message
       });
     }
   });
   ```

#### 3.3 Refund Model Schema

**Create a new Refund model:**

```javascript
// models/Refund.js
const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
  refundId: {
    type: String,
    required: true,
    unique: true
  },
  razorpayRefundId: {
    type: String,
    required: true,
    unique: true
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  amountInPaise: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['processed', 'pending', 'failed'],
    default: 'pending'
  },
  reason: {
    type: String,
    required: false
  },
  processedAt: {
    type: Date,
    default: Date.now
  },
  razorpayRefundData: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  error: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Refund', refundSchema);
```

#### 3.4 Update Payment Model

**Add refund fields to Payment model:**

```javascript
// In Payment schema, add:
refundId: {
  type: String,
  required: false
},
refundStatus: {
  type: String,
  enum: ['processed', 'pending', 'failed', null],
  default: null
},
refundAmount: {
  type: Number,
  required: false
},
refundedAt: {
  type: Date,
  required: false
}
```

#### 3.5 Refund Status Endpoint (Optional but Recommended)

**Create endpoint to check refund status:**

```javascript
// GET /api/orders/:orderId/refund-status
router.get('/orders/:orderId/refund-status', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const refund = await Refund.findOne({ orderId: orderId })
      .populate('paymentId')
      .populate('orderId');
    
    if (!refund) {
      return res.json({
        success: true,
        message: 'No refund found for this order',
        data: null
      });
    }
    
    // Optionally fetch latest status from Razorpay
    try {
      const razorpayRefund = await razorpay.refunds.fetch(refund.razorpayRefundId);
      refund.status = razorpayRefund.status;
      await refund.save();
    } catch (error) {
      console.error('Error fetching refund status from Razorpay:', error);
    }
    
    return res.json({
      success: true,
      data: refund
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch refund status',
      error: error.message
    });
  }
});
```

#### 3.6 Manual Refund Endpoint (For Admin)

**Create endpoint for manual refund processing:**

```javascript
// POST /api/payments/refund
router.post('/payments/refund', async (req, res) => {
  try {
    const { paymentId, amount, notes } = req.body;
    
    // Find payment
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    if (payment.status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment is not in paid status'
      });
    }
    
    if (payment.refundStatus === 'processed') {
      return res.status(400).json({
        success: false,
        message: 'Refund already processed'
      });
    }
    
    // Convert amount to paise
    const refundAmountInPaise = Math.round(amount * 100);
    
    // Process refund through Razorpay
    const refund = await razorpay.payments.refund(
      payment.razorpayPaymentId,
      {
        amount: refundAmountInPaise,
        notes: notes || {}
      }
    );
    
    // Create refund record
    const refundRecord = new Refund({
      refundId: refund.id,
      razorpayRefundId: refund.id,
      paymentId: payment._id,
      orderId: payment.orderId,
      amount: amount,
      amountInPaise: refundAmountInPaise,
      status: refund.status,
      reason: notes?.reason || 'Manual refund',
      processedAt: new Date(),
      razorpayRefundData: refund
    });
    await refundRecord.save();
    
    // Update payment record
    payment.refundId = refund.id;
    payment.refundStatus = refund.status;
    payment.refundAmount = amount;
    payment.refundedAt = new Date();
    await payment.save();
    
    return res.json({
      success: true,
      message: 'Refund processed successfully',
      data: refundRecord
    });
  } catch (error) {
    console.error('Manual refund error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: error.message
    });
  }
});
```

---

## 4. Testing Checklist

### 4.1 Date Selection
- [ ] Verify users can select today's date
- [ ] Verify users can select future dates
- [ ] Verify users cannot select past dates

### 4.2 Checkout Without Email
- [ ] Create order without email (email: null)
- [ ] Verify order creation succeeds
- [ ] Verify no email notification is sent (no error)
- [ ] Verify order appears in admin panel
- [ ] Verify payment processing works without email
- [ ] Verify user can complete checkout without email

### 4.3 Refund Implementation
- [ ] Cancel order with payNow payment - verify full refund
- [ ] Cancel order with payAdvance payment - verify advance amount refund
- [ ] Cancel order without payment - verify no refund attempted
- [ ] Verify refund record is created in database
- [ ] Verify payment record is updated with refund info
- [ ] Verify refund status can be queried
- [ ] Test manual refund endpoint (admin)
- [ ] Verify refund failure doesn't block order cancellation
- [ ] Test refund for different payment amounts

---

## 5. Environment Variables

Ensure these environment variables are set:

```env
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

---

## 6. Error Handling

### 6.1 Refund Errors

**Handle these Razorpay refund errors gracefully:**

1. **Payment already refunded:**
   - Check if refund already exists before processing
   - Return existing refund record

2. **Insufficient balance:**
   - Log error
   - Mark refund as failed
   - Notify admin for manual processing

3. **Invalid payment ID:**
   - Validate payment ID before processing
   - Return appropriate error message

4. **Network errors:**
   - Implement retry logic (optional)
   - Log error for manual intervention

### 6.2 Email Errors

**Handle email notification errors:**

- Don't fail order creation if email sending fails
- Log email errors for monitoring
- Continue with order processing even if email fails

---

## 7. Database Migrations (if needed)

If you need to update existing orders/payments:

```javascript
// Migration script to make email optional in existing orders
async function migrateOrdersEmail() {
  const orders = await Order.find({ 'customerInfo.email': '' });
  for (const order of orders) {
    order.customerInfo.email = null;
    await order.save();
  }
}

// Migration script to add refund fields to existing payments
async function migratePaymentsRefund() {
  const payments = await Payment.find({ refundId: { $exists: false } });
  for (const payment of payments) {
    payment.refundId = null;
    payment.refundStatus = null;
    payment.refundAmount = null;
    payment.refundedAt = null;
    await payment.save();
  }
}
```

---

## 8. API Response Examples

### 8.1 Order Cancellation with Refund

**Success Response:**
```json
{
  "success": true,
  "message": "Order cancelled and refund processed successfully",
  "data": {
    "order": {
      "_id": "...",
      "orderId": "ORD-2024-001",
      "status": "cancelled",
      "cancellationReason": "Changed my mind",
      "cancelledAt": "2024-01-15T10:30:00.000Z"
    },
    "refund": {
      "_id": "...",
      "refundId": "rfnd_abc123",
      "razorpayRefundId": "rfnd_abc123",
      "amount": 1000,
      "status": "processed",
      "processedAt": "2024-01-15T10:30:05.000Z"
    }
  }
}
```

**Refund Failed Response:**
```json
{
  "success": true,
  "message": "Order cancelled but refund processing failed. Please contact support.",
  "data": {
    "order": {
      "_id": "...",
      "orderId": "ORD-2024-001",
      "status": "cancelled"
    },
    "refund": {
      "error": "Insufficient balance",
      "status": "failed",
      "note": "Refund processing failed - requires manual intervention"
    }
  }
}
```

---

## 9. Notes

1. **Refund Processing Time:**
   - Razorpay refunds typically process within 5-7 business days
   - Refund status will be 'processed' when Razorpay confirms it
   - Users should be informed about refund processing time

2. **Partial Refunds:**
   - Currently, full refunds are processed for cancelled orders
   - For payAdvance orders, only the advance amount is refunded
   - Partial refunds can be implemented later if needed

3. **Refund Webhooks:**
   - Consider implementing Razorpay refund webhooks to update refund status automatically
   - Webhook endpoint: `POST /api/payments/refund-webhook`

4. **Email Notifications:**
   - Consider sending SMS notifications if email is not available
   - Use phone number as primary contact method

---

## 10. Summary

### Changes Required:
1. ✅ **Date Selection:** No backend changes needed (frontend fix only)
2. ✅ **Checkout Without Email:** Make email optional in order creation and payment processing
3. ✅ **Razorpay Refund:** Implement automatic refund processing on order cancellation

### Priority:
1. **High:** Checkout without email (blocks user checkout)
2. **High:** Razorpay refund (required for order cancellation)
3. **Low:** Date selection (frontend only, no backend changes)

---

**Last Updated:** January 2024
**Version:** 1.0

