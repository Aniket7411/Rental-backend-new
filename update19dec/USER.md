# User Flow Documentation

This document outlines all user flows in the Rental Service application. Use this as a reference for implementing the backend API endpoints.

## Table of Contents

1. [Authentication Flows](#authentication-flows)
2. [Product/Rental Flows](#productrental-flows)
3. [Service Booking Flows](#service-booking-flows)
4. [Cart & Checkout Flows](#cart--checkout-flows)
5. [Order Management Flows](#order-management-flows)
6. [User Profile & Dashboard Flows](#user-profile--dashboard-flows)
7. [Wishlist Flows](#wishlist-flows)
8. [Support & Tickets Flows](#support--tickets-flows)

---

## Authentication Flows

### 1. User Registration (Signup)

**Flow:**
1. User navigates to `/signup`
2. User fills form with:
   - Name (required)
   - Email (required, must be unique)
   - Phone (required, minimum 10 digits)
   - Password (required, minimum 6 characters)
   - Confirm Password (required, must match)
3. Form validation occurs client-side
4. On submit: `POST /api/auth/signup`
5. On success:
   - User is automatically logged in
   - Token and user data stored in localStorage
   - Redirect to `/user/dashboard` after 1.5 seconds

**API Endpoint:** `POST /api/auth/signup`

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "1234567890",
  "role": "user"
}
```

**Expected Response:**
```json
{
  "success": true,
  "token": "jwt_token_string",
  "user": {
    "_id": "user_id",
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "role": "user"
  },
  "message": "Account created successfully"
}
```

**Backend Requirements:**
- Validate email uniqueness
- Hash password before storing
- Generate JWT token
- Return user object (without password)
- Set default role as "user"

---

### 2. User Login

**Flow:**
1. User navigates to `/login`
2. User enters:
   - Email
   - Password
3. On submit: `POST /api/auth/login`
4. Backend auto-detects role (admin/user) based on credentials
5. On success:
   - Token and user data stored in localStorage
   - Redirect to `/` (home page)

**API Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "token": "jwt_token_string",
  "user": {
    "_id": "user_id",
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "role": "user",
    "homeAddress": "123 Main St",
    "address": {
      "homeAddress": "123 Main St",
      "nearLandmark": "Near Park",
      "alternateNumber": "9876543210",
      "pincode": "123456"
    }
  }
}
```

**Backend Requirements:**
- Validate credentials
- Return complete user object including address fields
- Support both nested (`address.homeAddress`) and top-level (`homeAddress`) address formats
- Generate JWT token with user role

---

### 3. Forgot Password

**Flow:**
1. User navigates to `/forgot-password`
2. User enters email
3. On submit: `POST /api/auth/forgot-password`
4. Success message shown

**API Endpoint:** `POST /api/auth/forgot-password`

**Request:**
```json
{
  "email": "john@example.com"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Password reset link sent to your email"
}
```

**Backend Requirements:**
- Validate email exists
- Generate reset token
- Send email with reset link (if email service configured)
- Return success message regardless of email existence (security best practice)

---

## Product/Rental Flows

### 4. Browse ACs/Products

**Flow:**
1. User navigates to `/browse` or `/`
2. Page loads all available ACs: `GET /api/acs`
3. User can filter by:
   - Brand
   - Capacity (e.g., "1.5 Ton")
   - Type (Split, Window, Portable, etc.)
   - Location
   - Price range (minPrice, maxPrice)
   - Status (Available, Rented Out)
   - Duration (3, 6, 9, 11 months)
4. Filters trigger new API call with query parameters

**API Endpoint:** `GET /api/acs`

**Query Parameters:**
- `brand` (string, optional)
- `capacity` (string, optional)
- `type` (string, optional)
- `location` (string, optional)
- `minPrice` (number, optional)
- `maxPrice` (number, optional)
- `status` (string, optional: "Available" | "Rented Out")
- `duration` (string, optional)
- `category` (string, optional)

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "product_id",
      "id": "product_id",
      "brand": "LG",
      "model": "Model X",
      "capacity": "1.5 Ton",
      "type": "Split",
      "productType": "Split",
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

**Backend Requirements:**
- Support all filter parameters
- Return price object with duration keys (3, 6, 9, 11)
- Include image URLs
- Return total count

---

### 5. View AC/Product Details

**Flow:**
1. User clicks on product card → navigates to `/ac/:id`
2. Page loads product details: `GET /api/acs/:id`
3. User can:
   - View all product information
   - See pricing for different durations
   - Add to cart
   - Add to wishlist (if logged in)
   - Submit rental inquiry

**API Endpoint:** `GET /api/acs/:id`

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "_id": "product_id",
    "id": "product_id",
    "brand": "LG",
    "model": "Model X",
    "capacity": "1.5 Ton",
    "type": "Split",
    "productType": "Split",
    "description": "Energy efficient AC with advanced cooling",
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

**Backend Requirements:**
- Return full product details
- Return 404 if product not found
- Include all images

---

### 6. Submit Rental Inquiry

**Flow:**
1. User views product details
2. User clicks "Inquire" or fills inquiry form
3. Submit: `POST /api/acs/:id/inquiry`
4. Success message shown

**API Endpoint:** `POST /api/acs/:id/inquiry`

**Request:**
```json
{
  "acId": "product_id",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+919999999999",
  "duration": "Monthly",
  "message": "Optional message"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Rental inquiry submitted successfully",
  "data": {
    "_id": "inquiry_id",
    "acId": "product_id",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+919999999999",
    "duration": "Monthly",
    "message": "Optional message",
    "status": "New",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Backend Requirements:**
- Create inquiry record
- Link to product
- Set status as "New"
- Store all inquiry details

---

## Service Booking Flows

### 7. Browse Services

**Flow:**
1. User navigates to `/service-request`
2. Page loads all services: `GET /api/services`
3. User can:
   - View service cards
   - View service details
   - Add service to cart

**API Endpoint:** `GET /api/services`

**Expected Response:**
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

**Backend Requirements:**
- Return all active services
- Include pricing information
- Include service images

---

### 8. Book Service (Add to Cart with Booking Details)

**Flow:**
1. User clicks "Add Service" on service card
2. ServiceBookingModal opens with multi-step form:
   - Step 1: Select date and time slot
   - Step 2: Select address type (Myself/Other)
   - Step 3: Enter address details
   - Step 4: Enter contact information
   - Step 5: Select payment option
3. User fills all required fields
4. On submit:
   - Service added to cart with all booking details
   - Modal closes
   - Success message shown

**Note:** Service is NOT created in backend at this stage. It's stored in cart (localStorage) and only created when order is placed.

**Data Structure in Cart:**
```json
{
  "id": "service_id",
  "type": "service",
  "title": "AC Installation",
  "price": 999,
  "bookingDetails": {
    "date": "2024-12-31",
    "time": "10-12",
    "addressType": "myself" | "other",
    "address": "Complete address",
    "nearLandmark": "Near Park",
    "pincode": "123456",
    "alternateNumber": "9876543210",
    "contactName": "John Doe",
    "contactPhone": "+919999999999",
    "paymentOption": "payNow" | "payLater"
  }
}
```

**Backend Requirements (Later in Checkout Flow):**
- Service booking will be created when order is placed
- See Order Creation flow for details

---

## Cart & Checkout Flows

### 9. View Cart

**Flow:**
1. User navigates to `/user/cart`
2. Cart displays:
   - All rental items (ACs)
   - All service items with booking details
3. User can:
   - Remove items
   - Edit service booking details (opens modal)
   - Update quantities (for rentals)
   - Proceed to checkout

**Cart Data Structure:**
- Items stored in localStorage under key `"cart"`
- Each item has `type: "rental"` or `type: "service"`
- Services include `bookingDetails` object

**Backend Requirements:**
- Cart is client-side (localStorage) until checkout
- No API calls needed for cart management
- Cart persists across sessions

---

### 10. Checkout

**Flow:**
1. User clicks "Proceed to Checkout" in cart
2. If not logged in: Login modal appears
3. User navigates to `/checkout`
4. Page displays:
   - Order summary (rentals + services)
   - User's delivery address
   - Payment options (Pay Now / Pay Later)
   - Total amount with discount calculation
5. User selects payment option
6. User clicks "Place Order"
7. Order created: `POST /api/orders`

**API Endpoint:** `POST /api/orders`

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
      "productDetails": {
        "brand": "LG",
        "model": "Model X",
        "capacity": "1.5 Ton",
        "productType": "Split",
        "location": "Mumbai",
        "description": "Energy efficient AC",
        "images": ["url1"]
      },
      "deliveryInfo": {
        "address": "123 Main St",
        "nearLandmark": "Near Park",
        "pincode": "123456",
        "alternateNumber": "9876543210"
      }
    },
    {
      "type": "service",
      "serviceId": "service_id",
      "quantity": 1,
      "price": 999,
      "serviceDetails": {
        "title": "AC Installation",
        "description": "Professional AC installation"
      },
      "bookingDetails": {
        "date": "2024-12-31",
        "time": "10-12",
        "addressType": "myself",
        "address": "123 Main St",
        "nearLandmark": "Near Park",
        "pincode": "123456",
        "alternateNumber": "9876543210",
        "contactName": "John Doe",
        "contactPhone": "+919999999999",
        "paymentOption": "payNow"
      }
    }
  ],
  "total": 3999,
  "discount": 0,
  "finalTotal": 3999,
  "paymentOption": "payNow",
  "paymentStatus": "paid",
  "customerInfo": {
    "userId": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890"
  },
  "deliveryAddresses": [
    {
      "homeAddress": "123 Main St",
      "nearLandmark": "Near Park",
      "pincode": "123456",
      "alternateNumber": "9876543210"
    }
  ]
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "_id": "order_id",
    "orderId": "ORD-2024-001",
    "items": [],
    "total": 3999,
    "discount": 0,
    "finalTotal": 3999,
    "paymentOption": "payNow",
    "paymentStatus": "paid",
    "status": "pending",
    "customerInfo": {},
    "deliveryAddresses": [],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Backend Requirements:**
- Generate unique orderId (format: "ORD-YYYY-XXX")
- Create order record with all items
- For service items: Create service booking record
- Link order to user
- Set initial status as "pending"
- Set paymentStatus based on paymentOption
- Clear user's cart after successful order (frontend handles this)
- Update product status if needed
- Store complete order details for history

---

## Order Management Flows

### 11. View Orders

**Flow:**
1. User navigates to `/user/orders`
2. Page loads orders: `GET /api/users/:userId/orders`
3. Page also loads service bookings: `GET /api/service-bookings/my-bookings`
4. Display both product orders and service bookings

**API Endpoints:**

**a) Get User Orders:** `GET /api/users/:userId/orders`

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "order_id",
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
      "status": "pending" | "processing" | "completed" | "cancelled",
      "customerInfo": {},
      "deliveryAddresses": [],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**b) Get User Service Bookings:** `GET /api/service-bookings/my-bookings`

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "booking_id",
      "serviceId": "service_id",
      "service": {
        "_id": "service_id",
        "title": "AC Installation",
        "description": "Professional AC installation"
      },
      "userId": "user_id",
      "name": "John Doe",
      "phone": "+919999999999",
      "preferredDate": "2024-12-31",
      "preferredTime": "10-12",
      "address": "Complete address",
      "nearLandmark": "Near Park",
      "pincode": "123456",
      "alternateNumber": "9876543210",
      "contactName": "John Doe",
      "contactPhone": "+919999999999",
      "status": "New" | "Scheduled" | "In Progress" | "Completed" | "Cancelled",
      "paymentOption": "payNow",
      "paymentStatus": "paid",
      "orderId": "ORD-2024-001",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Backend Requirements:**
- Return orders for specific user only
- Include all order details
- Support status filtering (optional)
- Link service bookings to orders via orderId
- Return service details with booking

---

### 12. View Order Details

**Flow:**
1. User clicks on order → navigates to `/user/orders/:id`
2. Page loads order details: `GET /api/orders/:orderId`

**API Endpoint:** `GET /api/orders/:orderId`

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "_id": "order_id",
    "orderId": "ORD-2024-001",
    "items": [
      {
        "type": "rental",
        "productId": "product_id",
        "quantity": 1,
        "price": 3000,
        "duration": 3,
        "productDetails": {
          "brand": "LG",
          "model": "Model X",
          "capacity": "1.5 Ton",
          "productType": "Split",
          "images": ["url1"]
        },
        "deliveryInfo": {}
      }
    ],
    "total": 3000,
    "discount": 0,
    "finalTotal": 3000,
    "paymentOption": "payNow",
    "paymentStatus": "paid",
    "status": "pending",
    "customerInfo": {},
    "deliveryAddresses": [],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Backend Requirements:**
- Return complete order details
- Include all item details
- Verify user has access to this order
- Return 404 if order not found or unauthorized

---

## User Profile & Dashboard Flows

### 13. User Dashboard

**Flow:**
1. User navigates to `/user/dashboard`
2. Page loads:
   - User's delivery address
   - Active rentals count
   - Pending services count
   - Cart items count
   - Wishlist count
   - Orders count
   - Recent activity summary
   - Support tickets

**Data Loading:**
- User data from context (already loaded on login)
- Orders: `GET /api/users/:userId/orders`
- Service bookings: `GET /api/service-bookings/my-bookings`
- Tickets: `GET /api/tickets`
- Cart/Wishlist from localStorage

**Backend Requirements:**
- No specific endpoint needed (uses existing endpoints)
- Aggregate counts can be calculated on frontend

---

### 14. Update User Profile/Address

**Flow:**
1. User navigates to `/user/dashboard`
2. User clicks "Edit" on address section
3. User updates:
   - Home Address (required)
   - Near Landmark (optional)
   - Pincode (optional, 6 digits)
   - Alternate Number (optional, 10 digits)
4. User clicks "Save"
5. Update: `PATCH /api/users/profile`

**API Endpoint:** `PATCH /api/users/profile`

**Request:**
```json
{
  "homeAddress": "123 Main St, City",
  "address": {
    "homeAddress": "123 Main St, City",
    "nearLandmark": "Near Park",
    "alternateNumber": "9876543210",
    "pincode": "123456"
  },
  "nearLandmark": "Near Park",
  "alternateNumber": "9876543210",
  "pincode": "123456"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "homeAddress": "123 Main St, City",
    "address": {
      "homeAddress": "123 Main St, City",
      "nearLandmark": "Near Park",
      "alternateNumber": "9876543210",
      "pincode": "123456"
    },
    "nearLandmark": "Near Park",
    "alternateNumber": "9876543210",
    "pincode": "123456"
  }
}
```

**Backend Requirements:**
- Update user profile with address fields
- Support both nested (`address.homeAddress`) and top-level (`homeAddress`) formats
- Validate pincode (6 digits if provided)
- Validate alternate number (10 digits if provided)
- Return updated user object
- Update should be authenticated (user can only update own profile)

---

## Wishlist Flows

### 15. View Wishlist

**Flow:**
1. User navigates to `/user/wishlist` (requires login)
2. Page loads wishlist: `GET /api/wishlist`
3. Display all wishlisted products
4. User can:
   - Remove items
   - Add items to cart

**API Endpoint:** `GET /api/wishlist`

**Expected Response:**
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
        "model": "Model X",
        "capacity": "1.5 Ton",
        "type": "Split",
        "price": {
          "3": 3000,
          "6": 5500
        },
        "images": ["url1"],
        "status": "Available"
      },
      "userId": "user_id",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Backend Requirements:**
- Return wishlist for authenticated user
- Populate product details
- Only show products that still exist
- Order by most recently added

---

### 16. Add to Wishlist

**Flow:**
1. User views product details
2. User clicks "Add to Wishlist" (heart icon)
3. Add: `POST /api/wishlist`
4. Success message shown
5. Button updates to show item is in wishlist

**API Endpoint:** `POST /api/wishlist`

**Request:**
```json
{
  "productId": "product_id"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Added to wishlist",
  "data": {
    "_id": "wishlist_item_id",
    "productId": "product_id",
    "userId": "user_id"
  }
}
```

**Backend Requirements:**
- Check if already in wishlist (prevent duplicates)
- Create wishlist item linked to user and product
- Return created item
- Requires authentication

---

### 17. Remove from Wishlist

**Flow:**
1. User views wishlist
2. User clicks "Remove" on item
3. Remove: `DELETE /api/wishlist/:productId`
4. Item removed from list
5. Success message shown

**API Endpoint:** `DELETE /api/wishlist/:productId`

**Expected Response:**
```json
{
  "success": true,
  "message": "Removed from wishlist"
}
```

**Backend Requirements:**
- Delete wishlist item
- Verify user owns the wishlist item
- Return success message

---

### 18. Check if Product in Wishlist

**Flow:**
1. User views product details
2. Page checks: `GET /api/wishlist/check/:productId`
3. Heart icon shows filled/unfilled based on response

**API Endpoint:** `GET /api/wishlist/check/:productId`

**Expected Response:**
```json
{
  "success": true,
  "inWishlist": true
}
```

**Backend Requirements:**
- Check if product exists in user's wishlist
- Return boolean status
- Requires authentication

---

## Support & Tickets Flows

### 19. Raise Support Ticket

**Flow:**
1. User navigates to dashboard or clicks "Raise Ticket"
2. TicketModal opens
3. User fills:
   - Subject (required)
   - Description (required)
   - Category (required)
   - Priority (optional, defaults to "medium")
4. Submit: `POST /api/tickets`
5. Success message shown
6. Ticket appears in dashboard

**API Endpoint:** `POST /api/tickets`

**Request:**
```json
{
  "subject": "AC not working",
  "description": "My AC stopped working yesterday",
  "category": "technical" | "billing" | "rental" | "service" | "general",
  "priority": "low" | "medium" | "high" | "urgent"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Ticket created successfully",
  "data": {
    "_id": "ticket_id",
    "subject": "AC not working",
    "description": "My AC stopped working yesterday",
    "category": "technical",
    "priority": "medium",
    "status": "Open",
    "userId": "user_id",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Backend Requirements:**
- Create ticket linked to user
- Set initial status as "Open"
- Store all ticket details
- Auto-populate userId from token
- Set default priority if not provided

---

### 20. View Support Tickets

**Flow:**
1. User views dashboard
2. Page loads tickets: `GET /api/tickets`
3. Display all user's tickets with:
   - Subject
   - Description
   - Category
   - Priority
   - Status
   - Admin remarks (if any)
   - Created date

**API Endpoint:** `GET /api/tickets`

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "ticket_id",
      "subject": "AC not working",
      "description": "My AC stopped working yesterday",
      "category": "technical",
      "priority": "medium",
      "status": "Open" | "In Progress" | "Resolved" | "Closed",
      "adminRemark": "We'll send a technician soon",
      "userId": "user_id",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Backend Requirements:**
- Return only tickets for authenticated user
- Include admin remarks if available
- Order by most recent first
- Filter by status (optional query parameter)

---

## Data Models Summary

### User Model
```javascript
{
  _id: ObjectId,
  id: String, // Same as _id
  name: String,
  email: String (unique),
  password: String (hashed),
  phone: String,
  role: String ("user" | "admin"),
  homeAddress: String,
  address: {
    homeAddress: String,
    nearLandmark: String,
    alternateNumber: String,
    pincode: String
  },
  nearLandmark: String, // Top-level for backward compatibility
  alternateNumber: String,
  pincode: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Product/AC Model
```javascript
{
  _id: ObjectId,
  id: String,
  brand: String,
  model: String,
  capacity: String, // "1.5 Ton"
  type: String, // "Split", "Window", etc.
  productType: String, // Same as type
  description: String,
  location: String,
  status: String ("Available" | "Rented Out"),
  price: {
    3: Number, // 3 months price
    6: Number, // 6 months price
    9: Number, // 9 months price
    11: Number // 11 months price
  },
  images: [String], // Array of image URLs
  createdAt: Date,
  updatedAt: Date
}
```

### Order Model
```javascript
{
  _id: ObjectId,
  orderId: String, // "ORD-2024-001"
  userId: ObjectId,
  items: [{
    type: String ("rental" | "service"),
    productId: ObjectId, // For rentals
    serviceId: ObjectId, // For services
    quantity: Number,
    price: Number,
    duration: Number, // 3, 6, 9, or 11 (for rentals)
    productDetails: Object, // Full product snapshot
    serviceDetails: Object, // Full service snapshot
    bookingDetails: Object, // For services
    deliveryInfo: Object // For rentals
  }],
  total: Number,
  discount: Number,
  finalTotal: Number,
  paymentOption: String ("payNow" | "payLater"),
  paymentStatus: String ("paid" | "pending"),
  status: String ("pending" | "processing" | "completed" | "cancelled"),
  customerInfo: {
    userId: ObjectId,
    name: String,
    email: String,
    phone: String
  },
  deliveryAddresses: [{
    homeAddress: String,
    nearLandmark: String,
    pincode: String,
    alternateNumber: String
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### Service Booking Model
```javascript
{
  _id: ObjectId,
  serviceId: ObjectId,
  service: Object, // Populated service details
  userId: ObjectId,
  orderId: String, // Link to order if part of order
  name: String,
  phone: String,
  preferredDate: String, // ISO date string
  preferredTime: String, // "10-12", "12-2", "2-4", "4-6", "6-8"
  address: String,
  nearLandmark: String,
  pincode: String,
  alternateNumber: String,
  contactName: String,
  contactPhone: String,
  addressType: String ("myself" | "other"),
  status: String ("New" | "Scheduled" | "In Progress" | "Completed" | "Cancelled"),
  paymentOption: String ("payNow" | "payLater"),
  paymentStatus: String ("paid" | "pending"),
  createdAt: Date,
  updatedAt: Date
}
```

### Wishlist Model
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  productId: ObjectId,
  product: Object, // Populated product details
  createdAt: Date
}
```

### Ticket Model
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  subject: String,
  description: String,
  category: String ("technical" | "billing" | "rental" | "service" | "general"),
  priority: String ("low" | "medium" | "high" | "urgent"),
  status: String ("Open" | "In Progress" | "Resolved" | "Closed"),
  adminRemark: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Authentication Requirements

All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

Token should include:
- userId
- email
- role

Backend should:
- Verify token on protected routes
- Extract userId from token
- Validate user has permission for the operation

---

## Error Handling

All API responses should follow this format:

**Success:**
```json
{
  "success": true,
  "data": {},
  "message": "Optional message"
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error message describing what went wrong"
}
```

**HTTP Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (no permission)
- `404`: Not Found
- `500`: Internal Server Error

---

## Notes for Backend Implementation

1. **Address Format:** Support both nested (`user.address.homeAddress`) and top-level (`user.homeAddress`) formats for backward compatibility.

2. **Order Generation:** Generate unique orderId in format "ORD-YYYY-XXX" (e.g., "ORD-2024-001").

3. **Service Bookings:** Service bookings can be created:
   - Standalone via `POST /api/service-bookings`
   - As part of order via `POST /api/orders` (when order contains service items)

4. **Cart Management:** Cart is managed client-side (localStorage) until checkout. No backend endpoints needed for cart operations.

5. **Price Structure:** Products have price object with keys 3, 6, 9, 11 representing months.

6. **Payment Options:** 
   - "payNow": User pays immediately (discount may apply)
   - "payLater": User pays later (no discount)

7. **Status Values:**
   - Orders: "pending", "processing", "completed", "cancelled"
   - Service Bookings: "New", "Scheduled", "In Progress", "Completed", "Cancelled"
   - Products: "Available", "Rented Out"
   - Tickets: "Open", "In Progress", "Resolved", "Closed"

8. **Time Slots:** Service booking time slots are: "10-12", "12-2", "2-4", "4-6", "6-8"

---

This document should serve as a complete reference for implementing all user-facing backend endpoints.

