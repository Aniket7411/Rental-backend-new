# Checkout Section - Backend Developer Handoff Document

**Project:** Rental Service Platform  
**Date:** December 2024  
**Frontend Status:** Complete and Tested  
**Priority:** Critical - Final Handover

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Checkout Flow Overview](#checkout-flow-overview)
3. [Order Creation API Requirements](#order-creation-api-requirements)
4. [Payment Integration (Razorpay)](#payment-integration-razorpay)
5. [Coupon System](#coupon-system)
6. [Data Validation Requirements](#data-validation-requirements)
7. [Critical Testing Points](#critical-testing-points)
8. [Frontend Implementation Details](#frontend-implementation-details)
9. [Known Issues & Notes](#known-issues--notes)
10. [API Endpoint Specifications](#api-endpoint-specifications)

---

## Executive Summary

The checkout section has been thoroughly tested and reviewed. The frontend implementation is complete with proper validation, error handling, and user feedback mechanisms. This document outlines all backend requirements and expectations for seamless integration.

### Key Features Implemented:
- ✅ Payment Options (Pay Now / Pay Later)
- ✅ Coupon Code System
- ✅ Order Creation with Complete Data Structure
- ✅ Razorpay Payment Integration
- ✅ Address Validation
- ✅ Discount Calculations (Product + Payment + Coupon)
- ✅ Support for Rentals and Services in Single Order
- ✅ Monthly Payment Options
- ✅ Installation Charges Handling

---

## Checkout Flow Overview

### 1. Pre-Checkout Validation
- User must be authenticated (login required)
- Cart must not be empty
- **NEW:** Rentals require user delivery address validation
- **NEW:** Services require complete booking details (date, time, address)

### 2. Checkout Page Flow

```
User arrives at /checkout
  ↓
Validation Checks:
  - User authenticated? → Redirect to login if not
  - Cart empty? → Redirect to cart if empty
  ↓
Display:
  - Available Coupons Section
  - Payment Options (Pay Now / Pay Later)
  - Order Items (Rentals + Services)
  - Order Summary with Discounts
  ↓
User Actions:
  - Apply/Remove Coupon
  - Select Payment Option
  - Review Order Details
  - Click "Place Order"
  ↓
Order Creation:
  - Validate all required data
  - Create order via API
  - If Pay Now → Show Razorpay Payment Gateway
  - If Pay Later → Show Success Modal
  ↓
Post-Order:
  - Clear Cart (only after successful order/payment)
  - Redirect to Orders Page
```

---

## Order Creation API Requirements

### Endpoint: `POST /api/orders`

### Request Body Structure

The frontend sends a comprehensive order object. Here's the exact structure:

```json
{
  "orderId": "ORD-2024-123",  // Generated on frontend (format: ORD-YYYY-XXX)
  "items": [
    {
      "type": "rental",
      "productId": "product_id_here",
      "quantity": 1,
      "price": 15000,  // Base rental price
      "installationCharges": 2000,  // Only for AC products
      "duration": 6,  // 3, 6, 9, 11, 12, or 24 months (or monthlyTenure for monthly payments)
      "isMonthlyPayment": false,
      "monthlyPrice": null,  // If monthly payment, this contains monthly amount
      "monthlyTenure": null,  // If monthly payment, this contains tenure (3, 6, 9, 11, 12, 24)
      "securityDeposit": null,  // Only for monthly payments
      "productDetails": {
        "brand": "LG",
        "model": "1.5 Ton Split AC",
        "capacity": "1.5 Ton",
        "productType": "Split",
        "location": "Delhi",
        "description": "...",
        "images": ["url1", "url2"],
        "installationCharges": {
          "amount": 2000,
          "type": "fixed"
        },
        "monthlyPaymentEnabled": true,
        "monthlyPrice": 3500
      },
      "deliveryInfo": {
        "address": "User's home address",
        "nearLandmark": "Near landmark",
        "pincode": "110001",
        "contactName": "User Name",
        "contactPhone": "+91xxxxxxxxxx",
        "alternatePhone": "+91xxxxxxxxxx"
      }
    },
    {
      "type": "service",
      "serviceId": "service_id_here",
      "quantity": 1,
      "price": 500,
      "serviceDetails": {
        "title": "AC Installation",
        "description": "...",
        "image": "url"
      },
      "bookingDetails": {
        "name": "Contact Name",
        "phone": "+91xxxxxxxxxx",
        "preferredDate": "2024-12-25",
        "preferredTime": "10-12",
        "address": "Service address",
        "addressType": "myself",  // or "someoneElse"
        "contactName": "Contact Name",
        "contactPhone": "+91xxxxxxxxxx"
      }
    }
  ],
  "total": 17500,  // Subtotal after product discounts
  "productDiscount": 500,  // Total product discount amount
  "discount": 8500,  // Total discount (product + payment + coupon)
  "couponCode": "SAVE10",  // null if no coupon
  "couponDiscount": 2000,  // Coupon discount amount
  "paymentDiscount": 6000,  // Payment option discount (Pay Now discount)
  "finalTotal": 9000,  // Final amount to be charged
  "paymentOption": "payNow",  // "payNow" or "payLater"
  "paymentStatus": "pending",  // "pending" initially, updated after payment verification
  "customerInfo": {
    "userId": "user_id_here",
    "name": "User Name",
    "email": "user@example.com",
    "phone": "+91xxxxxxxxxx",
    "alternatePhone": "+91xxxxxxxxxx",
    "address": {
      "homeAddress": "User's home address",
      "nearLandmark": "Near landmark",
      "pincode": "110001"
    }
  },
  "deliveryAddresses": [
    {
      "type": "rental",
      "address": "User's home address",
      "nearLandmark": "Near landmark",
      "pincode": "110001",
      "contactName": "User Name",
      "contactPhone": "+91xxxxxxxxxx",
      "alternatePhone": "+91xxxxxxxxxx"
    },
    {
      "type": "service",
      "address": "Service address",
      "contactName": "Contact Name",
      "contactPhone": "+91xxxxxxxxxx",
      "preferredDate": "2024-12-25",
      "preferredTime": "10-12",
      "addressType": "myself"
    }
  ],
  "orderDate": "2024-12-20T10:30:00.000Z",
  "createdAt": "2024-12-20T10:30:00.000Z",
  "updatedAt": "2024-12-20T10:30:00.000Z",
  "notes": "Order contains both rental products and services"  // or appropriate note
}
```

### Backend Validation Requirements

**CRITICAL:** Backend must validate:

1. **User Authentication**: Order must be associated with authenticated user
2. **Order ID Uniqueness**: Ensure `orderId` format is valid and unique
3. **Product/Service Availability**: Verify products and services exist and are available
4. **Address Validation**: 
   - Rental items require valid delivery address
   - Service items require valid booking address
5. **Price Validation**: 
   - Verify prices match current product/service prices
   - Validate discount calculations don't result in negative totals
   - Ensure finalTotal >= 0
6. **Coupon Validation**: 
   - Verify coupon code is valid and applicable
   - Check minimum order amount requirements
   - Verify coupon usage limits
7. **Duration Validation**: 
   - For rentals: duration must be one of [3, 6, 9, 11, 12, 24]
   - For monthly payments: tenure must be valid
8. **Installation Charges**: 
   - Only apply to AC products
   - Validate amount matches product's installation charges

### Response Structure

```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "orderId": "ORD-2024-123",
    "order": { /* Full order object as stored in DB */ },
    "createdAt": "2024-12-20T10:30:00.000Z"
  }
}
```

### Error Handling

Backend should return appropriate error messages:

```json
{
  "success": false,
  "message": "Specific error message here",
  "error": "ERROR_CODE"
}
```

Common error scenarios:
- Invalid product/service ID
- Insufficient stock/availability
- Invalid coupon code
- Price mismatch
- Missing required fields
- Address validation failure

---

## Payment Integration (Razorpay)

### Flow Overview

1. **Order Creation**: Order is created first with `paymentStatus: "pending"`
2. **Payment Initiation**: If `paymentOption: "payNow"`, frontend calls payment APIs
3. **Payment Verification**: After Razorpay payment, frontend verifies with backend
4. **Order Update**: Backend updates order `paymentStatus: "paid"` after verification

### API Endpoints Required

#### 1. Create Razorpay Order
**Endpoint:** `POST /api/payments/create-order`

**Request:**
```json
{
  "orderId": "ORD-2024-123",
  "amount": 9000  // finalTotal in rupees
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "ORD-2024-123",
    "paymentId": "payment_id_from_backend",
    "razorpayOrderId": "order_razorpay_id",
    "amount": 9000,
    "currency": "INR",
    "key": "razorpay_key_id"  // Optional: Frontend can use env variable
  }
}
```

#### 2. Verify Payment
**Endpoint:** `POST /api/payments/verify`

**Request:**
```json
{
  "razorpay_order_id": "order_razorpay_id",
  "razorpay_payment_id": "payment_razorpay_id",
  "razorpay_signature": "signature_from_razorpay",
  "paymentId": "payment_id_from_backend"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "orderId": "ORD-2024-123",
    "paymentId": "payment_id",
    "paymentStatus": "paid",
    "verifiedAt": "2024-12-20T10:35:00.000Z"
  }
}
```

**Backend Actions on Verification:**
1. Verify Razorpay signature
2. Update order `paymentStatus` to `"paid"`
3. Create/update payment record
4. Send confirmation email (non-blocking)
5. Update inventory if applicable

#### 3. Payment Status Check (Optional)
**Endpoint:** `GET /api/payments/:paymentId`

Used to check payment status if needed.

---

## Coupon System

### Coupon Validation
**Endpoint:** `POST /api/coupons/validate`

**Request:**
```json
{
  "code": "SAVE10",
  "orderTotal": 17500,  // Subtotal after product discounts
  "items": [
    {
      "type": "rental",
      "category": "AC",
      "duration": 6
    }
  ]
}
```

**Response (Valid):**
```json
{
  "success": true,
  "data": {
    "_id": "coupon_id",
    "code": "SAVE10",
    "title": "Save 10%",
    "description": "Get 10% off on your order",
    "type": "percentage",  // or "fixed"
    "value": 10,  // 10% or ₹500 (for fixed)
    "minAmount": 1000,
    "validUntil": "2024-12-31T23:59:59.000Z",
    "applicableCategories": ["AC"],  // null for all categories
    "applicableDurations": [3, 6, 9, 12]  // null for all durations
  }
}
```

**Response (Invalid):**
```json
{
  "success": false,
  "message": "Coupon code is invalid or expired",
  "error": "COUPON_INVALID"
}
```

### Available Coupons
**Endpoint:** `GET /api/coupons/available?userId=xxx&minAmount=17500`

Returns list of coupons applicable to the user's current order.

### Backend Validation Logic

1. **Code Validation**: Check if coupon exists and is active
2. **Expiry Check**: Verify `validUntil` date
3. **Usage Limits**: Check user's usage count vs coupon's usage limit
4. **Minimum Amount**: Verify `orderTotal >= minAmount`
5. **Category Filtering**: If `applicableCategories` is set, verify items match
6. **Duration Filtering**: If `applicableDurations` is set, verify rental durations match

---

## Data Validation Requirements

### Frontend Validation (Already Implemented)

✅ **Cart Validation**: Empty cart check  
✅ **User Authentication**: Login required  
✅ **Address Validation**: 
  - Rentals require user's delivery address
  - Services require booking address in cart item
✅ **Service Booking Details**: Date, time, and address required
✅ **Coupon Validation**: Minimum amount check
✅ **Price Validation**: Final total >= 0

### Backend Validation (Required)

⚠️ **CRITICAL:** Backend must implement additional validation:

1. **Price Integrity**: 
   - Verify all prices match current database prices
   - Validate discounts don't exceed original prices
   - Ensure finalTotal calculation matches frontend

2. **Inventory/Availability**:
   - Check product availability before order creation
   - Verify service booking slots are available

3. **Business Rules**:
   - Minimum order amount (if applicable)
   - Maximum discount limits
   - Product/service combination rules

4. **Data Consistency**:
   - Verify productId and serviceId exist
   - Validate all referenced IDs are valid
   - Check for duplicate orderId

---

## Critical Testing Points

### 1. Order Creation Tests

- ✅ Create order with rentals only
- ✅ Create order with services only
- ✅ Create order with both rentals and services
- ✅ Order with Pay Now option
- ✅ Order with Pay Later option
- ✅ Order with coupon applied
- ✅ Order with payment discount (Pay Now)
- ✅ Order with product discounts
- ✅ Order with monthly payment rentals
- ✅ Order with installation charges (AC products)

### 2. Payment Flow Tests

- ✅ Create order → Initiate payment → Complete payment
- ✅ Create order → Initiate payment → Cancel payment
- ✅ Create order → Initiate payment → Payment failure
- ✅ Payment verification with valid signature
- ✅ Payment verification with invalid signature
- ✅ Order status update after payment

### 3. Coupon Tests

- ✅ Apply valid coupon
- ✅ Apply expired coupon (should fail)
- ✅ Apply coupon below minimum amount (should fail)
- ✅ Apply coupon exceeding usage limit (should fail)
- ✅ Remove applied coupon
- ✅ Multiple coupons in sequence

### 4. Edge Cases

- ✅ Empty cart validation
- ✅ Missing address validation
- ✅ Missing service booking details
- ✅ Negative total prevention
- ✅ Invalid product/service ID
- ✅ Price mismatch handling
- ✅ Network error handling
- ✅ Concurrent order creation

### 5. Data Integrity Tests

- ✅ Order ID uniqueness
- ✅ All required fields present
- ✅ Address format validation
- ✅ Phone number format validation
- ✅ Date/time format validation
- ✅ Price calculation accuracy

---

## Frontend Implementation Details

### Key Components

1. **Checkout.js** (`src/pages/user/Checkout.js`)
   - Main checkout page
   - Order creation logic
   - Payment flow handling
   - Coupon management

2. **RazorpayPaymentCheckout.jsx** (`src/components/RazorpayPaymentCheckout.jsx`)
   - Razorpay integration
   - Payment initiation
   - Payment verification

3. **CartContext.js** (`src/context/CartContext.js`)
   - Cart state management
   - Totals calculation
   - Discount calculations

### Discount Calculation Flow

```
Base Prices (Rentals + Services)
  ↓
Product Discounts Applied → Subtotal
  ↓
Payment Discount (if Pay Now) → Discounted Amount
  ↓
Coupon Discount Applied → Final Total
```

**Important:** Product discounts are applied first (included in subtotal). Payment and coupon discounts are applied on the subtotal.

### Payment Options

1. **Pay Now** (`paymentOption: "payNow"`)
   - Immediate payment via Razorpay
   - Applies instant payment discount
   - Order created with `paymentStatus: "pending"`
   - Updated to `"paid"` after payment verification

2. **Pay Later** (`paymentOption: "payLater"`)
   - No immediate payment
   - Order created with `paymentStatus: "pending"`
   - Payment can be collected later (on delivery/service completion)

### Monthly Payment Handling

For monthly payment rentals:
- `isMonthlyPayment: true`
- `monthlyPrice`: Monthly rental amount
- `monthlyTenure`: Total months (3, 6, 9, 11, 12, 24)
- `securityDeposit`: Security deposit amount
- `duration`: Same as `monthlyTenure`
- Order price = `monthlyPrice + securityDeposit + installationCharges` (for first month)

---

## Known Issues & Notes

### ✅ Fixed in Frontend

1. **Address Validation**: Added validation for rental delivery addresses
2. **Service Booking Validation**: Added validation for complete service booking details
3. **Negative Total Prevention**: Added check to ensure finalTotal >= 0
4. **Coupon Discount Cap**: Fixed amount coupons now capped at subtotal

### ⚠️ Backend Considerations

1. **Order ID Generation**: Frontend generates orderId, but backend should validate uniqueness
2. **Email Notifications**: Should be non-blocking (already implemented in backend per previous docs)
3. **Inventory Management**: Backend should update inventory after order confirmation
4. **Payment Timeout**: Consider handling cases where payment is initiated but not completed within timeframe
5. **Order Cancellation**: Implement logic for canceling orders with pending payments

### 🔄 Future Enhancements (Not Required Now)

1. Pay Advance option (₹999 advance payment)
2. Multiple payment methods
3. Order modification after creation
4. Partial payment support

---

## API Endpoint Specifications

### Order Endpoints

#### POST `/api/orders`
Create new order (see [Order Creation API Requirements](#order-creation-api-requirements))

#### GET `/api/orders`
Get user's orders

#### GET `/api/orders/:orderId`
Get order details

#### PATCH `/api/orders/:orderId/cancel`
Cancel order

### Payment Endpoints

#### POST `/api/payments/create-order`
Create Razorpay order (see [Payment Integration](#payment-integration-razorpay))

#### POST `/api/payments/verify`
Verify payment (see [Payment Integration](#payment-integration-razorpay))

#### GET `/api/payments/:paymentId`
Get payment status

### Coupon Endpoints

#### GET `/api/coupons/available`
Get available coupons for user
- Query params: `userId`, `minAmount`, `category`

#### POST `/api/coupons/validate`
Validate coupon code (see [Coupon System](#coupon-system))

### Settings Endpoints

#### GET `/api/settings`
Get platform settings (discount percentages, etc.)

Settings required:
```json
{
  "instantPaymentDiscount": 5,  // Percentage for Pay Now
  "advancePaymentDiscount": 3   // Percentage for Pay Advance (future use)
}
```

---

## Testing Checklist for Backend Developer

### Pre-Deployment Checks

- [ ] Order creation API accepts all required fields
- [ ] Order ID uniqueness validation working
- [ ] Price validation implemented
- [ ] Address validation implemented
- [ ] Coupon validation logic complete
- [ ] Payment creation API working
- [ ] Payment verification working
- [ ] Order status updates correctly after payment
- [ ] Email notifications sent (non-blocking)
- [ ] Error handling comprehensive
- [ ] All edge cases handled

### Integration Testing

- [ ] Test complete checkout flow end-to-end
- [ ] Test payment flow with Razorpay test mode
- [ ] Test coupon application and validation
- [ ] Test order creation with various product combinations
- [ ] Test error scenarios (invalid data, network issues)
- [ ] Test concurrent order creation
- [ ] Verify order data integrity in database

### Performance Testing

- [ ] Order creation responds within 3 seconds
- [ ] Payment API responds quickly
- [ ] Database queries optimized
- [ ] No memory leaks in order creation process

---

## Support & Contact

For questions or clarifications about the frontend implementation, refer to:
- Checkout component: `src/pages/user/Checkout.js`
- Payment component: `src/components/RazorpayPaymentCheckout.jsx`
- API service: `src/services/api.js`
- Cart context: `src/context/CartContext.js`

---

## Summary

The checkout section frontend is **complete and production-ready**. All validation, error handling, and user feedback mechanisms are in place. The backend needs to:

1. ✅ Accept the order structure as documented
2. ✅ Implement proper validation and error handling
3. ✅ Integrate Razorpay payment gateway
4. ✅ Implement coupon validation logic
5. ✅ Update order status after payment verification
6. ✅ Send confirmation emails (non-blocking)

**The frontend expects the backend to validate all critical business rules and data integrity, as the frontend validation is primarily for user experience and cannot guarantee data security.**

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Status:** Ready for Backend Integration

