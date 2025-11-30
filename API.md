# Rental Service API Documentation

**Base URL:** `http://localhost:5000/api`  
**Production URL:** `https://rental-backend-new.onrender.com/api` (if configured)

## Table of Contents
1. [Authentication](#authentication)
2. [Public Endpoints](#public-endpoints)
3. [User Endpoints](#user-endpoints)
4. [Admin Endpoints](#admin-endpoints)
5. [Data Models](#data-models)
6. [Error Handling](#error-handling)
7. [Testing Guide](#testing-guide)

---

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

### POST `/auth/login`
Unified login endpoint that auto-detects admin or user based on credentials.

**Request:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "jwt_token_string",
  "user": {
    "id": "user_id",
    "_id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "admin" | "user",
    "phone": "string"
  }
}
```

**Error Responses:**
- `401`: Invalid credentials
- `400`: Validation error

---

### POST `/auth/signup`
User registration endpoint.

**Request:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "phone": "string",
  "role": "user" (optional, defaults to "user")
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "jwt_token_string",
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "user"
  },
  "message": "Account created successfully"
}
```

---

### POST `/auth/forgot-password`
Request password reset link.

**Request:**
```json
{
  "email": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset link sent to your email"
}
```

---

## Public Endpoints

### AC Catalog

#### GET `/acs`
Get list of ACs/products with optional filters.

**Query Parameters:**
- `brand` (string): Filter by brand
- `capacity` (string): Filter by capacity (e.g., "1.5 Ton")
- `type` (string): Filter by type (Split, Window, Portable, etc.)
- `location` (string): Filter by location
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `duration` (string): Filter by rental duration
- `category` (string): Filter by category (AC, Refrigerator, Washing Machine)
- `status` (string): Filter by status (Available, Rented Out)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "ac_id",
      "id": "ac_id",
      "brand": "LG",
      "model": "Model X",
      "capacity": "1.5 Ton",
      "type": "Split",
      "description": "Energy efficient AC",
      "location": "Mumbai",
      "status": "Available",
      "price": {
        "3": 3000,
        "6": 5500,
        "9": 8000,
        "11": 10000
      },
      "images": ["url1", "url2"],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 50
}
```

---

#### GET `/acs/:id`
Get single AC/product details.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "ac_id",
    "brand": "LG",
    "model": "Model X",
    "capacity": "1.5 Ton",
    "type": "Split",
    "description": "Energy efficient AC",
    "location": "Mumbai",
    "status": "Available",
    "price": {
      "3": 3000,
      "6": 5500,
      "9": 8000,
      "11": 10000
    },
    "images": ["url1", "url2"],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `404`: AC not found

---

#### POST `/acs/:id/inquiry`
Submit rental inquiry for an AC.

**Request:**
```json
{
  "acId": "ac_id",
  "name": "Customer Name",
  "email": "customer@example.com",
  "phone": "+919999999999",
  "duration": "Monthly" | "Quarterly" | "Yearly",
  "message": "Optional message"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Rental inquiry submitted successfully",
  "data": {
    "_id": "inquiry_id",
    "acId": "ac_id",
    "name": "Customer Name",
    "email": "customer@example.com",
    "phone": "+919999999999",
    "duration": "Monthly",
    "message": "Optional message",
    "status": "New",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### Services

#### GET `/services`
Get list of available services.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "service_id",
      "id": "service_id",
      "title": "AC Installation",
      "description": "Professional AC installation service",
      "price": 999,
      "image": "url",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### POST `/service-bookings`
Create a service booking.

**Request:**
```json
{
  "serviceId": "service_id",
  "name": "Customer Name",
  "phone": "+919999999999",
  "preferredDate": "2024-12-31",
  "preferredTime": "10-12" | "12-2" | "2-4" | "4-6" | "6-8",
  "address": "Complete address",
  "notes": "Optional notes",
  "addressType": "myself" | "other",
  "contactName": "Contact Name",
  "contactPhone": "+919999999999"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Service booking submitted successfully",
  "data": {
    "_id": "booking_id",
    "serviceId": "service_id",
    "name": "Customer Name",
    "phone": "+919999999999",
    "preferredDate": "2024-12-31",
    "preferredTime": "10-12",
    "address": "Complete address",
    "status": "New",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### Lead Capture

#### POST `/leads`
Submit a lead capture form.

**Request:**
```json
{
  "name": "Lead Name",
  "phone": "+919999999999",
  "message": "Optional message"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Thank you! We will contact you soon.",
  "data": {
    "_id": "lead_id",
    "name": "Lead Name",
    "phone": "+919999999999",
    "message": "Optional message",
    "status": "New",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### Contact Form

#### POST `/contact`
Submit contact form.

**Request:**
```json
{
  "name": "Contact Name",
  "email": "contact@example.com",
  "phone": "+919999999999",
  "message": "Message content"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Message sent successfully"
}
```

---

### Vendor Listing Request

#### POST `/vendor-listing-request`
Submit vendor listing request.

**Request:**
```json
{
  "name": "Vendor Name",
  "phone": "+919999999999",
  "businessName": "Business Name (optional)",
  "message": "Optional message"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Request submitted successfully. We will contact you soon."
}
```

---

### FAQs

#### GET `/faqs`
Get list of FAQs.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "faq_id",
      "question": "What is the rental period?",
      "answer": "You can rent for 3, 6, 9, or 11 months.",
      "category": "rental" | "service" | "payment" | "general",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## User Endpoints

All user endpoints require authentication.

### Orders

#### GET `/users/:userId/orders`
Get user's orders.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "order_id",
      "orderId": "ORD-2024-001",
      "items": [
        {
          "type": "rental" | "service",
          "productId": "product_id",
          "serviceId": "service_id",
          "quantity": 1,
          "price": 3000,
          "duration": 3,
          "productDetails": {},
          "serviceDetails": {},
          "bookingDetails": {}
        }
      ],
      "total": 3000,
      "discount": 0,
      "finalTotal": 3000,
      "paymentOption": "payNow" | "payLater",
      "paymentStatus": "paid" | "pending",
      "status": "pending" | "processing" | "completed" | "cancelled",
      "customerInfo": {},
      "deliveryAddresses": [],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### GET `/orders/:orderId`
Get order details by ID.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "order_id",
    "orderId": "ORD-2024-001",
    "items": [],
    "total": 3000,
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### POST `/orders`
Create a new order.

**Request:**
```json
{
  "orderId": "ORD-2024-001",
  "items": [
    {
      "type": "rental",
      "productId": "product_id",
      "quantity": 1,
      "price": 3000,
      "duration": 3,
      "productDetails": {},
      "deliveryInfo": {}
    }
  ],
  "total": 3000,
  "discount": 0,
  "finalTotal": 3000,
  "paymentOption": "payNow",
  "paymentStatus": "paid",
  "customerInfo": {},
  "deliveryAddresses": []
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "_id": "order_id",
    "orderId": "ORD-2024-001",
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### Service Bookings

#### GET `/service-bookings/my-bookings`
Get user's service bookings.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "booking_id",
      "serviceId": "service_id",
      "name": "Customer Name",
      "phone": "+919999999999",
      "preferredDate": "2024-12-31",
      "preferredTime": "10-12",
      "address": "Complete address",
      "status": "New",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Wishlist

#### GET `/wishlist`
Get user's wishlist.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "wishlist_item_id",
      "productId": "product_id",
      "product": {
        "_id": "product_id",
        "brand": "LG",
        "model": "Model X"
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### POST `/wishlist`
Add product to wishlist.

**Request:**
```json
{
  "productId": "product_id"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Added to wishlist",
  "data": {
    "_id": "wishlist_item_id",
    "productId": "product_id"
  }
}
```

---

#### DELETE `/wishlist/:productId`
Remove product from wishlist.

**Response (200):**
```json
{
  "success": true,
  "message": "Removed from wishlist"
}
```

---

#### GET `/wishlist/check/:productId`
Check if product is in wishlist.

**Response (200):**
```json
{
  "success": true,
  "isInWishlist": true
}
```

---

### User Profile

#### PATCH `/users/profile`
Update user profile.

**Request:**
```json
{
  "name": "Updated Name",
  "phone": "+919999999999",
  "homeAddress": "Address",
  "pincode": "123456",
  "nearLandmark": "Landmark"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "user_id",
    "name": "Updated Name",
    "email": "user@example.com"
  }
}
```

---

### Tickets

#### POST `/tickets`
Create a support ticket.

**Request:**
```json
{
  "subject": "Ticket Subject",
  "description": "Ticket description",
  "category": "technical" | "billing" | "general",
  "priority": "low" | "medium" | "high"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Ticket created successfully",
  "data": {
    "_id": "ticket_id",
    "subject": "Ticket Subject",
    "description": "Ticket description",
    "status": "new",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### GET `/tickets`
Get user's tickets.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "ticket_id",
      "subject": "Ticket Subject",
      "description": "Ticket description",
      "status": "new" | "open" | "in-progress" | "resolved" | "closed",
      "category": "technical",
      "priority": "medium",
      "remarks": [],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### GET `/tickets/:ticketId`
Get ticket details.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "ticket_id",
    "subject": "Ticket Subject",
    "description": "Ticket description",
    "status": "new",
    "remarks": [
      {
        "remark": "Admin remark",
        "addedBy": "admin_id",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Admin Endpoints

All admin endpoints require admin authentication.

### AC/Product Management

#### GET `/admin/products`
Get all products (alias for `/admin/acs`).

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "product_id",
      "brand": "LG",
      "model": "Model X",
      "capacity": "1.5 Ton",
      "type": "Split",
      "status": "Available",
      "price": {
        "3": 3000,
        "6": 5500,
        "9": 8000,
        "11": 10000
      },
      "images": ["url1", "url2"]
    }
  ]
}
```

---

#### GET `/admin/acs`
Get all ACs/products.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "ac_id",
      "brand": "LG",
      "model": "Model X",
      "capacity": "1.5 Ton",
      "type": "Split",
      "description": "Energy efficient AC",
      "location": "Mumbai",
      "status": "Available",
      "price": {
        "3": 3000,
        "6": 5500,
        "9": 8000,
        "11": 10000
      },
      "images": ["url1", "url2"],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### POST `/admin/acs`
Create a new AC/product.

**Request:**
```json
{
  "brand": "LG",
  "model": "Model X",
  "capacity": "1.5 Ton",
  "type": "Split",
  "description": "Energy efficient AC",
  "location": "Mumbai",
  "status": "Available",
  "price": {
    "3": 3000,
    "6": 5500,
    "9": 8000,
    "11": 10000
  },
  "images": ["url1", "url2"]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "AC added successfully",
  "data": {
    "_id": "ac_id",
    "brand": "LG",
    "model": "Model X",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### POST `/admin/products`
Create a new product (alias for `/admin/acs`).

**Request:** Same as `/admin/acs`

**Response (200):** Same as `/admin/acs`

---

#### PATCH `/admin/acs/:id`
Update an AC/product.

**Request (all fields optional):**
```json
{
  "brand": "Updated Brand",
  "model": "Updated Model",
  "capacity": "2 Ton",
  "type": "Window",
  "description": "Updated description",
  "location": "Delhi",
  "status": "Rented Out",
  "price": {
    "3": 3500,
    "6": 6000,
    "9": 8500,
    "11": 11000
  },
  "images": ["new_url1", "new_url2"]
}
```

**Note:** If `images` is not provided, existing images are preserved. If provided, it replaces all images.

**Response (200):**
```json
{
  "success": true,
  "message": "AC updated successfully",
  "data": {
    "_id": "ac_id",
    "brand": "Updated Brand",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### PATCH `/admin/products/:id`
Update a product (alias for `/admin/acs/:id`).

**Request:** Same as `/admin/acs/:id`

**Response (200):** Same as `/admin/acs/:id`

---

#### DELETE `/admin/acs/:id`
Delete an AC/product.

**Response (200):**
```json
{
  "success": true,
  "message": "AC deleted successfully"
}
```

---

#### DELETE `/admin/products/:id`
Delete a product (alias for `/admin/acs/:id`).

**Response (200):** Same as `/admin/acs/:id`

---

### Service Management

#### POST `/admin/services`
Create a new service.

**Request:**
```json
{
  "title": "AC Installation",
  "description": "Professional AC installation service",
  "price": 999,
  "image": "url (optional)"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Service added successfully",
  "data": {
    "_id": "service_id",
    "title": "AC Installation",
    "price": 999,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### PATCH `/admin/services/:id`
Update a service.

**Request (all fields optional):**
```json
{
  "title": "Updated Service Title",
  "description": "Updated description",
  "price": 1299,
  "image": "new_url"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Service updated successfully",
  "data": {
    "_id": "service_id",
    "title": "Updated Service Title",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### DELETE `/admin/services/:id`
Delete a service.

**Response (200):**
```json
{
  "success": true,
  "message": "Service deleted successfully"
}
```

---

### Leads and Inquiries Management

#### GET `/admin/service-bookings`
Get all service bookings/leads.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "booking_id",
      "serviceId": "service_id",
      "name": "Customer Name",
      "phone": "+919999999999",
      "preferredDate": "2024-12-31",
      "preferredTime": "10-12",
      "address": "Complete address",
      "status": "New" | "Contacted" | "In-Progress" | "Resolved" | "Rejected",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### PATCH `/admin/service-bookings/:leadId`
Update service booking status.

**Request:**
```json
{
  "status": "New" | "Contacted" | "In-Progress" | "Resolved" | "Rejected"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Lead status updated",
  "data": {
    "_id": "booking_id",
    "status": "Contacted",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### GET `/admin/rental-inquiries`
Get all rental inquiries.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "inquiry_id",
      "acId": "ac_id",
      "name": "Customer Name",
      "email": "customer@example.com",
      "phone": "+919999999999",
      "duration": "Monthly",
      "message": "Optional message",
      "status": "New" | "Contacted" | "In-Progress" | "Resolved" | "Rejected",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### PATCH `/admin/rental-inquiries/:inquiryId`
Update rental inquiry status.

**Request:**
```json
{
  "status": "New" | "Contacted" | "In-Progress" | "Resolved" | "Rejected"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Inquiry status updated",
  "data": {
    "_id": "inquiry_id",
    "status": "Contacted",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### GET `/admin/vendor-requests`
Get all vendor listing requests.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "request_id",
      "name": "Vendor Name",
      "phone": "+919999999999",
      "businessName": "Business Name",
      "message": "Optional message",
      "status": "New",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Order Management

#### GET `/admin/orders`
Get all orders with optional filters.

**Query Parameters:**
- `status` (string): Filter by order status
- `paymentStatus` (string): Filter by payment status
- `userId` (string): Filter by user ID

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "order_id",
      "orderId": "ORD-2024-001",
      "items": [],
      "total": 3000,
      "status": "pending",
      "paymentStatus": "paid",
      "customerInfo": {},
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### PATCH `/admin/orders/:orderId/status`
Update order status.

**Request:**
```json
{
  "status": "pending" | "processing" | "completed" | "cancelled"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "_id": "order_id",
    "status": "processing",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### FAQ Management

#### POST `/admin/faqs`
Create a new FAQ.

**Request:**
```json
{
  "question": "What is the rental period?",
  "answer": "You can rent for 3, 6, 9, or 11 months.",
  "category": "rental" | "service" | "payment" | "general"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "FAQ created successfully",
  "data": {
    "_id": "faq_id",
    "question": "What is the rental period?",
    "answer": "You can rent for 3, 6, 9, or 11 months.",
    "category": "rental",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### PATCH `/admin/faqs/:id`
Update an FAQ.

**Request (all fields optional):**
```json
{
  "question": "Updated question?",
  "answer": "Updated answer",
  "category": "service"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "FAQ updated successfully",
  "data": {
    "_id": "faq_id",
    "question": "Updated question?",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### DELETE `/admin/faqs/:id`
Delete an FAQ.

**Response (200):**
```json
{
  "success": true,
  "message": "FAQ deleted successfully"
}
```

---

### Ticket Management

#### GET `/admin/tickets`
Get all tickets with optional filters.

**Query Parameters:**
- `status` (string): Filter by ticket status
- `category` (string): Filter by category
- `priority` (string): Filter by priority

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "ticket_id",
      "subject": "Ticket Subject",
      "description": "Ticket description",
      "status": "new" | "open" | "in-progress" | "resolved" | "closed",
      "category": "technical",
      "priority": "medium",
      "userId": "user_id",
      "remarks": [],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### PATCH `/admin/tickets/:ticketId/status`
Update ticket status.

**Request:**
```json
{
  "status": "new" | "open" | "in-progress" | "resolved" | "closed"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Ticket status updated successfully",
  "data": {
    "_id": "ticket_id",
    "status": "in-progress",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### POST `/admin/tickets/:ticketId/remarks`
Add a remark to a ticket.

**Request:**
```json
{
  "remark": "Admin remark text"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Remark added successfully",
  "data": {
    "_id": "ticket_id",
    "remarks": [
      {
        "remark": "Admin remark text",
        "addedBy": "admin_id",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

## Data Models

### AC/Product Model
```typescript
{
  _id: string;
  id: string;
  brand: string;
  model: string;
  capacity: string;
  type: string; // Split, Window, Portable, Central, Cassette, Ducted
  description: string;
  location: string;
  status: "Available" | "Rented Out" | "Maintenance";
  price: {
    3: number;  // 3 months price
    6: number;  // 6 months price
    9: number;  // 9 months price
    11: number; // 11 months price
  };
  images: string[];
  category?: "AC" | "Refrigerator" | "Washing Machine";
  createdAt: string;
  updatedAt: string;
}
```

### Service Model
```typescript
{
  _id: string;
  id: string;
  title: string;
  description: string;
  price: number;
  image?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Order Model
```typescript
{
  _id: string;
  orderId: string; // Format: ORD-YYYY-XXX
  items: Array<{
    type: "rental" | "service";
    productId?: string;
    serviceId?: string;
    quantity: number;
    price: number;
    duration?: number; // For rentals: 3, 6, 9, or 11
    productDetails?: object;
    serviceDetails?: object;
    bookingDetails?: object;
    deliveryInfo?: object;
  }>;
  total: number;
  discount: number;
  finalTotal: number;
  paymentOption: "payNow" | "payLater";
  paymentStatus: "paid" | "pending";
  status: "pending" | "processing" | "completed" | "cancelled";
  customerInfo: {
    userId: string;
    name: string;
    email: string;
    phone: string;
    address?: object;
  };
  deliveryAddresses?: Array<{
    type: "rental" | "service";
    address: string;
    contactName: string;
    contactPhone: string;
    preferredDate?: string;
    preferredTime?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}
```

### Service Booking Model
```typescript
{
  _id: string;
  serviceId: string;
  name: string;
  phone: string;
  preferredDate: string; // ISO date string
  preferredTime: "10-12" | "12-2" | "2-4" | "4-6" | "6-8";
  address: string;
  notes?: string;
  addressType?: "myself" | "other";
  contactName?: string;
  contactPhone?: string;
  status: "New" | "Contacted" | "In-Progress" | "Resolved" | "Rejected";
  createdAt: string;
  updatedAt: string;
}
```

### Rental Inquiry Model
```typescript
{
  _id: string;
  acId: string;
  name: string;
  email: string;
  phone: string;
  duration: "Monthly" | "Quarterly" | "Yearly";
  message?: string;
  status: "New" | "Contacted" | "In-Progress" | "Resolved" | "Rejected";
  createdAt: string;
  updatedAt: string;
}
```

### Ticket Model
```typescript
{
  _id: string;
  subject: string;
  description: string;
  status: "new" | "open" | "in-progress" | "resolved" | "closed";
  category: "technical" | "billing" | "general";
  priority: "low" | "medium" | "high";
  userId: string;
  remarks: Array<{
    remark: string;
    addedBy: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}
```

### FAQ Model
```typescript
{
  _id: string;
  question: string;
  answer: string;
  category: "general" | "rental" | "service" | "payment";
  createdAt: string;
  updatedAt: string;
}
```

---

## Error Handling

All endpoints follow a consistent error response format:

**Error Response (400/401/404/500):**
```json
{
  "success": false,
  "message": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `400`: Bad Request (validation error, missing fields)
- `401`: Unauthorized (invalid or missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error

---

## Testing Guide

### Environment Setup

1. **Base URL Configuration:**
   - Development: `http://localhost:5000/api`
   - Production: Set via `REACT_APP_API_URL` environment variable

2. **Authentication:**
   - Login to get a token
   - Include token in Authorization header for protected endpoints

### Test Scenarios

#### Authentication Flow
1. **User Signup**
   - POST `/auth/signup` with valid user data
   - Verify token and user data returned
   - Test with duplicate email (should fail)

2. **User Login**
   - POST `/auth/login` with valid credentials
   - Verify token returned
   - Test with invalid credentials (should fail)

3. **Forgot Password**
   - POST `/auth/forgot-password` with valid email
   - Verify success message

#### Public Catalog Flow
1. **Browse ACs**
   - GET `/acs` without filters
   - GET `/acs?brand=LG&type=Split` with filters
   - Verify response structure and data

2. **View AC Details**
   - GET `/acs/:id` with valid ID
   - GET `/acs/:id` with invalid ID (should return 404)

3. **Submit Rental Inquiry**
   - POST `/acs/:id/inquiry` with valid data
   - Verify inquiry created

#### Service Booking Flow
1. **Get Services**
   - GET `/services`
   - Verify services list returned

2. **Create Service Booking**
   - POST `/service-bookings` with valid data
   - Test with missing required fields (should fail)
   - Verify booking created

#### User Order Flow
1. **Create Order**
   - POST `/orders` with cart items
   - Include both rentals and services
   - Verify order created with correct totals

2. **Get User Orders**
   - GET `/users/:userId/orders`
   - Verify orders list returned

3. **Get Order Details**
   - GET `/orders/:orderId`
   - Verify complete order details

#### Wishlist Flow
1. **Add to Wishlist**
   - POST `/wishlist` with productId
   - Verify item added

2. **Check Wishlist Status**
   - GET `/wishlist/check/:productId`
   - Verify status returned

3. **Get Wishlist**
   - GET `/wishlist`
   - Verify all items returned

4. **Remove from Wishlist**
   - DELETE `/wishlist/:productId`
   - Verify item removed

#### Admin Product Management Flow
1. **Get All Products**
   - GET `/admin/acs` with admin token
   - Verify products list

2. **Create Product**
   - POST `/admin/acs` with product data
   - Include images array
   - Verify product created

3. **Update Product**
   - PATCH `/admin/acs/:id` with partial data
   - Test image update (preserve vs replace)
   - Verify product updated

4. **Delete Product**
   - DELETE `/admin/acs/:id`
   - Verify product deleted

#### Admin Lead Management Flow
1. **Get Service Bookings**
   - GET `/admin/service-bookings`
   - Verify bookings list

2. **Update Booking Status**
   - PATCH `/admin/service-bookings/:leadId` with status
   - Verify status updated

3. **Get Rental Inquiries**
   - GET `/admin/rental-inquiries`
   - Verify inquiries list

4. **Update Inquiry Status**
   - PATCH `/admin/rental-inquiries/:inquiryId` with status
   - Verify status updated

#### Admin Order Management Flow
1. **Get All Orders**
   - GET `/admin/orders`
   - Test with filters (status, paymentStatus)
   - Verify orders list

2. **Update Order Status**
   - PATCH `/admin/orders/:orderId/status`
   - Verify status updated

#### Ticket Management Flow
1. **Create Ticket (User)**
   - POST `/tickets` with ticket data
   - Verify ticket created

2. **Get User Tickets**
   - GET `/tickets`
   - Verify tickets list

3. **Get All Tickets (Admin)**
   - GET `/admin/tickets`
   - Test with filters
   - Verify tickets list

4. **Update Ticket Status (Admin)**
   - PATCH `/admin/tickets/:ticketId/status`
   - Verify status updated

5. **Add Ticket Remark (Admin)**
   - POST `/admin/tickets/:ticketId/remarks`
   - Verify remark added

#### FAQ Management Flow
1. **Get FAQs (Public)**
   - GET `/faqs`
   - Verify FAQs list

2. **Create FAQ (Admin)**
   - POST `/admin/faqs` with FAQ data
   - Verify FAQ created

3. **Update FAQ (Admin)**
   - PATCH `/admin/faqs/:id` with updated data
   - Verify FAQ updated

4. **Delete FAQ (Admin)**
   - DELETE `/admin/faqs/:id`
   - Verify FAQ deleted

### cURL Test Commands

Replace `<BASE>` with your API base URL and `<TOKEN>` with a valid JWT token.

```bash
# Authentication
curl -X POST <BASE>/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

curl -X POST <BASE>/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password","phone":"+919999999999"}'

# Public Catalog
curl "<BASE>/acs?brand=LG&type=Split"
curl "<BASE>/acs/123"
curl -X POST "<BASE>/acs/123/inquiry" \
  -H "Content-Type: application/json" \
  -d '{"acId":"123","name":"Test","email":"t@e.co","phone":"+919999999999","duration":"Monthly","message":"Need ASAP"}'

# Services
curl "<BASE>/services"
curl -X POST "<BASE>/service-bookings" \
  -H "Content-Type: application/json" \
  -d '{"serviceId":"svc1","name":"Test","phone":"+919999999999","preferredDate":"2024-12-31","preferredTime":"10-12","address":"Test Address"}'

# Lead & Contact
curl -X POST "<BASE>/leads" \
  -H "Content-Type: application/json" \
  -d '{"name":"Lead","phone":"+919999999999","message":"Call me"}'

curl -X POST "<BASE>/contact" \
  -H "Content-Type: application/json" \
  -d '{"name":"A","email":"a@b.co","phone":"+919999999999","message":"Hi"}'

# Admin - AC Management
curl -H "Authorization: Bearer <TOKEN>" "<BASE>/admin/acs"

curl -X POST -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  "<BASE>/admin/acs" \
  -d '{"brand":"LG","model":"X","capacity":"1.5 Ton","type":"Split","description":"Test","location":"Mumbai","status":"Available","price":{"3":1000,"6":2500,"9":4000,"11":5000},"images":[]}'

curl -X PATCH -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  "<BASE>/admin/acs/123" \
  -d '{"status":"Rented Out"}'

curl -X DELETE -H "Authorization: Bearer <TOKEN>" "<BASE>/admin/acs/123"

# Admin - Orders
curl -H "Authorization: Bearer <TOKEN>" "<BASE>/admin/orders"
curl -X PATCH -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  "<BASE>/admin/orders/123/status" \
  -d '{"status":"processing"}'

# User - Orders
curl -H "Authorization: Bearer <TOKEN>" "<BASE>/users/user123/orders"
curl -H "Authorization: Bearer <TOKEN>" "<BASE>/orders/order123"

# Wishlist
curl -H "Authorization: Bearer <TOKEN>" "<BASE>/wishlist"
curl -X POST -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  "<BASE>/wishlist" \
  -d '{"productId":"123"}'

curl -X DELETE -H "Authorization: Bearer <TOKEN>" "<BASE>/wishlist/123"

# Tickets
curl -X POST -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  "<BASE>/tickets" \
  -d '{"subject":"Test Ticket","description":"Test description","category":"technical","priority":"medium"}'

curl -H "Authorization: Bearer <TOKEN>" "<BASE>/admin/tickets"
curl -X PATCH -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  "<BASE>/admin/tickets/123/status" \
  -d '{"status":"in-progress"}'

# FAQs
curl "<BASE>/faqs"
curl -X POST -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  "<BASE>/admin/faqs" \
  -d '{"question":"Test?","answer":"Test answer","category":"general"}'
```

---

## Notes

1. **Image Handling:**
   - Images are stored as URLs (strings) in the `images` array
   - Frontend uploads images to Cloudinary before sending URLs to backend
   - When updating products, if `images` is not provided, existing images are preserved

2. **Price Structure:**
   - Rental prices are stored as objects with keys: `3`, `6`, `9`, `11` (months)
   - Service prices are simple numbers

3. **Order ID Format:**
   - Format: `ORD-YYYY-XXX` (e.g., `ORD-2024-001`)
   - Generated on frontend before sending to backend

4. **Payment Options:**
   - `payNow`: Immediate payment, includes 5% discount
   - `payLater`: Payment on delivery/service completion

5. **Status Values:**
   - **Product Status:** `Available`, `Rented Out`, `Maintenance`
   - **Order Status:** `pending`, `processing`, `completed`, `cancelled`
   - **Lead/Inquiry Status:** `New`, `Contacted`, `In-Progress`, `Resolved`, `Rejected`
   - **Ticket Status:** `new`, `open`, `in-progress`, `resolved`, `closed`

6. **Time Slots:**
   - Service booking time slots: `10-12`, `12-2`, `2-4`, `4-6`, `6-8`

---

**Last Updated:** 2024-12-19  
**Version:** 1.0.0
