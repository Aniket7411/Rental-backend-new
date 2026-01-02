# Backend Update Requirements

## Overview
This document outlines the backend updates required to ensure proper integration with the frontend payment flow, order management, and service/rental booking functionality.

## Critical Updates Required

### 1. Order Status Capitalization
**Issue**: Order statuses should be displayed with proper capitalization (e.g., "Pending", "Confirmed", "Processing") on the frontend.

**Backend Action Required**:
- Ensure order statuses are stored in lowercase in the database (e.g., "pending", "confirmed", "processing")
- Frontend will handle capitalization, but backend should validate and normalize status values
- Valid status values: `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `completed`, `cancelled`

**API Response Format**:
```json
{
  "status": "pending",  // lowercase in database
  "paymentStatus": "paid"  // lowercase in database
}
```

**Validation**:
- Add validation middleware to ensure only valid status values are accepted
- Reject any status updates with invalid values

---

### 2. Advance Payment Amount Calculation for Services
**Issue**: When a service has a price less than the configured `advancePaymentAmount` (e.g., ₹991), the "Book Now" option should show the actual service price instead of the fixed advance amount.

**Current Behavior**: Frontend calculates `actualAdvanceAmount` as:
- For services-only orders: `min(finalTotal, advancePaymentAmount)`
- For rental orders: `advancePaymentAmount`

**Backend Action Required**:
- When creating an order with `paymentOption: "payAdvance"`, calculate the `advanceAmount` field as:
  ```javascript
  // Pseudo-code
  if (order contains only services && finalTotal < advancePaymentAmount) {
    advanceAmount = finalTotal;
  } else {
    advanceAmount = advancePaymentAmount; // from settings
  }
  ```
- Store the calculated `advanceAmount` in the order document
- Return the calculated `advanceAmount` in the order creation response

**Order Schema Update**:
```javascript
{
  orderId: String,
  paymentOption: String, // "payNow" or "payAdvance"
  advanceAmount: Number, // Calculated based on order type and total
  remainingAmount: Number, // finalTotal - advanceAmount
  finalTotal: Number,
  // ... other fields
}
```

**API Endpoint**: `POST /api/orders`
- Ensure `advanceAmount` is calculated correctly before saving
- Return calculated `advanceAmount` in response

---

### 3. Payment Success Flow and Order Status Update
**Issue**: After successful payment verification, the order status should be updated to "confirmed" and payment status to "paid". After payment failure or cancellation, the order should remain in "pending" status with "pending" payment status.

**Backend Action Required**:

#### Payment Verification Endpoint: `POST /api/payments/verify`
After successful payment verification:
1. Update the order's `paymentStatus` to `"paid"`
2. Update the order's `status` to `"confirmed"` (if currently "pending")
3. Store payment details in the payment record
4. Return updated order data in response
5. **CRITICAL**: Ensure order status is updated immediately after verification

#### Payment Failure Handling:
- If payment verification fails, do NOT update order status
- Keep order status as "pending" and payment status as "pending"
- Allow user to retry payment later
- Store payment failure reason in payment record for debugging

#### Payment Cancellation Handling:
- If user cancels payment, do NOT update order status
- Keep order status as "pending" and payment status as "pending"
- Order should remain accessible for payment retry

**Implementation**:
```javascript
// After successful payment verification
await Order.findByIdAndUpdate(orderId, {
  paymentStatus: 'paid',
  status: 'confirmed', // if currently pending
  updatedAt: new Date()
});

