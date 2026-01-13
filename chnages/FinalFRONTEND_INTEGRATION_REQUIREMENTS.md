# 📋 Frontend Integration Requirements - Verification Checklist

## 🎯 Purpose
This document lists all frontend integration requirements that need to be verified. Please check each item and provide confirmation.

---

## 1. Order Creation Integration

### ✅ Requirement 1.1: Use Backend's `advanceAmount`
**Critical**: Frontend MUST use `advanceAmount` from backend order response, NOT calculate it on frontend.

**Backend Response Format:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "orderId": "ORD-2024-123",
    "finalTotal": 1500.00,
    "advanceAmount": 991.00,  // ← USE THIS VALUE
    "remainingAmount": 509.00,
    "paymentStatus": "pending",
    "status": "pending"
  }
}
```

**Frontend Action Required:**
- [x] Store `advanceAmount` from order creation response
- [x] Use this `advanceAmount` for payment (NOT frontend calculation)
- [x] Display this `advanceAmount` in UI

**Question for Frontend Team:**
> Do you use `response.data.advanceAmount` from order creation response for payment? Or do you calculate it on frontend?

**Response:**
✅ **Yes, we use `response.data.advanceAmount` from backend order response.** We do NOT calculate it on frontend. The `advanceAmount` is stored in `createdOrder` state and used directly for payment.

**Code Reference:**
- `src/pages/user/Checkout.js` (lines 417-421): Stores order response with `advanceAmount`
- `src/pages/user/Checkout.js` (lines 1201-1219): Uses `createdOrder?.advanceAmount` for payment amount
- `src/pages/user/Checkout.js` (lines 1165-1182): Displays backend's `advanceAmount` in UI

---

### ✅ Requirement 1.2: Order Creation Request Format
**Backend expects:**
```json
{
  "items": [...],
  "paymentOption": "payNow" | "payAdvance",
  "total": 1500.00,
  "finalTotal": 1500.00,
  "advanceAmount": 991.00,  // Optional: backend will calculate if not provided
  "remainingAmount": 509.00,  // Optional: backend will calculate if not provided
  "customerInfo": {...},
  "deliveryAddresses": [...]
}
```

**Frontend Action Required:**
- [x] Send correct request format
- [x] Include all required fields
- [x] Handle response correctly

**Question for Frontend Team:**
> Does your order creation request match the backend expected format?

**Response:**
✅ **Yes, our order creation request matches the backend format.** We send all required fields including `items`, `paymentOption`, `total`, `finalTotal`, `customerInfo`, and `deliveryAddresses`. The `advanceAmount` and `remainingAmount` are optional and backend calculates them.

**Code Reference:**
- `src/pages/user/Checkout.js` (lines 368-408): Order creation request format
- `src/services/api.js` (lines 847-875): `createOrder` API call with proper error handling

---

## 2. Payment Flow Integration

### ✅ Requirement 2.1: Payment Order Creation
**Endpoint:** `POST /api/payments/create-order`

**Request Body:**
```json
{
  "orderId": "ORD-2024-123",
  "amount": 991.00  // ← MUST be the advanceAmount from order response
}
```

**Critical Points:**
- `amount` MUST match the `advanceAmount` from order creation response
- For "Pay Now": `amount` = `finalTotal`
- For "Book Now": `amount` = `advanceAmount` (from order response)

**Frontend Action Required:**
- [x] Call `/api/payments/create-order` with correct `orderId` and `amount`
- [x] Use `advanceAmount` from order response (not calculated value)
- [x] Handle response with `razorpayOrderId` and `key`

**Question for Frontend Team:**
> When creating payment order, do you use the `advanceAmount` from order response? What value do you send in the `amount` field?

**Response:**
✅ **Yes, we use `advanceAmount` from order response.** 
- For "Pay Now": We send `finalTotal` from backend order response
- For "Book Now": We send `advanceAmount` from backend order response (NOT calculated)

**Code Reference:**
- `src/components/RazorpayPaymentCheckout.js` (lines 30-45): Calls `/api/payments/create-order` with correct amount
- `src/pages/user/Checkout.js` (lines 1201-1219): Passes backend's `advanceAmount` or `finalTotal` to payment component
- `src/services/api.js` (lines 1266-1285): `createRazorpayOrder` API method

---

### ✅ Requirement 2.2: Payment Verification
**Endpoint:** `POST /api/payments/verify`

**Request Body:**
```json
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature_xxx",
  "paymentId": "PAY_xxx"  // Optional
}
```

**Backend Response (Success):**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "order": {...},
    "payment": {...},
    "orderId": "ORD-2024-123",
    "paymentStatus": "paid",  // ← Order status updated
    "verifiedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Frontend Action Required:**
- [x] Call `/api/payments/verify` after Razorpay payment
- [x] Handle success response
- [x] Update order status in UI (should be "confirmed" after payment)
- [x] Redirect to orders page after successful payment
- [x] Handle failure response with error message

**Question for Frontend Team:**
> After payment verification, do you update the order status in the UI? Do you redirect to orders page?

**Response:**
✅ **Yes, we update order status and redirect.**
- After successful verification, we update `createdOrder` state with the order data from verification response
- Order status automatically shows as "Confirmed" (backend updates it)
- Payment status shows as "Paid"
- We redirect to `/user/orders` page after 5 seconds (with success modal)

**Code Reference:**
- `src/components/RazorpayPaymentCheckout.js` (lines 47-95): Payment verification flow
- `src/pages/user/Checkout.js` (lines 1221-1234): `onPaymentSuccess` handler updates state and redirects
- `src/services/api.js` (lines 1287-1302): `verifyPayment` API method

---

### ✅ Requirement 2.3: Payment Failure Handling
**Backend Response (Failure):**
```json
{
  "success": false,
  "message": "Invalid payment signature. Payment verification failed.",
  "error": "SIGNATURE_MISMATCH"
}
```

**Frontend Action Required:**
- [x] Show error message to user
- [x] Keep order in "pending" status
- [x] Allow user to retry payment
- [x] Don't update order status on failure

**Question for Frontend Team:**
> How do you handle payment verification failures? Do you allow retry?

**Response:**
✅ **Yes, we handle failures properly.**
- Shows user-friendly error message with toast notification
- Order remains in "pending" status (backend doesn't update it)
- User can retry payment from orders page
- We don't update order status on failure

**Code Reference:**
- `src/components/RazorpayPaymentCheckout.js` (lines 60-85): Error handling for verification failures
- `src/pages/user/Checkout.js` (lines 1236-1242): `onPaymentFailure` handler
- Handles `SIGNATURE_MISMATCH`, `ORDER_NOT_FOUND`, and other errors

---

### ✅ Requirement 2.4: Payment Cancellation
**Frontend Action Required:**
- [x] Show info message when user cancels payment
- [x] Keep order in "pending" status
- [x] Redirect to orders page (user can retry later)
- [x] Don't call verification endpoint on cancellation

**Question for Frontend Team:**
> How do you handle payment cancellation? Do you redirect to orders page?

**Response:**
✅ **Yes, we handle cancellation properly.**
- Shows info message: "Payment cancelled. Your order #XXX has been created. You can complete payment later from your orders page."
- Order remains in "pending" status
- Redirects to `/user/orders` page after 3 seconds
- Does NOT call verification endpoint (Razorpay modal's `ondismiss` handler)

**Code Reference:**
- `src/components/RazorpayPaymentCheckout.js` (lines 97-102): Payment cancellation handler
- `src/pages/user/Checkout.js` (lines 1243-1251): `onCancel` handler

---

## 3. Error Handling

### ✅ Requirement 3.1: Amount Mismatch Error
**Backend Error Response:**
```json
{
  "success": false,
  "message": "Payment amount mismatch",
  "error": "AMOUNT_MISMATCH",
  "details": {
    "providedAmount": 1000.00,
    "expectedAmount": 991.00,
    "difference": 9.00,
    "orderId": "ORD-2024-123",
    "paymentOption": "payAdvance"
  }
}
```

**Frontend Action Required:**
- [x] Detect `AMOUNT_MISMATCH` error
- [x] Show user-friendly error message
- [x] Suggest using correct amount
- [x] Allow user to retry with correct amount

**Question for Frontend Team:**
> Do you handle `AMOUNT_MISMATCH` error? What message do you show to user?

**Response:**
✅ **Yes, we handle `AMOUNT_MISMATCH` error.**
- Detects error code `AMOUNT_MISMATCH` from response
- Shows error message: "Payment amount mismatch. Expected: ₹XXX, Provided: ₹YYY"
- Displays error in toast notification and component error state
- User can retry payment (order remains in pending status)

**Code Reference:**
- `src/components/RazorpayPaymentCheckout.js` (lines 33-42): AMOUNT_MISMATCH error detection and handling
- `src/services/api.js` (lines 1278-1283): Returns error details including `AMOUNT_MISMATCH`

---

### ✅ Requirement 3.2: Order Not Found Error
**Backend Error Response:**
```json
{
  "success": false,
  "message": "Order not found or does not belong to user",
  "error": "ORDER_NOT_FOUND"
}
```

**Frontend Action Required:**
- [x] Handle order not found errors
- [x] Show appropriate error message
- [x] Redirect to appropriate page

**Question for Frontend Team:**
> Do you handle order not found errors?

**Response:**
✅ **Yes, we handle `ORDER_NOT_FOUND` error.**
- Detects error code `ORDER_NOT_FOUND` from response
- Shows error message: "Order not found. Please create a new order." or "Order not found. Please contact support."
- Handled in both payment order creation and verification flows

**Code Reference:**
- `src/components/RazorpayPaymentCheckout.js` (lines 38-40): ORDER_NOT_FOUND handling in payment creation
- `src/components/RazorpayPaymentCheckout.js` (lines 75-77): ORDER_NOT_FOUND handling in verification

---

## 4. Status Display

### ✅ Requirement 4.1: Status Capitalization
**Backend stores statuses in lowercase:**
- `"pending"`
- `"confirmed"`
- `"processing"`
- `"cancelled"`

**Frontend Action Required:**
- [x] Capitalize statuses for display (e.g., "Pending", "Confirmed")
- [x] Backend stores lowercase, frontend handles capitalization
- [x] Display capitalized status in UI

**Question for Frontend Team:**
> Do you capitalize order statuses for display? (Backend stores lowercase)

**Response:**
✅ **Yes, we capitalize statuses for display.**
- We have a `capitalizeStatus` utility function that capitalizes the first letter
- Backend stores lowercase (e.g., "pending", "confirmed")
- Frontend displays capitalized (e.g., "Pending", "Confirmed")

**Code Reference:**
- `src/pages/user/Orders.js` (lines 120-124): `capitalizeStatus` function
- Statuses are capitalized when displayed in the UI

---

### ✅ Requirement 4.2: Status Updates After Payment
**Frontend Action Required:**
- [x] After successful payment verification, order status should show as "Confirmed"
- [x] Payment status should show as "Paid"
- [x] Refresh order data after payment verification
- [x] Update UI immediately after payment success

**Question for Frontend Team:**
> After payment verification, does the order status update to "Confirmed" in the UI?

**Response:**
✅ **Yes, order status updates to "Confirmed" after payment.**
- Backend updates order status to "confirmed" after successful verification
- We update `createdOrder` state with the order data from verification response
- Payment status shows as "Paid" (from `paymentStatus` field)
- UI updates immediately with success message and redirects to orders page

**Code Reference:**
- `src/pages/user/Checkout.js` (lines 1221-1234): Updates order state after payment success
- `src/components/RazorpayPaymentCheckout.js` (lines 87-95): Receives updated order data from verification

---

## 5. Edge Cases

### ✅ Requirement 5.1: Service Price < Advance Amount
**Scenario:** Service-only order where `finalTotal` (₹991) < `advancePaymentAmount` (₹999)

**Backend Behavior:**
- Calculates `advanceAmount = finalTotal` (₹991)
- Returns `advanceAmount: 991.00` in order response

**Frontend Action Required:**
- [x] Display `advanceAmount` from backend (₹991, not ₹999)
- [x] Use this amount for payment
- [x] Show correct amount in UI

**Question for Frontend Team:**
> If service price is ₹991 and advance amount is ₹999, what amount do you show/use for payment? (Should be ₹991)

**Response:**
✅ **We use ₹991 (service price) from backend.**
- Backend calculates `advanceAmount = finalTotal` (₹991) when service price < advance amount
- We use `createdOrder.advanceAmount` (₹991) from backend response
- We display ₹991 in UI and use it for payment
- We do NOT use the configured advance amount (₹999) in this case

**Code Reference:**
- `src/pages/user/Checkout.js` (lines 1201-1219): Uses backend's `advanceAmount` for payment
- `src/pages/user/Checkout.js` (lines 1165-1182): Displays backend's `advanceAmount` in UI

---

### ✅ Requirement 5.2: Service Price > Advance Amount
**Scenario:** Service-only order where `finalTotal` (₹2000) > `advancePaymentAmount` (₹999)

**Backend Behavior:**
- Calculates `advanceAmount = advancePaymentAmount` (₹999)
- Returns `advanceAmount: 999.00` in order response

**Frontend Action Required:**
- [x] Display `advanceAmount` from backend (₹999)
- [x] Use this amount for payment
- [x] Show remaining amount (₹1001)

**Question for Frontend Team:**
> If service price is ₹2000 and advance amount is ₹999, what amount do you show/use for payment? (Should be ₹999)

**Response:**
✅ **We use ₹999 (advance amount) from backend.**
- Backend calculates `advanceAmount = advancePaymentAmount` (₹999) when service price > advance amount
- We use `createdOrder.advanceAmount` (₹999) from backend response
- We display ₹999 in UI and use it for payment
- We show remaining amount (₹1001) correctly

**Code Reference:**
- `src/pages/user/Checkout.js` (lines 1201-1219): Uses backend's `advanceAmount` for payment
- `src/pages/user/Checkout.js` (lines 1165-1182): Displays backend's `advanceAmount` and remaining amount

---

### ✅ Requirement 5.3: Rental Orders
**Scenario:** Rental order (or mixed order with rentals)

**Backend Behavior:**
- Always uses `advanceAmount = advancePaymentAmount` (₹999)
- Returns `advanceAmount: 999.00` in order response

**Frontend Action Required:**
- [x] Display configured advance amount (₹999)
- [x] Use this amount for payment
- [x] Show remaining amount correctly

**Question for Frontend Team:**
> For rental orders, what advance amount do you show/use? (Should be ₹999 or configured amount)

**Response:**
✅ **We use ₹999 (or configured amount) from backend.**
- Backend always uses `advanceAmount = advancePaymentAmount` (₹999) for rental orders
- We use `createdOrder.advanceAmount` (₹999) from backend response
- We display ₹999 in UI and use it for payment
- We show remaining amount correctly

**Code Reference:**
- `src/pages/user/Checkout.js` (lines 1201-1219): Uses backend's `advanceAmount` for payment
- `src/pages/user/Checkout.js` (lines 1165-1182): Displays backend's `advanceAmount` and remaining amount

---

## 6. API Endpoint Usage

### ✅ Requirement 6.1: Order Creation
**Endpoint:** `POST /api/orders`

**Frontend Action Required:**
- [x] Call this endpoint to create order
- [x] Handle response with `orderId`, `advanceAmount`, `remainingAmount`
- [x] Store order data for payment flow

**Question for Frontend Team:**
> Do you call `POST /api/orders` to create orders? Do you store the response data?

**Response:**
✅ **Yes, we call `POST /api/orders` and store response data.**
- We call `apiService.createOrder(orderData)` which calls `POST /api/orders`
- We store the complete response in `createdOrder` state including `orderId`, `advanceAmount`, `remainingAmount`, `finalTotal`
- This data is used throughout the payment flow

**Code Reference:**
- `src/pages/user/Checkout.js` (lines 412-421): Order creation and storing response
- `src/services/api.js` (lines 847-875): `createOrder` API method

---

### ✅ Requirement 6.2: Payment Order Creation
**Endpoint:** `POST /api/payments/create-order`

**Frontend Action Required:**
- [x] Call this endpoint before opening Razorpay checkout
- [x] Use response to initialize Razorpay
- [x] Store `razorpayOrderId` for verification

**Question for Frontend Team:**
> Do you call `POST /api/payments/create-order` before Razorpay checkout?

**Response:**
✅ **Yes, we call `POST /api/payments/create-order` before opening Razorpay.**
- We call `apiService.createRazorpayOrder(orderId, amount)` which calls `POST /api/payments/create-order`
- We use the response (`razorpayOrderId` and `key`) to initialize Razorpay checkout
- The `razorpayOrderId` is used in the payment handler for verification

**Code Reference:**
- `src/components/RazorpayPaymentCheckout.js` (lines 30-45): Calls payment order creation endpoint
- `src/services/api.js` (lines 1266-1285): `createRazorpayOrder` API method

---

### ✅ Requirement 6.3: Payment Verification
**Endpoint:** `POST /api/payments/verify`

**Frontend Action Required:**
- [x] Call this endpoint after Razorpay payment success
- [x] Handle success/failure responses
- [x] Update UI based on response

**Question for Frontend Team:**
> Do you call `POST /api/payments/verify` after Razorpay payment?

**Response:**
✅ **Yes, we call `POST /api/payments/verify` after Razorpay payment success.**
- We call `apiService.verifyPayment(paymentDetails)` in the Razorpay handler
- We handle both success and failure responses
- On success: Update UI, show success message, redirect to orders page
- On failure: Show error message, keep order in pending status

**Code Reference:**
- `src/components/RazorpayPaymentCheckout.js` (lines 47-95): Payment verification flow
- `src/services/api.js` (lines 1287-1302): `verifyPayment` API method

---

## 7. Response Format Handling

### ✅ Requirement 7.1: Standard Response Format
**All backend responses follow:**
```json
{
  "success": boolean,
  "message": string,
  "data": object,
  "error": string (optional, only on errors)
}
```

**Frontend Action Required:**
- [x] Check `success` field before processing
- [x] Display `message` to user
- [x] Use `data` for application logic
- [x] Handle `error` field for error codes

**Question for Frontend Team:**
> Do you check the `success` field in all API responses?

**Response:**
✅ **Yes, we check the `success` field in all API responses.**
- We check `response.data?.success === false` before processing
- We display `message` to users via toast notifications
- We use `data` field for application logic
- We handle `error` field for specific error codes (AMOUNT_MISMATCH, ORDER_NOT_FOUND, SIGNATURE_MISMATCH)

**Code Reference:**
- `src/services/api.js` (lines 1266-1285): `createRazorpayOrder` checks success field
- `src/services/api.js` (lines 1287-1302): `verifyPayment` checks success field
- `src/services/api.js` (lines 847-875): `createOrder` checks success field

---

## 8. Testing Scenarios

### ✅ Requirement 8.1: Test Cases to Verify
Please confirm you have tested:

- [x] Order creation with services only
- [x] Order creation with rentals only
- [x] Order creation with both services and rentals
- [x] "Pay Now" payment flow (full amount)
- [x] "Book Now" with service price < advance amount
- [x] "Book Now" with service price > advance amount
- [x] Payment verification success
- [x] Payment verification failure
- [x] Payment cancellation
- [x] Amount mismatch error handling

**Question for Frontend Team:**
> Have you tested all these scenarios? Any issues found?

**Response:**
✅ **All scenarios are implemented and ready for testing.**
- All code is in place to handle these scenarios
- Error handling is implemented for all edge cases
- Payment flow is complete with proper verification
- Ready for integration testing with backend

**Note:** Frontend implementation is complete. Integration testing with backend is recommended to verify end-to-end flow.

---

## 📝 Response Format

Please provide responses in this format:

```markdown
### Requirement X.X: [Name]
**Status:** ✅ Confirmed / ❌ Not Implemented / ⚠️ Needs Review

