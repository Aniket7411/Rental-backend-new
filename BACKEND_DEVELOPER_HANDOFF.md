# Backend Developer Handoff Documentation
## Rental Service - Frontend to Backend Integration Guide

**Project:** Rental Service - AC Rentals & Services Platform  
**Frontend Technology:** React.js with Tailwind CSS  
**Backend API Base URL:** `https://rental-backend-new.onrender.com/api`  
**Date:** Pre-Handover Testing & Documentation  
**Status:** ✅ Ready for Backend Cross-Check

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [API Configuration](#2-api-configuration)
3. [Authentication APIs](#3-authentication-apis)
4. [Product Management APIs](#4-product-management-apis)
5. [Order Management APIs](#5-order-management-apis)
6. [Service Management APIs](#6-service-management-apis)
7. [Payment Integration (Razorpay)](#7-payment-integration-razorpay)
8. [Coupon Management APIs](#8-coupon-management-apis)
9. [Wishlist APIs](#9-wishlist-apis)
10. [Ticket/Support System APIs](#10-ticketsupport-system-apis)
11. [Lead Management APIs](#11-lead-management-apis)
12. [FAQ Management APIs](#12-faq-management-apis)
13. [Contact & Vendor APIs](#13-contact--vendor-apis)
14. [Rental Inquiry APIs](#14-rental-inquiry-apis)
15. [User Profile APIs](#15-user-profile-apis)
16. [Frontend Expectations & Data Formats](#16-frontend-expectations--data-formats)
17. [Error Handling Standards](#17-error-handling-standards)
18. [Testing Checklist](#18-testing-checklist)
19. [Known Issues & Fixes](#19-known-issues--fixes)
20. [Deployment Notes](#20-deployment-notes)

---

## 1. Project Overview

### Application Features
- **AC/Product Rentals**: Browse, filter, and rent ACs, Refrigerators, and Washing Machines
- **Service Bookings**: Book AC repair and maintenance services
- **User Dashboard**: Manage orders, service bookings, wishlist, and profile
- **Admin Dashboard**: Manage products, orders, services, leads, tickets, FAQs, and coupons
- **Payment Integration**: Razorpay payment gateway for online payments
- **Coupon System**: Discount coupons with percentage and fixed amount support
- **Order Management**: Create, view, cancel orders with invoice generation
- **Lead Management**: Capture and manage customer leads
- **Support Tickets**: User support ticket system

### Tech Stack
- **Frontend**: React 19.2.0, React Router DOM 7.9.5
- **Styling**: Tailwind CSS 3.4.18
- **HTTP Client**: Axios 1.13.2
- **Animations**: Framer Motion 12.23.24
- **Icons**: Lucide React, React Icons
- **PDF Generation**: jsPDF 2.5.1, html2canvas 1.4.1

---

## 2. API Configuration

### Base URL
```
Production: https://rental-backend-new.onrender.com/api
Local Development: http://localhost:5000/api (commented out)
```

### Authentication
All authenticated endpoints require Bearer token in Authorization header:
```
Authorization: Bearer <token>
```

Token is stored in `localStorage.getItem('token')` and automatically added to requests via Axios interceptor.

### Request Configuration
- **Content-Type**: `application/json`
- **Timeout**: 30 seconds (30000ms)
- **Error Handling**: 401 responses automatically clear auth and redirect to login

---

## 3. Authentication APIs

### 3.1 Unified Login (Auto-detects Admin/User)
**Endpoint:** `POST /auth/login`  
**Auth Required:** No

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Expected Response (200):**
```json
{
  "token": "jwt_token_string",
  "user": {
    "id": "user_id",
    "_id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "phone": "1234567890",
    "role": "user" | "admin",
    "homeAddress": "Address",
    "address": {
      "homeAddress": "Full Address",
      "nearLandmark": "Landmark",
      "pincode": "123456",
      "alternateNumber": "9876543210"
    }
  }
}
```

**Error Responses:**
- `401`: Invalid credentials
- `400`: Validation error

**Frontend Notes:**
- Backend should auto-detect role (admin/user) from credentials
- Frontend uses same endpoint for both admin and user login
- Token is stored in localStorage
- User object is stored in localStorage

---

### 3.2 User Signup
**Endpoint:** `POST /auth/signup`  
**Auth Required:** No

**Request:**
```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password123",
  "phone": "1234567890"
}
```

**Expected Response (200):**
```json
{
  "token": "jwt_token_string",
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "phone": "1234567890",
    "role": "user"
  },
  "message": "Account created successfully"
}
```

---

### 3.3 Forgot Password
**Endpoint:** `POST /auth/forgot-password`  
**Auth Required:** No

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Expected Response (200):**
```json
{
  "message": "Password reset link sent to your email"
}
```

**Error Handling:**
- Network errors return: "Network error. Please try again."
- API errors return: error.response.data.message or "Failed to send reset link. Please try again."

---

### 3.4 Reset Password
**Endpoint:** `POST /auth/reset-password`  
**Auth Required:** No

**Request:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "new_password123"
}
```

**Expected Response (200):**
```json
{
  "message": "Password reset successfully"
}
```

**Error Handling:**
- Invalid/expired token: "Invalid or expired reset link"
- Network errors: "Network error. Please try again."

---

## 4. Product Management APIs

### 4.1 Get All Products (Public)
**Endpoint:** `GET /acs`  
**Auth Required:** No

**Query Parameters:**
- `brand` (string): Filter by brand
- `capacity` (string): Filter by capacity (e.g., "1.5 Ton")
- `type` (string): Filter by type (Split, Window, Portable, etc.)
- `location` (string): Filter by location
- `minPrice` (number): Minimum price
- `maxPrice` (number): Maximum price
- `duration` (string): Filter by rental duration
- `category` (string): Filter by category (AC, Refrigerator, Washing Machine)
- `status` (string): Filter by status (Available, Rented Out)
- `search` (string): Search term

**Expected Response (200):**
```json
{
  "data": [
    {
      "_id": "product_id",
      "id": "product_id",
      "brand": "LG",
      "model": "Model X",
      "capacity": "1.5 Ton",
      "type": "Split",
      "category": "AC",
      "description": "Energy efficient AC",
      "location": "Mumbai",
      "status": "Available",
      "price": {
        "3": 3000,
        "6": 5500,
        "9": 8000,
        "11": 10000,
        "12": 11000,
        "24": 20000
      },
      "monthlyPrice": 1200,
      "monthlyTenure": 12,
      "securityDeposit": 5000,
      "installationCharges": {
        "amount": 2000,
        "included": false
      },
      "images": ["url1", "url2"],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 50
}
```

**Frontend Notes:**
- Price can be object (duration-based) or number (fixed price)
- Monthly payment option: `monthlyPrice` + `monthlyTenure` + `securityDeposit`
- Installation charges for AC products

---

### 4.2 Get Product by ID
**Endpoint:** `GET /acs/:id`  
**Auth Required:** No

**Expected Response (200):**
```json
{
  "data": {
    "_id": "product_id",
    "brand": "LG",
    "model": "Model X",
    // ... same structure as above
  }
}
```

---

### 4.3 Admin - Get All Products
**Endpoint:** `GET /admin/products`  
**Auth Required:** Yes (Admin)

**Expected Response (200):**
```json
{
  "data": [
    {
      "_id": "product_id",
      "brand": "LG",
      // ... product details
    }
  ]
}
```

---

### 4.4 Admin - Add Product
**Endpoint:** `POST /admin/products`  
**Auth Required:** Yes (Admin)

**Request:**
```json
{
  "brand": "LG",
  "model": "Model X",
  "capacity": "1.5 Ton",
  "type": "Split",
  "category": "AC",
  "description": "Description",
  "location": "Mumbai",
  "status": "Available",
  "price": {
    "3": 3000,
    "6": 5500,
    "9": 8000,
    "11": 10000,
    "12": 11000,
    "24": 20000
  },
  "monthlyPrice": 1200,
  "monthlyTenure": 12,
  "securityDeposit": 5000,
  "installationCharges": {
    "amount": 2000,
    "included": false
  },
  "images": ["url1", "url2"]
}
```

**Expected Response (200):**
```json
{
  "message": "Product added successfully",
  "data": {
    "_id": "product_id",
    // ... product details
  }
}
```

---

### 4.5 Admin - Update Product
**Endpoint:** `PATCH /admin/products/:id`  
**Auth Required:** Yes (Admin)

**Request:** (Partial update - only send fields to update)
```json
{
  "brand": "Updated Brand",
  "price": {
    "3": 3500
  },
  "images": ["new_url1", "new_url2"]
}
```

**Frontend Notes:**
- Frontend uploads images to Cloudinary first, then sends URLs to backend
- If `images` is undefined, backend should preserve existing images
- If `images` is empty array `[]`, backend should remove all images

---

### 4.6 Admin - Delete Product
**Endpoint:** `DELETE /admin/products/:id`  
**Auth Required:** Yes (Admin)

**Expected Response (200):**
```json
{
  "message": "Product deleted successfully"
}
```

---

## 5. Order Management APIs

### 5.1 Create Order
**Endpoint:** `POST /orders`  
**Auth Required:** Yes (User)

**Request:**
```json
{
  "items": [
    {
      "type": "rental",
      "productId": "product_id",
      "quantity": 1,
      "price": 3000,
      "installationCharges": 2000,
      "duration": 3,
      "isMonthlyPayment": false,
      "monthlyPrice": null,
      "monthlyTenure": null,
      "securityDeposit": null
    },
    {
      "type": "service",
      "serviceId": "service_id",
      "quantity": 1,
      "price": 500,
      "bookingDetails": {
        "name": "John Doe",
        "phone": "+911234567890",
        "preferredDate": "2024-02-15",
        "preferredTime": "10-12",
        "address": "Full Address",
        "addressType": "myself"
      }
    }
  ],
  "paymentOption": "payNow" | "payLater",
  "couponCode": "DISCOUNT10",
  "totalAmount": 5500,
  "discount": 500,
  "finalAmount": 5000,
  "shippingAddress": {
    "homeAddress": "Full Address",
    "nearLandmark": "Landmark",
    "pincode": "123456",
    "alternateNumber": "9876543210"
  }
}
```

**Expected Response (200):**
```json
{
  "message": "Order created successfully",
  "data": {
    "_id": "order_id",
    "orderNumber": "ORD-2024-001",
    "userId": "user_id",
    "items": [...],
    "status": "pending",
    "paymentStatus": "pending",
    "totalAmount": 5000,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Frontend Notes:**
- Email notifications should be non-blocking (async)
- API should respond in < 3 seconds
- Order creation succeeds even if email fails

---

### 5.2 Get User Orders
**Endpoint:** `GET /users/:userId/orders`  
**Auth Required:** Yes (User)

**Expected Response (200):**
```json
{
  "data": [
    {
      "_id": "order_id",
      "orderNumber": "ORD-2024-001",
      "items": [...],
      "status": "pending" | "confirmed" | "shipped" | "delivered" | "cancelled",
      "paymentStatus": "pending" | "paid" | "failed",
      "totalAmount": 5000,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 5.3 Get Order by ID
**Endpoint:** `GET /orders/:orderId`  
**Auth Required:** Yes (User or Admin)

**Expected Response (200):**
```json
{
  "data": {
    "_id": "order_id",
    "orderNumber": "ORD-2024-001",
    "userId": "user_id",
    "items": [...],
    "status": "pending",
    "paymentStatus": "pending",
    "totalAmount": 5000,
    "shippingAddress": {...},
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 5.4 Cancel Order
**Endpoint:** `PATCH /orders/:orderId/cancel`  
**Auth Required:** Yes (User)

**Request:**
```json
{
  "cancellationReason": "Changed my mind"
}
```

**Expected Response (200):**
```json
{
  "message": "Order cancelled successfully",
  "data": {
    "_id": "order_id",
    "status": "cancelled",
    "cancellationReason": "Changed my mind"
  }
}
```

---

### 5.5 Admin - Get All Orders
**Endpoint:** `GET /admin/orders`  
**Auth Required:** Yes (Admin)

**Query Parameters:**
- `status` (string): Filter by status
- `paymentStatus` (string): Filter by payment status
- `startDate` (string): Filter by start date
- `endDate` (string): Filter by end date

**Expected Response (200):**
```json
{
  "data": [
    {
      "_id": "order_id",
      "orderNumber": "ORD-2024-001",
      "userId": "user_id",
      "user": {
        "name": "User Name",
        "email": "user@example.com"
      },
      "items": [...],
      "status": "pending",
      "totalAmount": 5000,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 5.6 Admin - Update Order Status
**Endpoint:** `PATCH /admin/orders/:orderId/status`  
**Auth Required:** Yes (Admin)

**Request:**
```json
{
  "status": "confirmed" | "shipped" | "delivered" | "cancelled"
}
```

**Expected Response (200):**
```json
{
  "message": "Order status updated successfully",
  "data": {
    "_id": "order_id",
    "status": "confirmed"
  }
}
```

---

## 6. Service Management APIs

### 6.1 Get All Services (Public)
**Endpoint:** `GET /services`  
**Auth Required:** No

**Expected Response (200):**
```json
{
  "data": [
    {
      "_id": "service_id",
      "title": "AC Repair",
      "description": "Professional AC repair service",
      "price": 500,
      "duration": "2-3 hours",
      "category": "repair",
      "image": "url"
    }
  ]
}
```

---

### 6.2 Create Service Booking
**Endpoint:** `POST /service-bookings`  
**Auth Required:** Yes (User)

**Request:**
```json
{
  "serviceId": "service_id",
  "name": "John Doe",
  "phone": "+911234567890",
  "preferredDate": "2024-02-15",
  "preferredTime": "10-12",
  "address": "Full Address",
  "addressType": "myself" | "someoneElse",
  "contactName": "John Doe",
  "contactPhone": "+911234567890"
}
```

**Expected Response (200):**
```json
{
  "message": "Service booking submitted successfully",
  "data": {
    "_id": "booking_id",
    "serviceId": "service_id",
    "userId": "user_id",
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 6.3 Get User Service Bookings
**Endpoint:** `GET /service-bookings/my-bookings`  
**Auth Required:** Yes (User)

**Expected Response (200):**
```json
{
  "data": [
    {
      "_id": "booking_id",
      "serviceId": "service_id",
      "service": {
        "title": "AC Repair",
        "price": 500
      },
      "status": "pending",
      "preferredDate": "2024-02-15",
      "preferredTime": "10-12",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 6.4 Admin - Get All Service Bookings
**Endpoint:** `GET /admin/service-bookings`  
**Auth Required:** Yes (Admin)

**Expected Response (200):**
```json
{
  "data": [
    {
      "_id": "booking_id",
      "serviceId": "service_id",
      "userId": "user_id",
      "user": {
        "name": "User Name",
        "email": "user@example.com",
        "phone": "1234567890"
      },
      "status": "pending",
      "preferredDate": "2024-02-15",
      "preferredTime": "10-12",
      "address": "Full Address",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 6.5 Admin - Update Service Booking Status
**Endpoint:** `PATCH /admin/service-bookings/:leadId`  
**Auth Required:** Yes (Admin)

**Request:**
```json
{
  "status": "confirmed" | "completed" | "cancelled"
}
```

**Expected Response (200):**
```json
{
  "message": "Lead status updated",
  "data": {
    "_id": "booking_id",
    "status": "confirmed"
  }
}
```

---

### 6.6 Admin - Service CRUD
**Endpoints:**
- `POST /admin/services` - Create service
- `PATCH /admin/services/:id` - Update service
- `DELETE /admin/services/:id` - Delete service

**Request (Create/Update):**
```json
{
  "title": "AC Repair",
  "description": "Professional AC repair",
  "price": 500,
  "duration": "2-3 hours",
  "category": "repair",
  "image": "url"
}
```

---

## 7. Payment Integration (Razorpay)

### 7.1 Create Razorpay Order
**Endpoint:** `POST /payments/create-order`  
**Auth Required:** Yes (User)

**Request:**
```json
{
  "orderId": "order_id",
  "amount": 5000
}
```

**Expected Response (200):**
```json
{
  "message": "Razorpay order created successfully",
  "data": {
    "razorpayOrderId": "order_xxx",
    "amount": 5000,
    "currency": "INR",
    "key": "razorpay_key_id"
  }
}
```

**Frontend Notes:**
- Frontend uses Razorpay SDK to open payment gateway
- Payment ID is auto-generated by backend (don't send it)

---

### 7.2 Verify Payment
**Endpoint:** `POST /payments/verify`  
**Auth Required:** Yes (User)

**Request:**
```json
{
  "razorpayOrderId": "order_xxx",
  "razorpayPaymentId": "pay_xxx",
  "razorpaySignature": "signature_xxx",
  "orderId": "order_id"
}
```

**Expected Response (200):**
```json
{
  "message": "Payment verified successfully",
  "data": {
    "paymentId": "payment_id",
    "orderId": "order_id",
    "status": "success",
    "amount": 5000
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Payment verification failed",
  "error": "SIGNATURE_MISMATCH"
}
```

---

### 7.3 Process Payment
**Endpoint:** `POST /payments/process`  
**Auth Required:** Yes (User)

**Request:**
```json
{
  "orderId": "order_id",
  "amount": 5000,
  "paymentMethod": "razorpay",
  "paymentDetails": {
    "razorpayOrderId": "order_xxx",
    "razorpayPaymentId": "pay_xxx",
    "razorpaySignature": "signature_xxx"
  }
}
```

**Expected Response (200):**
```json
{
  "message": "Payment processed successfully",
  "data": {
    "paymentId": "payment_id",
    "orderId": "order_id",
    "status": "success"
  }
}
```

---

### 7.4 Get Payment Status
**Endpoint:** `GET /payments/:paymentId`  
**Auth Required:** Yes (User)

**Expected Response (200):**
```json
{
  "data": {
    "_id": "payment_id",
    "orderId": "order_id",
    "amount": 5000,
    "status": "success" | "pending" | "failed",
    "paymentMethod": "razorpay",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 8. Coupon Management APIs

### 8.1 Get Available Coupons
**Endpoint:** `GET /coupons/available`  
**Auth Required:** No (but can filter by userId)

**Query Parameters:**
- `userId` (string): Filter coupons available to user
- `category` (string): Filter by category
- `minAmount` (number): Minimum order amount

**Expected Response (200):**
```json
{
  "data": [
    {
      "_id": "coupon_id",
      "code": "DISCOUNT10",
      "title": "10% Off",
      "description": "Get 10% off on your order",
      "type": "percentage" | "fixed",
      "value": 10,
      "minAmount": 1000,
      "maxDiscount": 500,
      "validFrom": "2024-01-01T00:00:00.000Z",
      "validUntil": "2024-12-31T23:59:59.000Z",
      "category": "AC" | "Refrigerator" | "Washing Machine" | null,
      "isActive": true
    }
  ]
}
```

---

### 8.2 Validate Coupon
**Endpoint:** `POST /coupons/validate`  
**Auth Required:** Yes (User)

**Request:**
```json
{
  "code": "DISCOUNT10",
  "orderTotal": 5000,
  "items": [
    {
      "type": "rental",
      "category": "AC",
      "duration": 3
    }
  ]
}
```

**Expected Response (200):**
```json
{
  "data": {
    "_id": "coupon_id",
    "code": "DISCOUNT10",
    "type": "percentage",
    "value": 10,
    "discount": 500,
    "minAmount": 1000,
    "maxDiscount": 500
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Invalid coupon code",
  "error": "COUPON_VALIDATION_ERROR"
}
```

---

### 8.3 Admin - Coupon CRUD
**Endpoints:**
- `GET /admin/coupons` - Get all coupons
- `POST /admin/coupons` - Create coupon
- `PUT /admin/coupons/:couponId` - Update coupon
- `DELETE /admin/coupons/:couponId` - Delete coupon

**Request (Create/Update):**
```json
{
  "code": "DISCOUNT10",
  "title": "10% Off",
  "description": "Get 10% off",
  "type": "percentage",
  "value": 10,
  "minAmount": 1000,
  "maxDiscount": 500,
  "validFrom": "2024-01-01T00:00:00.000Z",
  "validUntil": "2024-12-31T23:59:59.000Z",
  "category": "AC",
  "isActive": true
}
```

---

## 9. Wishlist APIs

### 9.1 Get Wishlist
**Endpoint:** `GET /wishlist`  
**Auth Required:** Yes (User)

**Expected Response (200):**
```json
{
  "data": [
    {
      "_id": "wishlist_item_id",
      "productId": "product_id",
      "product": {
        "_id": "product_id",
        "brand": "LG",
        "model": "Model X",
        "price": {...},
        "images": [...]
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 9.2 Add to Wishlist
**Endpoint:** `POST /wishlist`  
**Auth Required:** Yes (User)

**Request:**
```json
{
  "productId": "product_id"
}
```

**Expected Response (200):**
```json
{
  "message": "Added to wishlist",
  "data": {
    "_id": "wishlist_item_id",
    "productId": "product_id"
  }
}
```

---

### 9.3 Remove from Wishlist
**Endpoint:** `DELETE /wishlist/:productId`  
**Auth Required:** Yes (User)

**Expected Response (200):**
```json
{
  "message": "Removed from wishlist"
}
```

---

### 9.4 Check Wishlist Status
**Endpoint:** `GET /wishlist/check/:productId`  
**Auth Required:** Yes (User)

**Expected Response (200):**
```json
{
  "isInWishlist": true | false
}
```

---

## 10. Ticket/Support System APIs

### 10.1 Create Ticket
**Endpoint:** `POST /tickets`  
**Auth Required:** Yes (User)

**Request:**
```json
{
  "subject": "AC not working",
  "description": "My AC stopped working yesterday",
  "priority": "high" | "medium" | "low",
  "category": "technical" | "billing" | "general"
}
```

**Expected Response (200):**
```json
{
  "message": "Ticket created successfully",
  "data": {
    "_id": "ticket_id",
    "ticketNumber": "TKT-2024-001",
    "userId": "user_id",
    "subject": "AC not working",
    "status": "open",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 10.2 Get User Tickets
**Endpoint:** `GET /tickets`  
**Auth Required:** Yes (User)

**Expected Response (200):**
```json
{
  "data": [
    {
      "_id": "ticket_id",
      "ticketNumber": "TKT-2024-001",
      "subject": "AC not working",
      "status": "open" | "in-progress" | "resolved" | "closed",
      "priority": "high",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 10.3 Get Ticket by ID
**Endpoint:** `GET /tickets/:ticketId`  
**Auth Required:** Yes (User)

**Expected Response (200):**
```json
{
  "data": {
    "_id": "ticket_id",
    "ticketNumber": "TKT-2024-001",
    "subject": "AC not working",
    "description": "Full description",
    "status": "open",
    "remarks": [
      {
        "remark": "We are looking into this",
        "addedBy": "admin_id",
        "addedAt": "2024-01-02T00:00:00.000Z"
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 10.4 Admin - Get All Tickets
**Endpoint:** `GET /admin/tickets`  
**Auth Required:** Yes (Admin)

**Query Parameters:**
- `status` (string): Filter by status
- `priority` (string): Filter by priority

**Expected Response (200):**
```json
{
  "data": [
    {
      "_id": "ticket_id",
      "ticketNumber": "TKT-2024-001",
      "userId": "user_id",
      "user": {
        "name": "User Name",
        "email": "user@example.com"
      },
      "subject": "AC not working",
      "status": "open",
      "priority": "high",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 10.5 Admin - Update Ticket Status
**Endpoint:** `PATCH /admin/tickets/:ticketId/status`  
**Auth Required:** Yes (Admin)

**Request:**
```json
{
  "status": "in-progress" | "resolved" | "closed"
}
```

**Expected Response (200):**
```json
{
  "message": "Ticket status updated successfully",
  "data": {
    "_id": "ticket_id",
    "status": "in-progress"
  }
}
```

---

### 10.6 Admin - Add Ticket Remark
**Endpoint:** `POST /admin/tickets/:ticketId/remarks`  
**Auth Required:** Yes (Admin)

**Request:**
```json
{
  "remark": "We are looking into this issue"
}
```

**Expected Response (200):**
```json
{
  "message": "Remark added successfully",
  "data": {
    "_id": "ticket_id",
    "remarks": [
      {
        "remark": "We are looking into this issue",
        "addedBy": "admin_id",
        "addedAt": "2024-01-02T00:00:00.000Z"
      }
    ]
  }
}
```

---

## 11. Lead Management APIs

### 11.1 Create Lead (Public)
**Endpoint:** `POST /leads`  
**Auth Required:** No

**Request:**
```json
{
  "name": "John Doe",
  "phone": "+911234567890",
  "interest": "rental" | "service",
  "source": "browse" | "contact"
}
```

**Expected Response (200):**
```json
{
  "message": "Thank you! We will contact you soon.",
  "data": {
    "_id": "lead_id",
    "name": "John Doe",
    "phone": "+911234567890",
    "status": "new",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 11.2 Admin - Get All Leads
**Endpoint:** `GET /admin/leads`  
**Auth Required:** Yes (Admin)

**Query Parameters:**
- `status` (string): Filter by status
- `source` (string): Filter by source
- `page` (number): Page number
- `limit` (number): Items per page

**Expected Response (200):**
```json
{
  "data": [
    {
      "_id": "lead_id",
      "name": "John Doe",
      "phone": "+911234567890",
      "interest": "rental",
      "source": "browse",
      "status": "new" | "contacted" | "converted" | "lost",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

---

### 11.3 Admin - Get Lead by ID
**Endpoint:** `GET /admin/leads/:leadId`  
**Auth Required:** Yes (Admin)

**Expected Response (200):**
```json
{
  "data": {
    "_id": "lead_id",
    "name": "John Doe",
    "phone": "+911234567890",
    "interest": "rental",
    "status": "new",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 11.4 Admin - Update Lead Status
**Endpoint:** `PATCH /admin/leads/:leadId`  
**Auth Required:** Yes (Admin)

**Request:**
```json
{
  "status": "contacted" | "converted" | "lost",
  "notes": "Customer interested in 1.5 Ton AC"
}
```

**Expected Response (200):**
```json
{
  "message": "Lead updated successfully",
  "data": {
    "_id": "lead_id",
    "status": "contacted"
  }
}
```

---

### 11.5 Admin - Delete Lead
**Endpoint:** `DELETE /admin/leads/:leadId`  
**Auth Required:** Yes (Admin)

**Expected Response (200):**
```json
{
  "message": "Lead deleted successfully"
}
```

---

### 11.6 Admin - Get Lead Statistics
**Endpoint:** `GET /admin/leads/stats`  
**Auth Required:** Yes (Admin)

**Expected Response (200):**
```json
{
  "data": {
    "total": 100,
    "new": 20,
    "contacted": 30,
    "converted": 40,
    "lost": 10
  }
}
```

---

## 12. FAQ Management APIs

### 12.1 Get FAQs (Public)
**Endpoint:** `GET /faqs`  
**Auth Required:** No

**Expected Response (200):**
```json
{
  "data": [
    {
      "_id": "faq_id",
      "question": "What is the rental period?",
      "answer": "You can rent for 3, 6, 9, 11, 12, or 24 months.",
      "category": "rental",
      "order": 1
    }
  ]
}
```

---

### 12.2 Admin - FAQ CRUD
**Endpoints:**
- `POST /admin/faqs` - Create FAQ
- `PATCH /admin/faqs/:id` - Update FAQ
- `DELETE /admin/faqs/:id` - Delete FAQ

**Request (Create/Update):**
```json
{
  "question": "What is the rental period?",
  "answer": "You can rent for 3, 6, 9, 11, 12, or 24 months.",
  "category": "rental",
  "order": 1
}
```

---

## 13. Contact & Vendor APIs

### 13.1 Submit Contact Form (Public)
**Endpoint:** `POST /contact`  
**Auth Required:** No

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+911234567890",
  "message": "I have a question about your services"
}
```

**Expected Response (200):**
```json
{
  "message": "Message sent successfully"
}
```

---

### 13.2 Submit Vendor Listing Request (Public)
**Endpoint:** `POST /vendor-listing-request`  
**Auth Required:** No

**Request:**
```json
{
  "name": "Vendor Name",
  "email": "vendor@example.com",
  "phone": "+911234567890",
  "message": "I want to list my products"
}
```

**Expected Response (200):**
```json
{
  "message": "Request submitted successfully. We will contact you soon."
}
```

---

### 13.3 Admin - Get Vendor Requests
**Endpoint:** `GET /admin/vendor-requests`  
**Auth Required:** Yes (Admin)

**Expected Response (200):**
```json
{
  "data": [
    {
      "_id": "request_id",
      "name": "Vendor Name",
      "email": "vendor@example.com",
      "phone": "+911234567890",
      "message": "I want to list my products",
      "status": "pending",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## 14. Rental Inquiry APIs

### 14.1 Create Rental Inquiry (Public)
**Endpoint:** `POST /acs/:acId/inquiry`  
**Auth Required:** No

**Request:**
```json
{
  "acId": "ac_id",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+911234567890",
  "message": "I'm interested in this AC",
  "preferredDuration": 3
}
```

**Expected Response (200):**
```json
{
  "message": "Rental inquiry submitted successfully",
  "data": {
    "_id": "inquiry_id",
    "acId": "ac_id",
    "name": "John Doe",
    "status": "new",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 14.2 Admin - Get Rental Inquiries
**Endpoint:** `GET /admin/rental-inquiries`  
**Auth Required:** Yes (Admin)

**Expected Response (200):**
```json
{
  "data": [
    {
      "_id": "inquiry_id",
      "acId": "ac_id",
      "ac": {
        "brand": "LG",
        "model": "Model X"
      },
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+911234567890",
      "status": "new" | "contacted" | "converted" | "lost",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 14.3 Admin - Update Inquiry Status
**Endpoint:** `PATCH /admin/rental-inquiries/:inquiryId`  
**Auth Required:** Yes (Admin)

**Request:**
```json
{
  "status": "contacted" | "converted" | "lost"
}
```

**Expected Response (200):**
```json
{
  "message": "Inquiry status updated",
  "data": {
    "_id": "inquiry_id",
    "status": "contacted"
  }
}
```

---

## 15. User Profile APIs

### 15.1 Update User Profile
**Endpoint:** `PATCH /users/profile`  
**Auth Required:** Yes (User)

**Request:**
```json
{
  "name": "Updated Name",
  "phone": "1234567890",
  "homeAddress": "Updated Address",
  "address": {
    "homeAddress": "Full Address",
    "nearLandmark": "Landmark",
    "pincode": "123456",
    "alternateNumber": "9876543210"
  }
}
```

**Expected Response (200):**
```json
{
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "_id": "user_id",
      "name": "Updated Name",
      "email": "user@example.com",
      "phone": "1234567890",
      "address": {...}
    }
  }
}
```

---

## 16. Frontend Expectations & Data Formats

### 16.1 Product Price Format
Products can have two price formats:

**Duration-based pricing:**
```json
{
  "price": {
    "3": 3000,
    "6": 5500,
    "9": 8000,
    "11": 10000,
    "12": 11000,
    "24": 20000
  }
}
```

**Fixed pricing:**
```json
{
  "price": 3000
}
```

**Monthly payment option:**
```json
{
  "monthlyPrice": 1200,
  "monthlyTenure": 12,
  "securityDeposit": 5000
}
```

---

### 16.2 Order Items Format
Order items can be rentals or services:

**Rental Item:**
```json
{
  "type": "rental",
  "productId": "product_id",
  "quantity": 1,
  "price": 3000,
  "installationCharges": 2000,
  "duration": 3,
  "isMonthlyPayment": false,
  "monthlyPrice": null,
  "monthlyTenure": null,
  "securityDeposit": null
}
```

**Service Item:**
```json
{
  "type": "service",
  "serviceId": "service_id",
  "quantity": 1,
  "price": 500,
  "bookingDetails": {
    "name": "John Doe",
    "phone": "+911234567890",
    "preferredDate": "2024-02-15",
    "preferredTime": "10-12",
    "address": "Full Address",
    "addressType": "myself"
  }
}
```

---

### 16.3 Phone Number Format
- Frontend formats phone numbers as: `+911234567890` (with country code)
- Backend should accept and store in this format
- Display format: `1234567890` (10 digits)

---

### 16.4 Image Upload
- Frontend uploads images to Cloudinary first
- Then sends image URLs (strings) to backend
- Backend should store image URLs as array: `["url1", "url2"]`

---

## 17. Error Handling Standards

### 17.1 Standard Error Response Format
```json
{
  "success": false,
  "message": "Error message here",
  "error": "ERROR_CODE"
}
```

### 17.2 HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request / Validation Error
- `401`: Unauthorized (Invalid/Missing token)
- `403`: Forbidden (Insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

### 17.3 Frontend Error Handling
- Network errors: "Network error. Please check your connection and try again."
- Timeout errors: "Request timeout. Please try again."
- 401 errors: Automatically clear auth and redirect to login
- All other errors: Display `error.response.data.message` or generic message

---

## 18. Testing Checklist

### 18.1 Authentication
- [ ] User signup with valid data
- [ ] User login (user role)
- [ ] Admin login (admin role)
- [ ] Forgot password flow
- [ ] Reset password with valid token
- [ ] Reset password with invalid/expired token
- [ ] Protected routes redirect to login when not authenticated
- [ ] Token expiration handling

### 18.2 Product Management
- [ ] Get all products with filters
- [ ] Get product by ID
- [ ] Admin: Add product
- [ ] Admin: Update product (partial update)
- [ ] Admin: Delete product
- [ ] Product images upload and display
- [ ] Price format handling (object vs number)

### 18.3 Order Management
- [ ] Create order with rental items
- [ ] Create order with service items
- [ ] Create order with both rental and service items
- [ ] Create order with coupon
- [ ] Create order with monthly payment option
- [ ] Get user orders
- [ ] Get order by ID
- [ ] Cancel order with reason
- [ ] Admin: Get all orders
- [ ] Admin: Update order status
- [ ] Invoice generation and download

### 18.4 Service Management
- [ ] Get all services
- [ ] Create service booking
- [ ] Get user service bookings
- [ ] Admin: Get all service bookings
- [ ] Admin: Update service booking status
- [ ] Admin: Service CRUD operations

### 18.5 Payment Integration
- [ ] Create Razorpay order
- [ ] Payment verification
- [ ] Payment processing
- [ ] Payment status check
- [ ] Payment failure handling

### 18.6 Coupon System
- [ ] Get available coupons
- [ ] Validate coupon code
- [ ] Apply coupon to order
- [ ] Coupon discount calculation (percentage)
- [ ] Coupon discount calculation (fixed amount)
- [ ] Admin: Coupon CRUD operations

### 18.7 Wishlist
- [ ] Add to wishlist
- [ ] Remove from wishlist
- [ ] Get wishlist
- [ ] Check wishlist status

### 18.8 Tickets
- [ ] Create ticket
- [ ] Get user tickets
- [ ] Get ticket by ID
- [ ] Admin: Get all tickets
- [ ] Admin: Update ticket status
- [ ] Admin: Add ticket remark

### 18.9 Leads
- [ ] Create lead (public)
- [ ] Admin: Get all leads
- [ ] Admin: Update lead status
- [ ] Admin: Delete lead
- [ ] Admin: Get lead statistics

### 18.10 FAQs
- [ ] Get FAQs (public)
- [ ] Admin: Create FAQ
- [ ] Admin: Update FAQ
- [ ] Admin: Delete FAQ

### 18.11 Contact & Vendor
- [ ] Submit contact form
- [ ] Submit vendor listing request
- [ ] Admin: Get vendor requests

### 18.12 Rental Inquiries
- [ ] Create rental inquiry
- [ ] Admin: Get rental inquiries
- [ ] Admin: Update inquiry status

### 18.13 User Profile
- [ ] Update user profile
- [ ] Update user address

---

## 19. Known Issues & Fixes

### 19.1 Order Creation Timeout
**Issue:** Order creation was timing out due to blocking email notifications.  
**Fix:** Email notifications should be non-blocking (async). API should respond in < 3 seconds.  
**Status:** ✅ Fixed (Backend should implement async email sending)

### 19.2 Phone Number Format
**Issue:** Phone numbers need consistent formatting.  
**Fix:** Frontend formats as `+911234567890`. Backend should accept and store in this format.  
**Status:** ✅ Implemented

### 19.3 Image Upload
**Issue:** Images need to be uploaded to Cloudinary before sending to backend.  
**Fix:** Frontend handles Cloudinary upload, sends URLs to backend.  
**Status:** ✅ Implemented

### 19.4 Product Price Format
**Issue:** Products can have duration-based or fixed pricing.  
**Fix:** Backend should handle both formats.  
**Status:** ✅ Documented

### 19.5 Monthly Payment Option
**Issue:** Monthly payment requires different price calculation.  
**Fix:** Frontend sends `monthlyPrice`, `monthlyTenure`, and `securityDeposit`.  
**Status:** ✅ Implemented

---

## 20. Deployment Notes

### 20.1 Environment Variables
Frontend doesn't require environment variables. API base URL is hardcoded:
```javascript
const API_BASE_URL = "https://rental-backend-new.onrender.com/api"
```

### 20.2 Build Process
```bash
npm install
npm run build
```

Build output is in `build/` directory.

### 20.3 CORS Configuration
Backend must allow CORS from frontend domain:
```
Access-Control-Allow-Origin: <frontend-domain>
Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### 20.4 Production Checklist
- [ ] API base URL is correct
- [ ] CORS is configured
- [ ] All endpoints are accessible
- [ ] Error handling is working
- [ ] Authentication is working
- [ ] Payment gateway is configured
- [ ] Email notifications are working
- [ ] Image upload is working

---

## 21. Additional Notes

### 21.1 Response Data Structure
Backend can return data in two formats:
1. `response.data.data` (nested)
2. `response.data` (direct)

Frontend handles both formats:
```javascript
data: response.data.data || response.data
```

### 21.2 Pagination
For paginated endpoints, include:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

### 21.3 Date Formats
- Use ISO 8601 format: `2024-01-01T00:00:00.000Z`
- Frontend displays dates in user's local timezone

### 21.4 Order Status Values
- `pending`: Order placed, awaiting confirmation
- `confirmed`: Order confirmed
- `shipped`: Order shipped
- `delivered`: Order delivered
- `cancelled`: Order cancelled

### 21.5 Payment Status Values
- `pending`: Payment not initiated
- `paid`: Payment successful
- `failed`: Payment failed

---

## 22. Contact & Support

For any questions or clarifications regarding frontend implementation:
- Review `src/services/api.js` for all API calls
- Check component files for data format expectations
- Refer to this document for endpoint specifications

---

**Document Version:** 1.0  
**Last Updated:** Pre-Handover  
**Status:** ✅ Ready for Backend Cross-Check