// Return updated order
const updatedOrder = await Order.findById(orderId);
return res.json({
  success: true,
  message: 'Payment verified successfully',
  data: {
    order: updatedOrder,
    payment: paymentRecord
  }
});
```

**Payment Record Schema**:
```javascript
{
  paymentId: String, // Auto-generated
  orderId: String,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  amount: Number,
  currency: String,
  status: String, // "verified", "failed"
  verifiedAt: Date,
  // ... other fields
}
```

---

### 4. Razorpay Integration - Live Keys Configuration
**Issue**: Ensure live Razorpay keys are properly configured and payment links are working.

**Backend Action Required**:

#### Environment Variables:
```env
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
RAZORPAY_PAYMENT_LINK=https://razorpay.me/@ashenterprises7767
```

#### Payment Link Endpoint: `GET /api/payments/link`
- Return the configured payment link from environment variables
- Response format:
```json
{
  "success": true,
  "data": {
    "paymentLink": "https://razorpay.me/@ashenterprises7767"
  }
}
```

#### Razorpay Order Creation: `POST /api/payments/create-order`
- Use live Razorpay keys from environment variables
- Ensure proper error handling for payment gateway failures
- Return Razorpay order ID and payment ID

**Implementation Checklist**:
- [ ] Verify `RAZORPAY_KEY_ID` is set to live key
- [ ] Verify `RAZORPAY_KEY_SECRET` is set to live secret
- [ ] Test payment order creation with live keys
- [ ] Test payment verification with live keys
- [ ] Ensure payment link is accessible and working

---

### 5. Checkout Page Conditional Display
**Issue**: The checkout page should display only relevant information based on whether the order contains services, rentals, or both.

**Frontend Implementation** (Already Complete):
- Services-only orders: Show service booking details, hide rental-specific fields (installation charges, delivery address validation)
- Rentals-only orders: Show rental product details, installation charges (for ACs), delivery address validation, hide service-specific fields
- Mixed orders: Show all relevant information for both types

**Backend Action Required**:
- Ensure order creation validates and stores appropriate fields based on order type
- For service items: Validate booking details (address, date, time) are present
- For rental items: Validate delivery address is present
- Return order data with proper item type classification

**Order Item Type Detection**:
```javascript
// Backend should properly identify item types
items.forEach(item => {
  if (item.type === 'service') {
    // Validate service booking details
    validateServiceBooking(item.bookingDetails);
  } else if (item.type === 'rental') {
    // Validate rental delivery info
    validateRentalDelivery(item.deliveryInfo);
  }
});
```

---

### 6. Order Creation Response Format
**Issue**: Frontend expects specific fields in the order creation response.

**Required Response Format**:
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "orderId": "ORD-2024-123",
    "finalTotal": 1500.00,
    "advanceAmount": 991.00, // If payAdvance, calculated value
    "remainingAmount": 509.00, // If payAdvance, finalTotal - advanceAmount
    "paymentStatus": "pending",
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00.000Z",
    // ... other order fields
  }
}
```

**Critical Fields**:
- `orderId`: Must be returned (frontend uses this for payment)
- `finalTotal`: Final calculated total after all discounts
- `advanceAmount`: Calculated advance amount (if payAdvance)
- `remainingAmount`: Remaining amount after advance (if payAdvance)

---

### 7. Service Booking Flow
**Issue**: Ensure service bookings are properly created and linked to orders.

**Backend Action Required**:

#### Service Booking in Order Items:
When an order contains service items, ensure:
- Service booking details are properly stored
- Booking address, date, time are preserved
- Service price is correctly calculated
- Service booking status is updated when order is confirmed

**Order Item Schema for Services**:
```javascript
{
  type: "service",
  serviceId: String,
  quantity: Number,
  price: Number,
  serviceDetails: {
    title: String,
    description: String,
    image: String
  },
  bookingDetails: {
    name: String,
    phone: String,
    preferredDate: Date,
    preferredTime: String,
    address: String,
    addressType: String,
    contactName: String,
    contactPhone: String
  }
}
```

---

### 8. Rental Booking Flow
**Issue**: Ensure rental orders are properly created with all required fields.

**Backend Action Required**:

#### Rental Order Items:
When an order contains rental items, ensure:
- Product details are properly stored
- Installation charges are included (for AC products)
- Monthly payment details are preserved (if applicable)
- Delivery address is properly stored
- Duration is correctly set

**Order Item Schema for Rentals**:
```javascript
{
  type: "rental",
  productId: String,
  quantity: Number,
  price: Number,
  installationCharges: Number, // For AC products
  duration: Number, // 3, 6, 9, 11, 12, or 24 months
  isMonthlyPayment: Boolean,
  monthlyPrice: Number,
  monthlyTenure: Number,
  securityDeposit: Number,
  productDetails: {
    brand: String,
    model: String,
    capacity: String,
    // ... other product fields
  },
  deliveryInfo: {
    address: String,
    nearLandmark: String,
    pincode: String,
    contactName: String,
    contactPhone: String,
    alternatePhone: String
  }
}
```