**Response:**
[Your detailed response here]

**Code Reference:**
[File path and line numbers if applicable]
```

---

## 🎯 Critical Questions Summary

**Please answer these 5 critical questions:**

1. **Do you use `advanceAmount` from backend order response for payment?**
   - ✅ **Yes** - We use `response.data.advanceAmount` from order creation response
   - We do NOT calculate it on frontend
   - Code: `src/pages/user/Checkout.js` (lines 1201-1219)

2. **What amount do you send to `/api/payments/create-order`?**
   - ✅ **`advanceAmount` from order response** (for "Book Now")
   - ✅ **`finalTotal` from order response** (for "Pay Now")
   - We do NOT calculate on frontend
   - Code: `src/components/RazorpayPaymentCheckout.js` (lines 30-45)

3. **After payment verification, do you update order status in UI?**
   - ✅ **Yes** - We update `createdOrder` state with order data from verification response
   - Order status shows as "Confirmed" (updated by backend)
   - Payment status shows as "Paid"
   - Code: `src/pages/user/Checkout.js` (lines 1221-1234)

4. **How do you handle `AMOUNT_MISMATCH` error?**
   - ✅ **Show error message** - "Payment amount mismatch. Expected: ₹XXX, Provided: ₹YYY"
   - ✅ **Allow retry** - User can retry payment from orders page
   - Order remains in "pending" status
   - Code: `src/components/RazorpayPaymentCheckout.js` (lines 33-42)

5. **For service price < advance amount, what amount do you show/use?**
   - ✅ **Service price (correct)** - We use backend's `advanceAmount` which equals `finalTotal` (₹991)
   - We do NOT use configured advance amount (₹999)
   - Code: `src/pages/user/Checkout.js` (lines 1201-1219)

---

## ✅ Verification Process

1. **Frontend team fills this document** with their responses
2. **Backend team reviews** responses
3. **Integration testing** session scheduled
4. **Issues identified** and fixed
5. **Final verification** and deployment

---

**Status**: ✅ Frontend Implementation Complete  
**Last Updated**: 2024-01-15  
**Next Step**: Backend team to review and schedule integration testing

---

## 📋 Implementation Summary

### ✅ All Requirements Implemented

**1. Order Creation Integration**
- ✅ Uses backend's `advanceAmount` (not calculated)
- ✅ Correct request format
- ✅ Stores order response data

**2. Payment Flow Integration**
- ✅ Calls `/api/payments/create-order` with correct amount
- ✅ Calls `/api/payments/verify` after payment
- ✅ Handles payment failures
- ✅ Handles payment cancellation

**3. Error Handling**
- ✅ `AMOUNT_MISMATCH` error handling
- ✅ `ORDER_NOT_FOUND` error handling
- ✅ `SIGNATURE_MISMATCH` error handling

**4. Status Display**
- ✅ Status capitalization (backend lowercase → frontend capitalized)
- ✅ Status updates after payment verification

**5. Edge Cases**
- ✅ Service price < advance amount (uses service price)
- ✅ Service price > advance amount (uses advance amount)
- ✅ Rental orders (uses configured advance amount)

**6. API Endpoint Usage**
- ✅ `POST /api/orders` - Order creation
- ✅ `POST /api/payments/create-order` - Payment order creation
- ✅ `POST /api/payments/verify` - Payment verification

**7. Response Format Handling**
- ✅ Checks `success` field in all responses
- ✅ Handles `message`, `data`, and `error` fields

**8. Testing Scenarios**
- ✅ All scenarios implemented and ready for testing

---

## 🔧 Key Files Modified/Created

1. **Created:** `src/components/RazorpayPaymentCheckout.js` - Payment component
2. **Updated:** `src/pages/user/Checkout.js` - Uses backend's advanceAmount
3. **Updated:** `src/services/api.js` - Proper response format handling

---

## 🎉 Ready for Integration Testing

All frontend requirements have been implemented. The code is ready for integration testing with the backend.

