# Backend Fix Required: Payment Amount Validation for Advance Payments

## Issue
Payment creation fails for "Book Now" (payAdvance) option with error:
```
{
  "success": false,
  "message": "Payment amount mismatch",
  "error": "AMOUNT_MISMATCH",
  "details": {
    "providedAmount": 991,
    "orderFinalTotal": 5255.25,
    "expectedAmount": 5255.25,
    "difference": 4264.25,
    "orderId": "ORD-2026-637"
  }
}
```

## Root Cause
The backend validation always checks the provided amount against `order.finalTotal`, but for advance payments (`paymentOption === 'payAdvance'`), it should validate against `order.advanceAmount` instead.

## Current Backend Code (WRONG)
```javascript
// ❌ WRONG: Always validates against finalTotal
const providedAmount = parseFloat(amount);
const orderFinalTotal = parseFloat(order.finalTotal);

const roundedProvided = Math.round(providedAmount * 100) / 100;
const roundedOrderTotal = Math.round(orderFinalTotal * 100) / 100;
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

// Then later determines payment amount
let paymentAmount = order.finalTotal;
if (order.paymentOption === 'payAdvance' && order.advanceAmount) {
  paymentAmount = order.advanceAmount;
}
```

## Required Fix
**Move the payment amount determination BEFORE validation** and validate against the correct expected amount:

```javascript
// ✅ CORRECT: Determine expected payment amount FIRST
let expectedPaymentAmount = order.finalTotal;
if (order.paymentOption === 'payAdvance' && order.advanceAmount) {
  expectedPaymentAmount = order.advanceAmount;
}

// Validate against expected amount (not always finalTotal)
const providedAmount = parseFloat(amount);
const expectedAmount = parseFloat(expectedPaymentAmount);

// Round both to 2 decimal places for comparison
const roundedProvided = Math.round(providedAmount * 100) / 100;
const roundedExpected = Math.round(expectedAmount * 100) / 100;

// Allow tolerance of ±0.01 (1 paise) for floating point precision
const difference = Math.abs(roundedProvided - roundedExpected);

if (difference > 0.01) {
  return res.status(400).json({
    success: false,
    message: 'Payment amount mismatch',
    error: 'AMOUNT_MISMATCH',
    details: {
      providedAmount: roundedProvided,
      orderFinalTotal: order.finalTotal, // Include for reference
      expectedAmount: roundedExpected, // The amount that should be paid
      difference: difference,
      orderId: order.orderId,
      paymentOption: order.paymentOption // Include for debugging
    }
  });
}

// Use expected payment amount for Razorpay order creation
const razorpayAmount = Math.round(expectedPaymentAmount * 100); // Convert to paise
```

## Complete Updated Endpoint Code

```javascript
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

    // ✅ FIX: Determine expected payment amount based on payment option
    let expectedPaymentAmount = order.finalTotal;
    if (order.paymentOption === 'payAdvance' && order.advanceAmount) {
      expectedPaymentAmount = order.advanceAmount;
    }

    // ✅ FIX: Validate against expected amount (not always finalTotal)
    const providedAmount = parseFloat(amount);
    const expectedAmount = parseFloat(expectedPaymentAmount);

    // Round both to 2 decimal places for comparison
    const roundedProvided = Math.round(providedAmount * 100) / 100;
    const roundedExpected = Math.round(expectedAmount * 100) / 100;

    // Allow tolerance of ±0.01 (1 paise) for floating point precision
    const difference = Math.abs(roundedProvided - roundedExpected);

    if (difference > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount mismatch',
        error: 'AMOUNT_MISMATCH',
        details: {
          providedAmount: roundedProvided,
          orderFinalTotal: order.finalTotal, // Include for reference
          expectedAmount: roundedExpected, // The amount that should be paid
          difference: difference,
          orderId: order.orderId,
          paymentOption: order.paymentOption // Include for debugging
        }
      });
    }

    // Create Razorpay order using expected payment amount
    const razorpayAmount = Math.round(expectedPaymentAmount * 100); // Convert to paise

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
      amount: expectedPaymentAmount, // Use expected payment amount
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
        amount: expectedPaymentAmount, // Return expected payment amount
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
```

## Key Changes Summary

1. **Determine expected payment amount BEFORE validation**:
   - For `payNow`: Use `order.finalTotal`
   - For `payAdvance`: Use `order.advanceAmount` (if stored)

2. **Validate against expected amount** (not always `finalTotal`)

3. **Use expected payment amount** for Razorpay order creation and payment record

4. **Include `paymentOption` in error details** for better debugging

## Testing

### Test Case 1: Pay Advance Payment (Should Pass)
```bash
POST /api/payments/create-order
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Body:
{
  "orderId": "ORD-2026-637",
  "amount": 991
}

Expected: 200 OK
- Order has paymentOption: "payAdvance"
- Order has advanceAmount: 991
- Should succeed ✅
```

### Test Case 2: Pay Now Payment (Should Pass)
```bash
POST /api/payments/create-order
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Body:
{
  "orderId": "ORD-2026-638",
  "amount": 5255.25
}

Expected: 200 OK
- Order has paymentOption: "payNow"
- Order has finalTotal: 5255.25
- Should succeed ✅
```

### Test Case 3: Amount Mismatch (Should Fail)
```bash
POST /api/payments/create-order
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Body:
{
  "orderId": "ORD-2026-637",
  "amount": 1000  // Wrong amount (should be 991)
}

Expected: 400 Bad Request with AMOUNT_MISMATCH error ✅
```

## Frontend Status
✅ Frontend has been updated to use order's `advanceAmount` from backend response for advance payments.

## Priority
🔴 **HIGH** - This is blocking advance payment functionality.

## Questions?
If you need clarification, refer to the detailed documentation in:
- `New folder/BACKEND_UPDATE_PAYMENT_AMOUNT_VALIDATION.md`