---

### 9. Error Handling and Validation
**Backend Action Required**:

#### Order Creation Validation:
- Validate all required fields are present
- Validate payment option is valid ("payNow" or "payAdvance")
- Validate order total is greater than 0
- Validate service booking details (address, date, time) for service items
- Validate delivery address for rental items
- Return clear error messages for validation failures

#### Payment Verification Validation:
- Validate Razorpay signature
- Verify payment amount matches order amount
- Check payment hasn't been verified already
- Return clear error messages for verification failures

**Error Response Format**:
```json
{
  "success": false,
  "message": "Clear error message for user",
  "error": "ERROR_CODE", // For debugging
  "details": {} // Optional additional details
}
```

---

### 10. Testing Checklist
**Backend Testing Required**:

#### Order Creation:
- [ ] Test order creation with services only
- [ ] Test order creation with rentals only
- [ ] Test order creation with both services and rentals
- [ ] Test "Pay Now" option
- [ ] Test "Book Now" option with service price < advance amount
- [ ] Test "Book Now" option with service price > advance amount
- [ ] Test "Book Now" option with rental orders
- [ ] Verify all discounts are applied correctly
- [ ] Verify coupon discounts are applied correctly

#### Payment Flow:
- [ ] Test Razorpay order creation
- [ ] Test payment verification with valid signature
- [ ] Test payment verification with invalid signature (should fail)
- [ ] Verify order status updates to "confirmed" after payment
- [ ] Verify payment status updates to "paid" after payment
- [ ] Test payment link endpoint returns correct link

#### Order Status Updates:
- [ ] Verify order statuses are stored in lowercase
- [ ] Test order status update endpoint
- [ ] Verify invalid status values are rejected

---

### 11. API Endpoints Summary

#### Required Endpoints:
1. `POST /api/orders` - Create order
   - Calculate `advanceAmount` correctly for services
   - Return complete order data including calculated amounts

2. `POST /api/payments/create-order` - Create Razorpay order
   - Use live Razorpay keys
   - Generate payment ID
   - Return Razorpay order ID

3. `POST /api/payments/verify` - Verify payment
   - Verify Razorpay signature
   - Update order status to "confirmed"
   - Update payment status to "paid"
   - Return updated order data

4. `GET /api/payments/link` - Get payment link
   - Return configured payment link from environment

5. `GET /api/orders/:orderId` - Get order by ID
   - Return order with all details
   - Include payment status

6. `GET /api/users/:userId/orders` - Get user orders
   - Return all orders for user
   - Include proper status values

---

### 12. Database Schema Updates

#### Order Schema:
```javascript
{
  orderId: String, // Unique order ID
  userId: ObjectId,
  items: [{
    type: String, // "rental" or "service"
    // ... item-specific fields
  }],
  total: Number,
  productDiscount: Number,
  discount: Number,
  couponCode: String,
  couponDiscount: Number,
  paymentDiscount: Number,
  finalTotal: Number,
  paymentOption: String, // "payNow" or "payAdvance"
  paymentStatus: String, // "pending" or "paid"
  status: String, // "pending", "confirmed", "processing", etc.
  advanceAmount: Number, // Calculated for payAdvance
  remainingAmount: Number, // Calculated for payAdvance
  customerInfo: Object,
  deliveryAddresses: Array,
  createdAt: Date,
  updatedAt: Date
}
```

#### Payment Schema:
```javascript
{
  paymentId: String, // Auto-generated unique ID
  orderId: String,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  amount: Number,
  currency: String,
  status: String, // "pending", "verified", "failed"
  verifiedAt: Date,
  createdAt: Date
}
```

---

### 13. Environment Variables Checklist

Ensure these environment variables are set:
```env
# Razorpay Configuration (LIVE KEYS)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
RAZORPAY_PAYMENT_LINK=https://razorpay.me/@ashenterprises7767

# Database
MONGODB_URI=mongodb://...

# Server
PORT=5000
NODE_ENV=production

# Email (if using email notifications)
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
```

