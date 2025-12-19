# Frontend API Documentation - Backend Cross-Check

This document contains all API endpoints used by the frontend application. Please cross-check each endpoint with the backend implementation to ensure compatibility.

**Base URL:** `https://rental-backend-new.onrender.com/api`

**Authentication:** Most endpoints require Bearer token in Authorization header: `Authorization: Bearer <token>`

---

## Table of Contents

1. [Authentication APIs](#1-authentication-apis)
2. [Product Management APIs](#2-product-management-apis)
3. [Order Management APIs](#3-order-management-apis)
4. [Service Management APIs](#4-service-management-apis)
5. [Payment APIs (Razorpay)](#5-payment-apis-razorpay)
6. [Coupon Management APIs](#6-coupon-management-apis)
7. [Wishlist APIs](#7-wishlist-apis)
8. [Ticket/Support APIs](#8-ticketsupport-apis)
9. [Lead Management APIs](#9-lead-management-apis)
10. [FAQ Management APIs](#10-faq-management-apis)
11. [Contact & Vendor APIs](#11-contact--vendor-apis)
12. [Rental Inquiry APIs](#12-rental-inquiry-apis)

---

## 1. Authentication APIs

### 1.1 Login (Unified - Auto-detects Admin/User)
**Endpoint:** `POST /auth/login`  
**Auth Required:** No

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Expected Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "phone": "1234567890",
    "role": "user" | "admin" | "vendor",
    "homeAddress": "Address",
    "address": {
      "homeAddress": "Address",
      "nearLandmark": "Landmark",
      "pincode": "123456",
      "alternateNumber": "9876543210"
    }
  }
}
```

**Frontend Usage:** Used for both admin and user login. Backend should auto-detect role.

---

### 1.2 User Signup
**Endpoint:** `POST /auth/signup`  
**Auth Required:** No

**Request Body:**
```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password123",
  "phone": "1234567890"
}
```

**Expected Response:**
```json
{
  "token": "jwt_token_here",
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

### 1.3 Forgot Password
**Endpoint:** `POST /auth/forgot-password`  
**Auth Required:** No

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Expected Response:**
```json
{
  "message": "Password reset link sent to your email"
}
```

**Error Handling:**
- Network errors should return appropriate message
- Invalid email should return error message

---

### 1.4 Reset Password
**Endpoint:** `POST /auth/reset-password`  
**Auth Required:** No

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "newpassword123"
}
```

**Expected Response:**
```json
{
  "message": "Password reset successfully"
}
```

**Error Handling:**
- Invalid/expired token should return: `"Invalid or expired reset link"`
- Network errors should be handled gracefully

---

## 2. Product Management APIs

### 2.1 Get All Products (Public)
**Endpoint:** `GET /acs`  
**Auth Required:** No  
**Query Parameters:** Filters (optional)
- `category`: Filter by category (AC, Refrigerator, Washing Machine)
- `brand`: Filter by brand
- `location`: Filter by location
- `status`: Filter by status
- `minPrice`: Minimum price
- `maxPrice`: Maximum price

**Expected Response:**
```json
{
  "data": [
    {
      "_id": "product_id",
      "category": "AC" | "Refrigerator" | "Washing Machine",
      "name": "Product Name",
      "brand": "Brand Name",
      "model": "Model Number",
      "capacity": "1 Ton",
      "type": "Split" | "Window" | "Single Door" | "Double Door" | "Top Load" | "Front Load",
      "condition": "New" | "Refurbished",
      "description": "Product description",
      "location": "Mumbai, Maharashtra",
      "status": "Available" | "Rented Out" | "Under Maintenance",
      "price": {
        "3": 5000,
        "6": 9000,
        "9": 12000,
        "11": 14000,
        "12": 15000,
        "24": 28000
      },
      "discount": 5,
      "images": ["url1", "url2", "url3"],
      "features": {
        "specs": ["Spec 1", "Spec 2"],
        "dimensions": "950\"L x 290\"B x 375\"H",
        "safety": ["Safety feature 1"]
      },
      "energyRating": "3 Star", // For Refrigerator
      "operationType": "Automatic", // For Washing Machine
      "loadType": "Top Load", // For Washing Machine
      "installationCharges": { // Only for AC
        "amount": 2499,
        "includedItems": ["Cable (3m) + 3pin plug"],
        "extraMaterialRates": {
          "copperPipe": 900,
          "drainPipe": 100,
          "electricWire": 120
        }
      },
      "monthlyPaymentEnabled": true,
      "monthlyPrice": 2000,
      "securityDeposit": 5000,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 100
}
```

---

### 2.2 Get Product by ID (Public)
**Endpoint:** `GET /acs/:id`  
**Auth Required:** No

**Expected Response:**
```json
{
  "data": {
    // Same structure as Get All Products single item
  }
}
```

---

### 2.3 Add Product (Admin)
**Endpoint:** `POST /admin/products`  
**Auth Required:** Yes (Admin)

**Request Body:**
```json
{
  "category": "AC" | "Refrigerator" | "Washing Machine",
  "name": "Product Name",
  "brand": "Brand Name",
  "model": "Model Number",
  "capacity": "1 Ton",
  "type": "Split",
  "condition": "New" | "Refurbished",
  "description": "Product description",
  "location": "Mumbai, Maharashtra",
  "status": "Available",
  "discount": 5,
  "price": {
    "3": 5000,
    "6": 9000,
    "9": 12000,
    "11": 14000,
    "12": 15000,
    "24": 28000
  },
  "images": ["cloudinary_url1", "cloudinary_url2"],
  "features": {
    "specs": ["Spec 1", "Spec 2"],
    "dimensions": "950\"L x 290\"B x 375\"H",
    "safety": ["Safety feature 1"]
  },
  "energyRating": "3 Star", // Optional, for Refrigerator
  "operationType": "Automatic", // Optional, for Washing Machine
  "loadType": "Top Load", // Optional, for Washing Machine
  "installationCharges": { // Optional, only for AC
    "amount": 2499,
    "includedItems": ["Cable (3m) + 3pin plug"],
    "extraMaterialRates": {
      "copperPipe": 900,
      "drainPipe": 100,
      "electricWire": 120
    }
  },
  "monthlyPaymentEnabled": true, // Optional
  "monthlyPrice": 2000, // Required if monthlyPaymentEnabled is true
  "securityDeposit": 5000 // Required if monthlyPaymentEnabled is true
}
```

**Expected Response:**
```json
{
  "message": "Product added successfully",
  "data": {
    // Created product object
  }
}
```

---

### 2.4 Update Product (Admin)
**Endpoint:** `PATCH /admin/products/:id`  
**Auth Required:** Yes (Admin)

**Request Body:** (Partial update - only send fields to update)
```json
{
  "name": "Updated Name",
  "price": {
    "3": 5500,
    "6": 9500
  },
  "status": "Rented Out",
  "images": ["url1", "url2"] // Array of image URLs (strings)
}
```

**Note:** Frontend sends image URLs (strings), not File objects. Backend should handle partial updates.

**Expected Response:**
```json
{
  "message": "Product updated successfully",
  "data": {
    // Updated product object
  }
}
```

---

### 2.5 Delete Product (Admin)
**Endpoint:** `DELETE /admin/products/:id`  
**Auth Required:** Yes (Admin)

**Expected Response:**
```json
{
  "message": "Product deleted successfully"
}
```

---

### 2.6 Get Admin Products
**Endpoint:** `GET /admin/products`  
**Auth Required:** Yes (Admin)

**Expected Response:**
```json
{
  "data": [
    // Array of product objects (same structure as Get All Products)
  ]
}
```

---

## 3. Order Management APIs

### 3.1 Create Order
**Endpoint:** `POST /orders`  
**Auth Required:** Yes (User)

**Request Body:**
```json
{
  "orderId": "ORD-2024-001", // Generated on frontend
  "items": [
    {
      "type": "rental",
      "productId": "product_id",
      "quantity": 1,
      "price": 5000,
      "installationCharges": 2499, // For AC products
      "duration": 3, // Number: 3, 6, 9, 11, 12, or 24
      "isMonthlyPayment": false,
      "monthlyPrice": null,
      "monthlyTenure": null,
      "securityDeposit": null,
      "productDetails": {
        "brand": "Brand Name",
        "model": "Model Number",
        "capacity": "1 Ton",
        "productType": "AC",
        "location": "Mumbai",
        "description": "Description",
        "images": ["url1", "url2"],
        "installationCharges": {
          "amount": 2499,
          "includedItems": ["Item 1"],
          "extraMaterialRates": {}
        },
        "monthlyPaymentEnabled": false,
        "monthlyPrice": null
      },
      "deliveryInfo": {
        "address": "Full address",
        "nearLandmark": "Landmark",
        "pincode": "123456",
        "contactName": "User Name",
        "contactPhone": "1234567890",
        "alternatePhone": "9876543210"
      }
    },
    {
      "type": "service",
      "serviceId": "service_id",
      "quantity": 1,
      "price": 1500,
      "serviceDetails": {
        "title": "Service Title",
        "description": "Service description",
        "image": "image_url"
      },
      "bookingDetails": {
        "name": "User Name",
        "phone": "1234567890",
        "preferredDate": "2024-01-15",
        "preferredTime": "10-12",
        "address": "Service address",
        "addressType": "myself" | "other",
        "contactName": "Contact Name",
        "contactPhone": "1234567890"
      }
    }
  ],
  "total": 8999,
  "discount": 450,
  "couponCode": "SAVE10" | null,
  "couponDiscount": 450,
  "paymentDiscount": 0,
  "finalTotal": 8549,
  "paymentOption": "payNow" | "payLater",
  "paymentStatus": "pending",
  "customerInfo": {
    "userId": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "phone": "1234567890",
    "alternatePhone": "9876543210",
    "address": {
      "homeAddress": "Address",
      "nearLandmark": "Landmark",
      "pincode": "123456"
    }
  },
  "deliveryAddresses": [
    {
      "type": "rental",
      "address": "Full address",
      "nearLandmark": "Landmark",
      "pincode": "123456",
      "contactName": "User Name",
      "contactPhone": "1234567890",
      "alternatePhone": "9876543210"
    },
    {
      "type": "service",
      "address": "Service address",
      "contactName": "Contact Name",
      "contactPhone": "1234567890",
      "preferredDate": "2024-01-15",
      "preferredTime": "10-12",
      "addressType": "myself"
    }
  ],
  "orderDate": "2024-01-01T00:00:00.000Z",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "notes": "Order contains both rental products and services"
}
```

**Expected Response:**
```json
{
  "message": "Order created successfully",
  "data": {
    "orderId": "ORD-2024-001",
    // Complete order object
  }
}
```

**Important Notes:**
- Email notifications should be non-blocking (async)
- API should respond in < 3 seconds
- Order creation should succeed even if email fails

---

### 3.2 Get User Orders
**Endpoint:** `GET /users/:userId/orders`  
**Auth Required:** Yes (User)

**Expected Response:**
```json
{
  "data": [
    {
      "_id": "order_id",
      "orderId": "ORD-2024-001",
      "items": [/* array of order items */],
      "total": 8999,
      "discount": 450,
      "finalTotal": 8549,
      "paymentStatus": "pending" | "paid" | "failed",
      "orderStatus": "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 3.3 Get Order by ID
**Endpoint:** `GET /orders/:orderId`  
**Auth Required:** Yes (User/Admin)

**Expected Response:**
```json
{
  "data": {
    // Complete order object
  }
}
```

---

### 3.4 Get All Orders (Admin)
**Endpoint:** `GET /admin/orders`  
**Auth Required:** Yes (Admin)  
**Query Parameters:** Filters (optional)
- `status`: Filter by order status
- `paymentStatus`: Filter by payment status
- `userId`: Filter by user ID

**Expected Response:**
```json
{
  "data": [
    // Array of order objects
  ]
}
```

---

### 3.5 Update Order Status (Admin)
**Endpoint:** `PATCH /admin/orders/:orderId/status`  
**Auth Required:** Yes (Admin)

**Request Body:**
```json
{
  "status": "confirmed" | "processing" | "shipped" | "delivered" | "cancelled"
}
```

**Expected Response:**
```json
{
  "message": "Order status updated successfully",
  "data": {
    // Updated order object
  }
}
```

---

### 3.6 Cancel Order (User)
**Endpoint:** `PATCH /orders/:orderId/cancel`  
**Auth Required:** Yes (User)

**Request Body:**
```json
{
  "cancellationReason": "Reason for cancellation"
}
```

**Expected Response:**
```json
{
  "message": "Order cancelled successfully",
  "data": {
    // Updated order object
  }
}
```

---

## 4. Service Management APIs

### 4.1 Get All Services (Public)
**Endpoint:** `GET /services`  
**Auth Required:** No

**Expected Response:**
```json
{
  "data": [
    {
      "_id": "service_id",
      "title": "Service Title",
      "description": "Service description",
      "price": 1500,
      "originalPrice": 2000,
      "badge": "Popular",
      "image": "image_url",
      "process": ["Step 1", "Step 2"],
      "benefits": ["Benefit 1", "Benefit 2"],
      "keyFeatures": ["Feature 1", "Feature 2"],
      "recommendedFrequency": "Every 3 months"
    }
  ]
}
```

---

### 4.2 Create Service Booking (Public)
**Endpoint:** `POST /service-bookings`  
**Auth Required:** No (but user info included if logged in)

**Request Body:**
```json
{
  "serviceId": "service_id",
  "name": "User Name",
  "phone": "1234567890",
  "preferredDate": "2024-01-15",
  "preferredTime": "10-12" | "12-2" | "2-4" | "4-6" | "6-8",
  "address": "Service address",
  "addressType": "myself" | "other",
  "contactName": "Contact Name",
  "contactPhone": "1234567890",
  "userId": "user_id" // Optional, if user is logged in
}
```

**Expected Response:**
```json
{
  "message": "Service booking submitted successfully",
  "data": {
    // Created booking object
  }
}
```

---

### 4.3 Get User Service Bookings
**Endpoint:** `GET /service-bookings/my-bookings`  
**Auth Required:** Yes (User)

**Expected Response:**
```json
{
  "data": [
    // Array of service booking objects
  ]
}
```

---

### 4.4 Add Service (Admin)
**Endpoint:** `POST /admin/services`  
**Auth Required:** Yes (Admin)

**Request Body:**
```json
{
  "title": "Service Title",
  "description": "Service description",
  "price": 1500,
  "originalPrice": 2000,
  "badge": "Popular",
  "image": "image_url",
  "process": ["Step 1", "Step 2"], // Array of strings
  "benefits": ["Benefit 1", "Benefit 2"], // Array of strings
  "keyFeatures": ["Feature 1", "Feature 2"], // Array of strings
  "recommendedFrequency": "Every 3 months"
}
```

**Expected Response:**
```json
{
  "message": "Service added successfully",
  "data": {
    // Created service object
  }
}
```

---

### 4.5 Update Service (Admin)
**Endpoint:** `PATCH /admin/services/:id`  
**Auth Required:** Yes (Admin)

**Request Body:** (Partial update)
```json
{
  "title": "Updated Title",
  "price": 1600
}
```

**Expected Response:**
```json
{
  "message": "Service updated successfully",
  "data": {
    // Updated service object
  }
}
```

---

### 4.6 Delete Service (Admin)
**Endpoint:** `DELETE /admin/services/:id`  
**Auth Required:** Yes (Admin)

**Expected Response:**
```json
{
  "message": "Service deleted successfully"
}
```

---

### 4.7 Get Service Leads (Admin)
**Endpoint:** `GET /admin/service-bookings`  
**Auth Required:** Yes (Admin)

**Expected Response:**
```json
{
  "data": [
    // Array of service booking objects
  ]
}
```

---

### 4.8 Update Service Lead Status (Admin)
**Endpoint:** `PATCH /admin/service-bookings/:leadId`  
**Auth Required:** Yes (Admin)

**Request Body:**
```json
{
  "status": "pending" | "confirmed" | "completed" | "cancelled"
}
```

**Expected Response:**
```json
{
  "message": "Lead status updated",
  "data": {
    // Updated booking object
  }
}
```

---

## 5. Payment APIs (Razorpay)

### 5.1 Create Razorpay Order
**Endpoint:** `POST /payments/create-order`  
**Auth Required:** Yes (User)

**Request Body:**
```json
{
  "orderId": "ORD-2024-001",
  "amount": 8549.00
}
```

**Note:** Backend should auto-generate `paymentId`. Frontend does NOT send it.

**Expected Response:**
```json
{
  "message": "Razorpay order created successfully",
  "data": {
    "paymentId": "payment_id_auto_generated",
    "orderId": "ORD-2024-001",
    "razorpayOrderId": "order_razorpay_id",
    "amount": 8549.00,
    "currency": "INR",
    "key": "razorpay_key_id" // Optional, frontend can use env var
  }
}
```

---

### 5.2 Verify Payment
**Endpoint:** `POST /payments/verify`  
**Auth Required:** Yes (User)

**Request Body:**
```json
{
  "razorpay_order_id": "order_razorpay_id",
  "razorpay_payment_id": "payment_razorpay_id",
  "razorpay_signature": "signature_from_razorpay",
  "paymentId": "payment_id_from_create_order"
}
```

**Expected Response:**
```json
{
  "message": "Payment verified successfully",
  "data": {
    "paymentId": "payment_id",
    "orderId": "ORD-2024-001",
    "status": "paid",
    "razorpayPaymentId": "payment_razorpay_id"
  }
}
```

**Error Handling:**
- Signature mismatch should return error
- Invalid payment should return error

---

### 5.3 Process Payment (Alternative)
**Endpoint:** `POST /payments/process`  
**Auth Required:** Yes (User)

**Request Body:**
```json
{
  "orderId": "ORD-2024-001",
  "amount": 8549.00,
  "paymentMethod": "razorpay",
  "paymentDetails": {
    "razorpay_order_id": "order_id",
    "razorpay_payment_id": "payment_id",
    "razorpay_signature": "signature"
  }
}
```

**Expected Response:**
```json
{
  "message": "Payment processed successfully",
  "data": {
    // Payment object
  }
}
```

---

### 5.4 Get Payment Status
**Endpoint:** `GET /payments/:paymentId`  
**Auth Required:** Yes (User/Admin)

**Expected Response:**
```json
{
  "data": {
    "paymentId": "payment_id",
    "orderId": "ORD-2024-001",
    "status": "paid" | "pending" | "failed",
    "amount": 8549.00,
    "razorpayPaymentId": "payment_razorpay_id"
  }
}
```

---

## 6. Coupon Management APIs

### 6.1 Get Available Coupons (Public)
**Endpoint:** `GET /coupons/available`  
**Auth Required:** No  
**Query Parameters:**
- `userId`: User ID (optional)
- `category`: Product category (optional)
- `minAmount`: Minimum order amount (optional)

**Expected Response:**
```json
{
  "data": [
    {
      "_id": "coupon_id",
      "code": "SAVE10",
      "title": "Save 10%",
      "description": "Get 10% off on your order",
      "type": "percentage" | "fixed",
      "value": 10, // Percentage or fixed amount
      "minAmount": 5000,
      "category": "AC" | "Refrigerator" | "Washing Machine" | null,
      "validFrom": "2024-01-01T00:00:00.000Z",
      "validUntil": "2024-12-31T23:59:59.000Z",
      "maxUses": 100,
      "usedCount": 50,
      "isActive": true
    }
  ]
}
```

---

### 6.2 Validate Coupon
**Endpoint:** `POST /coupons/validate`  
**Auth Required:** No

**Request Body:**
```json
{
  "code": "SAVE10",
  "orderTotal": 10000,
  "items": [
    {
      "type": "rental",
      "category": "AC",
      "duration": 3
    }
  ]
}
```

**Expected Response:**
```json
{
  "data": {
    "_id": "coupon_id",
    "code": "SAVE10",
    "title": "Save 10%",
    "description": "Get 10% off on your order",
    "type": "percentage",
    "value": 10,
    "minAmount": 5000,
    "category": null,
    "validUntil": "2024-12-31T23:59:59.000Z"
  }
}
```

**Error Response:**
```json
{
  "message": "Invalid coupon code" | "Coupon expired" | "Minimum order amount not met",
  "error": "COUPON_VALIDATION_ERROR"
}
```

---

### 6.3 Get Admin Coupons
**Endpoint:** `GET /admin/coupons`  
**Auth Required:** Yes (Admin)

**Expected Response:**
```json
{
  "data": [
    // Array of coupon objects
  ]
}
```

---

### 6.4 Create Coupon (Admin)
**Endpoint:** `POST /admin/coupons`  
**Auth Required:** Yes (Admin)

**Request Body:**
```json
{
  "code": "SAVE10",
  "title": "Save 10%",
  "description": "Get 10% off on your order",
  "type": "percentage" | "fixed",
  "value": 10,
  "minAmount": 5000,
  "category": "AC" | null,
  "validFrom": "2024-01-01T00:00:00.000Z",
  "validUntil": "2024-12-31T23:59:59.000Z",
  "maxUses": 100,
  "isActive": true
}
```

**Expected Response:**
```json
{
  "message": "Coupon created successfully",
  "data": {
    // Created coupon object
  }
}
```

---

### 6.5 Update Coupon (Admin)
**Endpoint:** `PUT /admin/coupons/:couponId`  
**Auth Required:** Yes (Admin)

**Request Body:** (Full update)
```json
{
  "code": "SAVE10",
  "title": "Updated Title",
  "description": "Updated description",
  "type": "percentage",
  "value": 15,
  "minAmount": 6000,
  "isActive": true
}
```

**Expected Response:**
```json
{
  "message": "Coupon updated successfully",
  "data": {
    // Updated coupon object
  }
}
```

---

### 6.6 Delete Coupon (Admin)
**Endpoint:** `DELETE /admin/coupons/:couponId`  
**Auth Required:** Yes (Admin)

**Expected Response:**
```json
{
  "message": "Coupon deleted successfully"
}
```

---

## 7. Wishlist APIs

### 7.1 Get Wishlist
**Endpoint:** `GET /wishlist`  
**Auth Required:** Yes (User)

**Expected Response:**
```json
{
  "data": {
    "items": [
      {
        "productId": "product_id",
        "product": {
          // Full product object
        },
        "addedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

### 7.2 Add to Wishlist
**Endpoint:** `POST /wishlist`  
**Auth Required:** Yes (User)

**Request Body:**
```json
{
  "productId": "product_id"
}
```

**Expected Response:**
```json
{
  "message": "Added to wishlist",
  "data": {
    // Wishlist item object
  }
}
```

---

### 7.3 Remove from Wishlist
**Endpoint:** `DELETE /wishlist/:productId`  
**Auth Required:** Yes (User)

**Expected Response:**
```json
{
  "message": "Removed from wishlist"
}
```

---

### 7.4 Check Wishlist Status
**Endpoint:** `GET /wishlist/check/:productId`  
**Auth Required:** Yes (User)

**Expected Response:**
```json
{
  "isInWishlist": true | false
}
```

---

## 8. Ticket/Support APIs

### 8.1 Create Ticket (User)
**Endpoint:** `POST /tickets`  
**Auth Required:** Yes (User)

**Request Body:**
```json
{
  "subject": "Ticket Subject",
  "description": "Ticket description",
  "category": "technical" | "billing" | "general",
  "priority": "low" | "medium" | "high"
}
```

**Expected Response:**
```json
{
  "message": "Ticket created successfully",
  "data": {
    "_id": "ticket_id",
    "ticketNumber": "TKT-2024-001",
    "subject": "Ticket Subject",
    "description": "Ticket description",
    "category": "technical",
    "priority": "medium",
    "status": "open",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 8.2 Get User Tickets
**Endpoint:** `GET /tickets`  
**Auth Required:** Yes (User)

**Expected Response:**
```json
{
  "data": [
    // Array of ticket objects
  ]
}
```

---

### 8.3 Get Ticket by ID
**Endpoint:** `GET /tickets/:ticketId`  
**Auth Required:** Yes (User/Admin)

**Expected Response:**
```json
{
  "data": {
    "_id": "ticket_id",
    "ticketNumber": "TKT-2024-001",
    "subject": "Ticket Subject",
    "description": "Ticket description",
    "category": "technical",
    "priority": "medium",
    "status": "open" | "in_progress" | "resolved" | "closed",
    "remarks": [
      {
        "remark": "Admin remark",
        "addedBy": "admin_id",
        "addedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 8.4 Get All Tickets (Admin)
**Endpoint:** `GET /admin/tickets`  
**Auth Required:** Yes (Admin)  
**Query Parameters:** Filters (optional)
- `status`: Filter by status
- `category`: Filter by category
- `priority`: Filter by priority

**Expected Response:**
```json
{
  "data": [
    // Array of ticket objects
  ]
}
```

---

### 8.5 Update Ticket Status (Admin)
**Endpoint:** `PATCH /admin/tickets/:ticketId/status`  
**Auth Required:** Yes (Admin)

**Request Body:**
```json
{
  "status": "in_progress" | "resolved" | "closed"
}
```

**Expected Response:**
```json
{
  "message": "Ticket status updated successfully",
  "data": {
    // Updated ticket object
  }
}
```

---

### 8.6 Add Ticket Remark (Admin)
**Endpoint:** `POST /admin/tickets/:ticketId/remarks`  
**Auth Required:** Yes (Admin)

**Request Body:**
```json
{
  "remark": "Admin remark text"
}
```

**Expected Response:**
```json
{
  "message": "Remark added successfully",
  "data": {
    // Updated ticket object with new remark
  }
}
```

---

## 9. Lead Management APIs

### 9.1 Create Lead (Public)
**Endpoint:** `POST /leads`  
**Auth Required:** No

**Request Body:**
```json
{
  "name": "Lead Name",
  "phone": "1234567890",
  "email": "lead@example.com",
  "message": "Lead message",
  "source": "website" | "callback" | "contact_form"
}
```

**Expected Response:**
```json
{
  "message": "Thank you! We will contact you soon.",
  "data": {
    // Created lead object
  }
}
```

---

### 9.2 Get Callback Leads (Admin)
**Endpoint:** `GET /admin/leads`  
**Auth Required:** Yes (Admin)  
**Query Parameters:** Filters (optional)
- `status`: Filter by status
- `source`: Filter by source

**Expected Response:**
```json
{
  "data": [
    {
      "_id": "lead_id",
      "name": "Lead Name",
      "phone": "1234567890",
      "email": "lead@example.com",
      "message": "Lead message",
      "source": "callback",
      "status": "new" | "contacted" | "converted" | "closed",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

---

### 9.3 Get Callback Lead by ID (Admin)
**Endpoint:** `GET /admin/leads/:leadId`  
**Auth Required:** Yes (Admin)

**Expected Response:**
```json
{
  "data": {
    // Lead object
  }
}
```

---

### 9.4 Update Callback Lead Status (Admin)
**Endpoint:** `PATCH /admin/leads/:leadId`  
**Auth Required:** Yes (Admin)

**Request Body:**
```json
{
  "status": "contacted" | "converted" | "closed",
  "notes": "Admin notes" // Optional
}
```

**Expected Response:**
```json
{
  "message": "Lead updated successfully",
  "data": {
    // Updated lead object
  }
}
```

---

### 9.5 Delete Callback Lead (Admin)
**Endpoint:** `DELETE /admin/leads/:leadId`  
**Auth Required:** Yes (Admin)

**Expected Response:**
```json
{
  "message": "Lead deleted successfully"
}
```

---

### 9.6 Get Callback Lead Stats (Admin)
**Endpoint:** `GET /admin/leads/stats`  
**Auth Required:** Yes (Admin)

**Expected Response:**
```json
{
  "data": {
    "total": 100,
    "new": 20,
    "contacted": 30,
    "converted": 40,
    "closed": 10
  }
}
```

---

## 10. FAQ Management APIs

### 10.1 Get FAQs (Public)
**Endpoint:** `GET /faqs`  
**Auth Required:** No

**Expected Response:**
```json
{
  "data": [
    {
      "_id": "faq_id",
      "question": "FAQ Question",
      "answer": "FAQ Answer",
      "category": "general" | "billing" | "technical",
      "order": 1,
      "isActive": true
    }
  ]
}
```

---

### 10.2 Create FAQ (Admin)
**Endpoint:** `POST /admin/faqs`  
**Auth Required:** Yes (Admin)

**Request Body:**
```json
{
  "question": "FAQ Question",
  "answer": "FAQ Answer",
  "category": "general",
  "order": 1,
  "isActive": true
}
```

**Expected Response:**
```json
{
  "message": "FAQ created successfully",
  "data": {
    // Created FAQ object
  }
}
```

---

### 10.3 Update FAQ (Admin)
**Endpoint:** `PATCH /admin/faqs/:id`  
**Auth Required:** Yes (Admin)

**Request Body:** (Partial update)
```json
{
  "question": "Updated Question",
  "answer": "Updated Answer"
}
```

**Expected Response:**
```json
{
  "message": "FAQ updated successfully",
  "data": {
    // Updated FAQ object
  }
}
```

---

### 10.4 Delete FAQ (Admin)
**Endpoint:** `DELETE /admin/faqs/:id`  
**Auth Required:** Yes (Admin)

**Expected Response:**
```json
{
  "message": "FAQ deleted successfully"
}
```

---

## 11. Contact & Vendor APIs

### 11.1 Submit Contact Form (Public)
**Endpoint:** `POST /contact`  
**Auth Required:** No

**Request Body:**
```json
{
  "name": "Contact Name",
  "email": "contact@example.com",
  "phone": "1234567890",
  "subject": "Contact Subject",
  "message": "Contact message"
}
```

**Expected Response:**
```json
{
  "message": "Message sent successfully"
}
```

---

### 11.2 Submit Vendor Listing Request (Public)
**Endpoint:** `POST /vendor-listing-request`  
**Auth Required:** No

**Request Body:**
```json
{
  "name": "Vendor Name",
  "email": "vendor@example.com",
  "phone": "1234567890",
  "businessName": "Business Name",
  "address": "Business Address",
  "message": "Vendor message"
}
```

**Expected Response:**
```json
{
  "message": "Request submitted successfully. We will contact you soon."
}
```

---

### 11.3 Get Vendor Requests (Admin)
**Endpoint:** `GET /admin/vendor-requests`  
**Auth Required:** Yes (Admin)

**Expected Response:**
```json
{
  "data": [
    {
      "_id": "request_id",
      "name": "Vendor Name",
      "email": "vendor@example.com",
      "phone": "1234567890",
      "businessName": "Business Name",
      "address": "Business Address",
      "message": "Vendor message",
      "status": "pending" | "approved" | "rejected",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## 12. Rental Inquiry APIs

### 12.1 Create Rental Inquiry (Public)
**Endpoint:** `POST /acs/:acId/inquiry`  
**Auth Required:** No

**Request Body:**
```json
{
  "acId": "product_id", // Explicitly included
  "name": "Inquirer Name",
  "phone": "1234567890",
  "email": "inquirer@example.com",
  "message": "Inquiry message",
  "preferredDuration": 3, // Optional
  "address": "Delivery address" // Optional
}
```

**Expected Response:**
```json
{
  "message": "Rental inquiry submitted successfully",
  "data": {
    // Created inquiry object
  }
}
```

---

### 12.2 Get Rental Inquiries (Admin)
**Endpoint:** `GET /admin/rental-inquiries`  
**Auth Required:** Yes (Admin)

**Expected Response:**
```json
{
  "data": [
    {
      "_id": "inquiry_id",
      "acId": "product_id",
      "product": {
        // Product object
      },
      "name": "Inquirer Name",
      "phone": "1234567890",
      "email": "inquirer@example.com",
      "message": "Inquiry message",
      "status": "new" | "contacted" | "converted" | "closed",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 12.3 Update Inquiry Status (Admin)
**Endpoint:** `PATCH /admin/rental-inquiries/:inquiryId`  
**Auth Required:** Yes (Admin)

**Request Body:**
```json
{
  "status": "contacted" | "converted" | "closed"
}
```

**Expected Response:**
```json
{
  "message": "Inquiry status updated",
  "data": {
    // Updated inquiry object
  }
}
```

---

## 13. User Profile APIs

### 13.1 Update User Profile
**Endpoint:** `PATCH /users/profile`  
**Auth Required:** Yes (User)

**Request Body:**
```json
{
  "name": "Updated Name",
  "phone": "1234567890",
  "homeAddress": "Updated Address",
  "address": {
    "homeAddress": "Updated Address",
    "nearLandmark": "Updated Landmark",
    "pincode": "123456",
    "alternateNumber": "9876543210"
  }
}
```

**Expected Response:**
```json
{
  "message": "Profile updated successfully",
  "data": {
    // Updated user object
  }
}
```

---

## Important Notes for Backend Team

### 1. Authentication
- All protected endpoints require `Authorization: Bearer <token>` header
- Token is stored in `localStorage.getItem('token')`
- On 401 response, frontend clears token and redirects to login

### 2. Error Handling
- All APIs should return consistent error format:
```json
{
  "message": "Error message here",
  "error": "ERROR_CODE" // Optional
}
```

### 3. Image Handling
- Frontend uploads images to Cloudinary before sending to backend
- Backend receives image URLs (strings), not File objects
- Product images: First image is "hero image", rest are additional images

### 4. Order Creation
- Frontend generates `orderId` in format: `ORD-YYYY-XXX`
- Email notifications should be async/non-blocking
- API should respond in < 3 seconds
- Order should be created even if email fails

### 5. Payment Flow
- Frontend creates order first
- Then creates Razorpay order
- Then verifies payment signature
- Backend should auto-generate `paymentId` in create-order endpoint

### 6. Coupon Validation
- Frontend sends order items with type, category, and duration
- Backend should validate:
  - Coupon code exists and is active
  - Minimum order amount met
  - Category restrictions (if any)
  - Validity dates
  - Usage limits

### 7. Product Data Structure
- Products support multiple categories: AC, Refrigerator, Washing Machine
- AC products have `installationCharges` field
- Products can have `monthlyPaymentEnabled` option
- Price structure: Object with keys 3, 6, 9, 11, 12, 24 (months)

### 8. Service Bookings
- Service bookings are separate from orders
- Can be created by logged-in users or guests
- Include booking details: date, time, address, contact info

### 9. Response Format
- All successful responses should include `data` field
- Error responses should include `message` field
- Pagination responses should include `pagination` object

### 10. Date Formats
- All dates should be in ISO 8601 format: `2024-01-01T00:00:00.000Z`
- Frontend sends dates as ISO strings

---

## Testing Checklist

Please verify the following:

- [ ] All authentication endpoints work correctly
- [ ] Product CRUD operations work for all categories (AC, Refrigerator, Washing Machine)
- [ ] Order creation handles both rental and service items
- [ ] Payment flow (Razorpay) works end-to-end
- [ ] Coupon validation works correctly
- [ ] Wishlist operations work for authenticated users
- [ ] Ticket system works for users and admins
- [ ] Lead management works correctly
- [ ] FAQ management works correctly
- [ ] All error responses are consistent
- [ ] Image URLs are handled correctly
- [ ] Email notifications are non-blocking
- [ ] All date formats are ISO 8601
- [ ] Pagination works where applicable
- [ ] Filtering works on list endpoints

---

**Document Version:** 1.0  
**Last Updated:** 2024-01-01  
**Frontend Base URL:** Configured in `src/services/api.js`  
**Backend Base URL:** `https://rental-backend-new.onrender.com/api`

