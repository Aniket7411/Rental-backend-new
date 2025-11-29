# Backend API Documentation - Rental Service Platform

## Base URL
```
http://localhost:5000/api
```
For production, update the base URL in the frontend `src/services/api.js`

---

## Authentication

All authenticated endpoints require `Authorization: Bearer <token>` header.

### 1. User Signup
**POST** `/auth/signup`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+919999999999"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+919999999999",
    "role": "user"
  }
}
```

**Error Response (400/409):**
```json
{
  "success": false,
  "message": "Email already exists"
}
```

---

### 2. Login (Unified - Auto-detects Admin/User)
**POST** `/auth/login`

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin" // or "user"
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

---

### 3. Forgot Password
**POST** `/auth/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
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

## Products (Public Endpoints)

### 4. Get All Products (with filters)
**GET** `/acs`

**Query Parameters:**
- `category` (optional): `"AC"`, `"Refrigerator"`, `"Washing Machine"`, or comma-separated list
- `brand` (optional): Filter by brand
- `capacity` (optional): Filter by capacity
- `type` (optional): Filter by type (e.g., "Split", "Window")
- `location` (optional): Filter by location
- `minPrice` (optional): Minimum price
- `maxPrice` (optional): Maximum price
- `status` (optional): `"Available"`, `"Rented Out"`
- `page` (optional): Page number for pagination
- `limit` (optional): Items per page

**Example:**
```
GET /acs?category=AC,Refrigerator&status=Available&minPrice=1000&maxPrice=5000
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "product_id",
      "brand": "LG",
      "model": "1.5 Ton Split AC",
      "capacity": "1.5 Ton",
      "type": "Split",
      "category": "AC",
      "description": "Energy efficient split AC",
      "location": "Mumbai",
      "status": "Available",
      "price": {
        "monthly": 2000,
        "quarterly": 5500,
        "yearly": 20000
      },
      "images": [
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg"
      ],
      "features": {
        "energyRating": "5 Star",
        "operationType": "Inverter",
        "loadType": "Full Load"
      },
      "condition": "New",
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 50
}
```

---