---

### 14. Priority Order

1. **HIGH PRIORITY**:
   - Payment verification and order status update (Section 3)
   - Advance payment amount calculation for services (Section 2)
   - Razorpay live keys configuration (Section 4)

2. **MEDIUM PRIORITY**:
   - Order creation response format (Section 5)
   - Service and rental booking flow (Sections 6-7)
   - Error handling and validation (Section 8)

3. **LOW PRIORITY**:
   - Order status capitalization (Section 1) - Frontend handles this
   - Additional testing (Section 9)

---

### 15. Frontend Payment Flow Requirements

#### Payment Success Flow:
1. User completes payment via Razorpay
2. Frontend calls `POST /api/payments/verify` with payment details
3. Backend verifies payment and updates order status to "confirmed"
4. Frontend receives success response
5. Frontend clears cart, shows success modal, and redirects to `/user/orders` after 5 seconds

#### Payment Failure Flow:
1. Payment fails or verification fails
2. Backend returns error response (order status remains "pending")
3. Frontend shows error message to user
4. Order remains in cart/checkout for retry
5. User can navigate to orders page to retry payment later

#### Payment Cancellation Flow:
1. User cancels payment modal
2. Frontend shows info message
3. Order remains created with "pending" status
4. User is redirected to orders page after 3 seconds
5. User can retry payment from orders page

#### Checkout Page Display Logic:
- **Services Only**: Show service-specific information, hide rental-specific fields
- **Rentals Only**: Show rental-specific information (installation charges, delivery address), hide service-specific fields
- **Both**: Show all relevant information for both types
- **Payment Options**: 
  - "Pay Now": Show full amount with instant discount
  - "Book Now": Show advance amount (calculated based on order type) with advance discount

---

### 16. Notes

- Frontend handles status capitalization, so backend can store statuses in lowercase
- Frontend calculates `actualAdvanceAmount` for display, but backend should also calculate it correctly for consistency
- Payment verification must update order status immediately after successful verification
- Payment failures should NOT update order status - keep as "pending" for retry
- Payment cancellations should NOT update order status - keep as "pending" for retry
- All monetary values should be rounded to 2 decimal places
- Ensure all API responses follow the standard format with `success`, `message`, and `data` fields
- Checkout page shows only relevant information based on order type (services vs rentals)

---

## Contact
For any questions or clarifications regarding these backend updates, please refer to the frontend code in:
- `src/pages/user/Checkout.js` - Order creation and payment flow
- `src/components/RazorpayPaymentCheckout.jsx` - Payment integration
- `src/services/api.js` - API service calls

---

---

### 17. Frontend Implementation Summary

#### Files Modified:
1. `src/pages/user/Checkout.js` - Main checkout page with conditional rendering
2. `src/pages/user/Orders.js` - Order status capitalization
3. `src/pages/user/OrderDetail.js` - Order status capitalization
4. `src/pages/admin/AdminOrders.js` - Order status capitalization

#### Key Features Implemented:
- ✅ Order status capitalization (Pending, Confirmed, etc.)
- ✅ Advance payment amount calculation for services (min of finalTotal and advancePaymentAmount)
- ✅ Payment success flow with proper redirection to orders page
- ✅ Payment failure handling with error messages
- ✅ Payment cancellation handling with info messages
- ✅ Conditional checkout page display (services vs rentals)
- ✅ Proper success modal display after payment

#### Testing Checklist:
- [ ] Test checkout with services only
- [ ] Test checkout with rentals only
- [ ] Test checkout with both services and rentals
- [ ] Test "Pay Now" payment flow
- [ ] Test "Book Now" payment flow with service price < advance amount
- [ ] Test "Book Now" payment flow with service price > advance amount
- [ ] Test payment success and verify redirect to orders page
- [ ] Test payment failure and verify error message
- [ ] Test payment cancellation and verify info message
- [ ] Verify order statuses are capitalized correctly
- [ ] Verify checkout page shows only relevant information

---

**Last Updated**: 2024-01-15
**Version**: 2.0