### 5. Get Product by ID
**GET** `/acs/:id`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "product_id",
    "brand": "LG",
    "model": "1.5 Ton Split AC",
    "capacity": "1.5 Ton",
    "type": "Split",
    "category": "AC",
    "description": "Energy efficient split AC",
    "location": "Mumbai",
    "status": "Available",
    "price": {
      "monthly": 2000,
      "quarterly": 5500,
      "yearly": 20000
    },
    "images": ["https://example.com/image1.jpg"],
    "features": {},
    "condition": "New",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Product not found"
}
```

---

### 6. Create Rental Inquiry
**POST** `/acs/:id/inquiry`

**Request Body:**
```json
{
  "acId": "product_id",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+919999999999",
  "duration": "Monthly",
  "message": "Interested in renting this AC"
}
```

**Response (200):**
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
    "message": "Interested in renting this AC",
    "status": "Pending",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

---

## Services (Public Endpoints)

### 7. Get All Services
**GET** `/services`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "service_id",
      "title": "AC Deep Cleaning",
      "description": "Complete deep cleaning service",
      "price": 999,
      "image": "https://example.com/service.jpg",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### 8. Create Service Booking
**POST** `/service-bookings`

**Request Body:**
```json
{
  "serviceId": "service_id",
  "serviceTitle": "AC Deep Cleaning",
  "servicePrice": 999,
  "name": "John Doe",
  "phone": "+919999999999",
  "date": "2024-02-01",
  "time": "10-12",
  "address": "123 Main Street, Mumbai",
  "addressType": "myself",
  "contactName": "John Doe",
  "contactPhone": "+919999999999",
  "paymentOption": "payLater"
}
```

**Note:** 
- `paymentOption` can be `"payNow"` or `"payLater"`
- If `paymentOption` is `"payNow"`, payment should be processed and `paymentStatus` should be set to `"paid"`
- If `paymentOption` is `"payLater"`, `paymentStatus` should be `"pending"`

**Response (200):**
```json
{
  "success": true,
  "message": "Service booking submitted successfully",
  "data": {
    "_id": "booking_id",
    "serviceId": "service_id",
    "serviceTitle": "AC Deep Cleaning",
    "servicePrice": 999,
    "userId": "user_id",
    "name": "John Doe",
    "phone": "+919999999999",
    "date": "2024-02-01",
    "time": "10-12",
    "address": "123 Main Street, Mumbai",
    "addressType": "myself",
    "contactName": "John Doe",
    "contactPhone": "+919999999999",
    "paymentOption": "payLater",
    "paymentStatus": "pending",
    "status": "New",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

---

## Orders (Authenticated - User)

### 9. Create Order
**POST** `/orders`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "items": [
    {
      "type": "rental",
      "productId": "product_id",
      "quantity": 1,
      "price": 2000
    },
    {
      "type": "service",
      "serviceId": "service_id",
      "quantity": 1,
      "price": 999,
      "bookingDetails": {
        "date": "2024-02-01",
        "time": "10-12",
        "address": "123 Main Street, Mumbai",
        "addressType": "myself",
        "contactName": "John Doe",
        "contactPhone": "+919999999999",
        "paymentOption": "payLater"
      }
    }
  ],
  "total": 2999,
  "discount": 0,
  "finalTotal": 2999,
  "paymentOption": "payLater",
  "paymentStatus": "pending"
}
```

**Note:**
- `paymentOption` can be `"payNow"` or `"payLater"`
- If `paymentOption` is `"payNow"`:
  - Process payment (integrate with payment gateway)
  - Set `paymentStatus` to `"paid"`
  - Set order `status` to `"confirmed"`
  - Notify admin about the order
- If `paymentOption` is `"payLater"`:
  - Set `paymentStatus` to `"pending"`
  - Set order `status` to `"pending"`
  - Notify admin about the pending order

**Response (200):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "_id": "order_id",
    "orderId": "ORD-2024-001",
    "userId": "user_id",
    "items": [
      {
        "type": "rental",
        "productId": "product_id",
        "product": {
          "_id": "product_id",
          "brand": "LG",
          "model": "1.5 Ton Split AC",
          "images": ["https://example.com/image1.jpg"]
        },
        "quantity": 1,
        "price": 2000
      },
      {
        "type": "service",
        "serviceId": "service_id",
        "service": {
          "_id": "service_id",
          "title": "AC Deep Cleaning",
          "image": "https://example.com/service.jpg"
        },
        "quantity": 1,
        "price": 999,
        "bookingDetails": {
          "date": "2024-02-01",
          "time": "10-12",
          "address": "123 Main Street, Mumbai"
        }
      }
    ],
    "total": 2999,
    "discount": 0,
    "finalTotal": 2999,
    "paymentOption": "payLater",
    "paymentStatus": "pending",
    "status": "pending",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

**Important:** When creating an order:
1. For rental items: Check product availability and update status if needed
2. For service items: Create corresponding service booking records
3. Notify admin about the new order
4. If payment is successful, update payment status

---

### 10. Get User Orders
**GET** `/users/:userId/orders`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "order_id",
      "orderId": "ORD-2024-001",
      "userId": "user_id",
      "items": [
        {
          "type": "rental",
          "productId": "product_id",
          "product": {
            "_id": "product_id",
            "brand": "LG",
            "model": "1.5 Ton Split AC",
            "images": ["https://example.com/image1.jpg"]
          },
          "quantity": 1,
          "price": 2000
        }
      ],
      "total": 2000,
      "discount": 0,
      "finalTotal": 2000,
      "paymentOption": "payLater",
      "paymentStatus": "pending",
      "status": "pending",
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### 11. Get User Service Bookings
**GET** `/service-bookings/my-bookings`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "booking_id",
      "bookingId": "SB-2024-001",
      "serviceId": "service_id",
      "serviceTitle": "AC Deep Cleaning",
      "servicePrice": 999,
      "userId": "user_id",
      "name": "John Doe",
      "phone": "+919999999999",
      "date": "2024-02-01",
      "time": "10-12",
      "address": "123 Main Street, Mumbai",
      "addressType": "myself",
      "contactName": "John Doe",
      "contactPhone": "+919999999999",
      "paymentOption": "payLater",
      "paymentStatus": "pending",
      "status": "New",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

## User Profile

### 12. Update User Profile
**PATCH** `/users/profile`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "John Doe Updated",
  "phone": "+919999999999",
  "address": "New Address"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "user_id",
    "name": "John Doe Updated",
    "email": "john@example.com",
    "phone": "+919999999999",
    "address": "New Address",
    "role": "user"
  }
}
```

---

## Admin Endpoints

### 13. Get All Products (Admin)
**GET** `/admin/products`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "product_id",
      "brand": "LG",
      "model": "1.5 Ton Split AC",
      "capacity": "1.5 Ton",
      "type": "Split",
      "category": "AC",
      "description": "Energy efficient split AC",
      "location": "Mumbai",
      "status": "Available",
      "price": {
        "monthly": 2000,
        "quarterly": 5500,
        "yearly": 20000
      },
      "images": ["https://example.com/image1.jpg"],
      "features": {},
      "condition": "New",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### 14. Create Product (Admin)
**POST** `/admin/products`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "brand": "LG",
  "model": "1.5 Ton Split AC",
  "capacity": "1.5 Ton",
  "type": "Split",
  "category": "AC",
  "description": "Energy efficient split AC",
  "location": "Mumbai",
  "status": "Available",
  "price": {
    "monthly": 2000,
    "quarterly": 5500,
    "yearly": 20000
  },
  "images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ],
  "features": {
    "energyRating": "5 Star",
    "operationType": "Inverter",
    "loadType": "Full Load"
  },
  "condition": "New"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Product added successfully",
  "data": {
    "_id": "product_id",
    "brand": "LG",
    "model": "1.5 Ton Split AC",
    "category": "AC",
    "status": "Available",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

---

### 15. Update Product (Admin)
**PATCH** `/admin/products/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:** (All fields optional)
```json
{
  "status": "Rented Out",
  "price": {
    "monthly": 2200
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "_id": "product_id",
    "status": "Rented Out",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
}
```

---

### 16. Delete Product (Admin)
**DELETE** `/admin/products/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

---

### 17. Get All Service Bookings (Admin)
**GET** `/admin/service-bookings`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "booking_id",
      "bookingId": "SB-2024-001",
      "serviceId": "service_id",
      "serviceTitle": "AC Deep Cleaning",
      "servicePrice": 999,
      "userId": "user_id",
      "user": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+919999999999"
      },
      "name": "John Doe",
      "phone": "+919999999999",
      "date": "2024-02-01",
      "time": "10-12",
      "address": "123 Main Street, Mumbai",
      "addressType": "myself",
      "contactName": "John Doe",
      "contactPhone": "+919999999999",
      "paymentOption": "payLater",
      "paymentStatus": "pending",
      "status": "New",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### 18. Update Service Booking Status (Admin)
**PATCH** `/admin/service-bookings/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "status": "Contacted"
}
```

**Status Values:**
- `"New"` - New booking
- `"Contacted"` - Admin has contacted the user
- `"In-Progress"` - Service is in progress
- `"Resolved"` - Service completed
- `"Rejected"` - Booking rejected
- `"Cancelled"` - Booking cancelled

**Response (200):**
```json
{
  "success": true,
  "message": "Lead status updated",
  "data": {
    "_id": "booking_id",
    "status": "Contacted",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
}
```

---

### 19. Get All Rental Inquiries (Admin)
**GET** `/admin/rental-inquiries`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "inquiry_id",
      "acId": "product_id",
      "product": {
        "brand": "LG",
        "model": "1.5 Ton Split AC"
      },
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+919999999999",
      "duration": "Monthly",
      "message": "Interested in renting this AC",
      "status": "Pending",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

---

### 20. Update Rental Inquiry Status (Admin)
**PATCH** `/admin/rental-inquiries/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "status": "Contacted"
}
```

**Status Values:**
- `"Pending"` - New inquiry
- `"Contacted"` - Admin has contacted the user
- `"In-Progress"` - Processing
- `"Resolved"` - Inquiry resolved
- `"Rejected"` - Inquiry rejected

**Response (200):**
```json
{
  "success": true,
  "message": "Inquiry status updated",
  "data": {
    "_id": "inquiry_id",
    "status": "Contacted",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
}
```

---

### 21. Create Service (Admin)
**POST** `/admin/services`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "AC Deep Cleaning",
  "description": "Complete deep cleaning service for your AC",
  "price": 999,
  "image": "https://example.com/service.jpg"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Service added successfully",
  "data": {
    "_id": "service_id",
    "title": "AC Deep Cleaning",
    "description": "Complete deep cleaning service for your AC",
    "price": 999,
    "image": "https://example.com/service.jpg",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

---

### 22. Update Service (Admin)
**PATCH** `/admin/services/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:** (All fields optional)
```json
{
  "price": 799
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Service updated successfully",
  "data": {
    "_id": "service_id",
    "price": 799,
    "updatedAt": "2024-01-15T10:00:00Z"
  }
}
```

---

### 23. Delete Service (Admin)
**DELETE** `/admin/services/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Service deleted successfully"
}
```

---

### 24. Get All Orders (Admin)
**GET** `/admin/orders`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): Filter by order status
- `paymentStatus` (optional): Filter by payment status
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "order_id",
      "orderId": "ORD-2024-001",
      "userId": "user_id",
      "user": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+919999999999"
      },
      "items": [
        {
          "type": "rental",
          "productId": "product_id",
          "product": {
            "brand": "LG",
            "model": "1.5 Ton Split AC"
          },
          "quantity": 1,
          "price": 2000
        }
      ],
      "total": 2000,
      "discount": 0,
      "finalTotal": 2000,
      "paymentOption": "payLater",
      "paymentStatus": "pending",
      "status": "pending",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 100
}
```

---

### 25. Update Order Status (Admin)
**PATCH** `/admin/orders/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "status": "confirmed"
}
```

**Status Values:**
- `"pending"` - Order placed, awaiting confirmation
- `"confirmed"` - Order confirmed
- `"processing"` - Order being processed
- `"shipped"` - Order shipped (for rentals)
- `"delivered"` - Order delivered (for rentals)
- `"completed"` - Order completed
- `"cancelled"` - Order cancelled

**Response (200):**
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "_id": "order_id",
    "status": "confirmed",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
}
```

---

## Public Contact Endpoints

### 26. Create Lead
**POST** `/leads`

**Request Body:**
```json
{
  "name": "John Doe",
  "phone": "+919999999999",
  "message": "Interested in your services"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Thank you! We will contact you soon.",
  "data": {
    "_id": "lead_id",
    "name": "John Doe",
    "phone": "+919999999999",
    "message": "Interested in your services",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

---

### 27. Submit Contact Form
**POST** `/contact`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+919999999999",
  "message": "Hello, I have a question"
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

### 28. Submit Vendor Listing Request
**POST** `/vendor-listing-request`

**Request Body:**
```json
{
  "name": "Vendor Name",
  "phone": "+919999999999",
  "businessName": "Cool Air Services",
  "message": "I want to list my products"
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

## Data Structures

### Product Schema
```typescript
{
  _id: string;
  brand: string;
  model: string;
  capacity: string;
  type: string; // "Split", "Window", etc.
  category: "AC" | "Refrigerator" | "Washing Machine";
  description: string;
  location: string;
  status: "Available" | "Rented Out";
  price: {
    monthly: number;
    quarterly?: number;
    yearly?: number;
  };
  images: string[];
  features: {
    energyRating?: string;
    operationType?: string;
    loadType?: string;
    [key: string]: any;
  };
  condition: "New" | "Used" | "Refurbished";
  createdAt: Date;
  updatedAt: Date;
}
```

### Service Schema
```typescript
{
  _id: string;
  title: string;
  description: string;
  price: number;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Service Booking Schema
```typescript
{
  _id: string;
  bookingId: string; // Auto-generated: "SB-YYYY-XXX"
  serviceId: string;
  serviceTitle: string;
  servicePrice: number;
  userId: string;
  name: string;
  phone: string; // E.164 format: "+919999999999"
  date: string; // ISO date: "2024-02-01"
  time: string; // Time slot: "10-12", "12-2", "2-4", "4-6", "6-8"
  address: string;
  addressType: "myself" | "other";
  contactName: string;
  contactPhone: string;
  paymentOption: "payNow" | "payLater";
  paymentStatus: "paid" | "pending";
  status: "New" | "Contacted" | "In-Progress" | "Resolved" | "Rejected" | "Cancelled";
  createdAt: Date;
  updatedAt: Date;
}
```

### Order Schema
```typescript
{
  _id: string;
  orderId: string; // Auto-generated: "ORD-YYYY-XXX"
  userId: string;
  items: Array<{
    type: "rental" | "service";
    productId?: string; // For rental items
    serviceId?: string; // For service items
    quantity: number;
    price: number;
    bookingDetails?: { // For service items
      date: string;
      time: string;
      address: string;
      addressType: string;
      contactName: string;
      contactPhone: string;
      paymentOption: string;
    };
  }>;
  total: number;
  discount: number; // 5% discount if payNow
  finalTotal: number;
  paymentOption: "payNow" | "payLater";
  paymentStatus: "paid" | "pending";
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "completed" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}
```

### User Schema
```typescript
{
  _id: string;
  name: string;
  email: string;
  password: string; // Hashed
  phone: string;
  role: "user" | "admin";
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Rental Inquiry Schema
```typescript
{
  _id: string;
  acId: string;
  name: string;
  email: string;
  phone: string;
  duration: string; // "Monthly", "Quarterly", "Yearly"
  message?: string;
  status: "Pending" | "Contacted" | "In-Progress" | "Resolved" | "Rejected";
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Payment Flow

### Pay Now Flow
1. User selects "Pay Now" option during checkout
2. Frontend sends order with `paymentOption: "payNow"` and `paymentStatus: "pending"` initially
3. Backend:
   - Creates order with `paymentStatus: "pending"` and `status: "pending"`
   - Applies 5% discount to final total
   - Initiates payment gateway integration (Razorpay/Stripe/etc.)
   - Returns payment gateway order details to frontend
4. Frontend:
   - Redirects user to payment gateway
   - User completes payment
   - Payment gateway redirects back with payment status
5. Backend (via webhook or callback):
   - Verifies payment
   - Updates order with `paymentStatus: "paid"` and `status: "confirmed"`
   - Creates service bookings (if any) with `paymentStatus: "paid"`
   - Updates product availability (if rental items)
   - Notifies admin about the confirmed order
6. User sees order in "My Orders" with status "confirmed"

**Alternative Simple Flow (Current Implementation):**
- Frontend can send order with `paymentStatus: "paid"` directly if payment is processed client-side
- Backend should still verify payment before confirming order

### Pay Later Flow
1. User selects "Pay Later" option during checkout
2. Frontend sends order with `paymentOption: "payLater"` and `paymentStatus: "pending"`
3. Backend:
   - Creates order with `paymentStatus: "pending"` and `status: "pending"`
   - Creates service bookings (if any) with `paymentStatus: "pending"`
   - Notifies admin about the pending order
4. User sees order in "My Orders" with status "pending"
5. Admin can see pending orders and update status
6. User can pay later (implement payment gateway integration for pending orders)

---

## Order Creation Flow

### When User Places Order:

1. **Cart Contains Rental Products:**
   - Check product availability
   - Update product status if needed
   - Create order items for rentals

2. **Cart Contains Services:**
   - Create service booking records
   - Link service bookings to order
   - Store booking details (date, time, address, etc.)

3. **Payment Processing:**
   - If `payNow`: Process payment → Update status to "confirmed"
   - If `payLater`: Set status to "pending"

4. **Admin Notification:**
   - Send notification/email to admin about new order
   - Include order details and payment status

5. **User Notification:**
   - Send confirmation email/SMS to user
   - Include order ID and details

---

## Important Notes

1. **Authentication:**
   - All admin endpoints require `Authorization: Bearer <token>` header
   - User endpoints require authentication for user-specific data
   - Public endpoints (products, services listing) don't require auth

2. **Payment Integration:**
   - Integrate with payment gateway (Razorpay, Stripe, etc.) for "Pay Now" option
   - **Recommended Flow:**
     - Create order with `paymentStatus: "pending"`
     - Generate payment gateway order/checkout session
     - Return payment gateway details to frontend
     - Frontend redirects to payment gateway
     - Handle payment success/failure webhooks
     - Update order status based on payment result
   - Store payment transaction IDs in order/service booking records
   - Implement webhook handlers for payment callbacks
   - Verify payment signatures before updating order status

3. **Order ID Generation:**
   - Format: `ORD-YYYY-XXX` (e.g., `ORD-2024-001`)
   - Service Booking ID: `SB-YYYY-XXX` (e.g., `SB-2024-001`)

4. **Phone Number Format:**
   - Use E.164 format: `+919999999999`
   - Validate phone numbers on backend

5. **Image URLs:**
   - Frontend uploads images to Cloudinary
   - Backend receives image URLs (not files)
   - Store array of image URLs in product/service records

6. **Discount Calculation:**
   - 5% discount applied when `paymentOption === "payNow"`
   - Calculate: `discount = total * 0.05`
   - Final total: `finalTotal = total - discount`

7. **Status Management:**
   - Products: `"Available"`, `"Rented Out"`
   - Orders: `"pending"`, `"confirmed"`, `"processing"`, `"shipped"`, `"delivered"`, `"completed"`, `"cancelled"`
   - Service Bookings: `"New"`, `"Contacted"`, `"In-Progress"`, `"Resolved"`, `"Rejected"`, `"Cancelled"`
   - Payment: `"paid"`, `"pending"`

8. **Error Handling:**
   - All endpoints should return consistent error format:
   ```json
   {
     "success": false,
     "message": "Error message here"
   }
   ```
   - Use appropriate HTTP status codes (400, 401, 404, 500)

9. **Pagination:**
   - Implement pagination for list endpoints
   - Use `page` and `limit` query parameters
   - Return `total` count in response

10. **Notifications:**
    - Notify admin when:
      - New order is placed
      - New service booking is created
      - New rental inquiry is submitted
    - Notify user when:
      - Order is confirmed
      - Order status is updated
      - Service booking is confirmed

---

## Testing Checklist

- [ ] User signup and login
- [ ] Admin login
- [ ] Get products with filters
- [ ] Create rental inquiry
- [ ] Create service booking (pay now and pay later)
- [ ] Create order with rentals and services
- [ ] Get user orders
- [ ] Get user service bookings
- [ ] Admin: Create/Update/Delete products
- [ ] Admin: View and update service bookings
- [ ] Admin: View and update rental inquiries
- [ ] Admin: View and update orders
- [ ] Payment flow (pay now)
- [ ] Payment flow (pay later)
- [ ] Order status updates
- [ ] Service booking status updates

---

## Environment Variables

Backend should use these environment variables:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/rental-service
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
PAYMENT_GATEWAY_KEY=your-payment-gateway-key
PAYMENT_GATEWAY_SECRET=your-payment-gateway-secret
EMAIL_SERVICE_API_KEY=your-email-service-key
```

---

## Support

For any questions or clarifications, please refer to the frontend code in `src/services/api.js` to see the exact request/response formats expected.

