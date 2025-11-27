# Backend API Documentation - Rental Service Platform

## Table of Contents
1. [Base Configuration](#base-configuration)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Models & Schemas](#data-models--schemas)
4. [API Endpoints](#api-endpoints)
5. [Error Handling](#error-handling)
6. [Integration Notes](#integration-notes)

---

## Base Configuration

### API Base URL
```
Development: http://localhost:5000/api
Production: https://your-production-domain.com/api
```

### Request Headers
All authenticated requests must include:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## Authentication & Authorization

### User Roles
- `user`: Regular customer
- `admin`: Administrator with full access

### JWT Token
- **Expiration**: 7 days
- **Payload**: `{ userId, email, role }`
- **Storage**: Frontend stores in `localStorage` as `token`

---

## Data Models & Schemas

### 1. User Model

```javascript
{
  _id: ObjectId,
  name: String (required),
  email: String (required, unique, indexed),
  password: String (hashed, required),
  phone: String (required, min 10 digits),
  homeAddress: String (optional),
  interestedIn: [String] (optional), // ["AC", "Refrigerator", "Washing Machine"]
  role: String (enum: ["user", "admin"], default: "user", indexed),
  createdAt: Date,
  updatedAt: Date
}
```

### 2. Product Model

```javascript
{
  _id: ObjectId,
  category: String (enum: ["AC", "Refrigerator", "Washing Machine"], required),
  name: String (required),
  brand: String (required),
  model: String (optional, default: ""),
  capacity: String (required), // "1 Ton", "190 L", "5.8 kg"
  type: String (required), // "Split", "Single Door", "Top Load"
  condition: String (enum: ["New", "Refurbished"], default: "New"),
  description: String (optional, default: ""),
  location: String (required),
  status: String (enum: ["Available", "Rented Out", "Under Maintenance"], default: "Available"),
  discount: Number (min: 0, max: 100, default: 0),
  price: {
    3: Number (required), // 3 months price
    6: Number (required), // 6 months price
    9: Number (required), // 9 months price
    11: Number (required), // 11 months price
    monthly: Number (required) // Monthly price
  },
  images: [String] (required, min: 1), // Cloudinary URLs, first image is hero image
  features: {
    specs: [String] (optional),
    dimensions: String (optional),
    safety: [String] (optional)
  },
  // Category-specific fields
  energyRating: String (optional), // Only for Refrigerator: "2 Star", "3 Star", "4 Star", "5 Star"
  operationType: String (optional), // Only for Washing Machine: "Automatic", "Semi-Automatic"
  loadType: String (optional), // Only for Washing Machine: "Top Load", "Front Load"
  createdAt: Date,
  updatedAt: Date
}
```

### 3. Service Model

```javascript
{
  _id: ObjectId,
  title: String (required),
  description: String (required),
  price: Number (required),
  originalPrice: Number (optional),
  badge: String (optional), // "Visit Within 1 Hour", "Most Booked", "Power Saver"
  image: String (required), // Cloudinary URL
  process: [String] (optional), // Array of process steps
  benefits: [String] (optional), // Array of benefits
  keyFeatures: [String] (optional), // Array of key features
  recommendedFrequency: String (optional),
  createdAt: Date,
  updatedAt: Date
}
```

### 4. Service Booking Model

```javascript
{
  _id: ObjectId,
  serviceId: ObjectId (ref: "Service", required),
  userId: ObjectId (ref: "User", optional), // Optional for guest bookings
  name: String (required),
  phone: String (required),
  email: String (optional),
  address: String (required),
  preferredDate: String (optional),
  preferredTime: String (optional),
  description: String (optional),
  images: [String] (optional), // Cloudinary URLs for issue images
  status: String (enum: ["New", "Contacted", "In-Progress", "Resolved", "Rejected"], default: "New"),
  createdAt: Date,
  updatedAt: Date
}
```

### 5. Rental Inquiry Model

```javascript
{
  _id: ObjectId,
  productId: ObjectId (ref: "Product", required), // Preferred field
  acId: ObjectId (ref: "Product", optional), // Backward compatibility
  productCategory: String (enum: ["AC", "Refrigerator", "Washing Machine"], default: "AC"),
  name: String (required),
  phone: String (required),
  email: String (required),
  message: String (optional),
  acDetails: { // Product details snapshot
    id: ObjectId,
    brand: String,
    model: String,
    capacity: String,
    type: String,
    location: String,
    price: Object
  },
  status: String (enum: ["Pending", "Contacted", "Completed", "Cancelled"], default: "Pending"),
  createdAt: Date,
  updatedAt: Date
}
```

### 6. Lead Model (General Lead Capture)

```javascript
{
  _id: ObjectId,
  name: String (required),
  phone: String (required),
  email: String (optional),
  source: String (optional), // "browse", "home", "contact"
  message: String (optional),
  createdAt: Date
}
```

### 7. Vendor Request Model

```javascript
{
  _id: ObjectId,
  name: String (required),
  phone: String (required),
  email: String (required),
  message: String (optional),
  createdAt: Date
}
```

### 8. Contact Form Model

```javascript
{
  _id: ObjectId,
  name: String (required),
  email: String (required),
  phone: String (required),
  subject: String (optional),
  message: String (required),
  createdAt: Date
}
```

---

## API Endpoints

### Authentication Endpoints

#### 1. Unified Login
```
POST /api/auth/login
```
**Description**: Single login endpoint that auto-detects admin or user role.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "user",
    "phone": "1234567890",
    "homeAddress": "",
    "interestedIn": []
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

**Status Codes:**
- `200`: Success
- `401`: Invalid credentials
- `500`: Server error

---

#### 2. User Signup
```
POST /api/auth/signup
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "1234567890",
  "homeAddress": "123 Main St, City" (optional),
  "interestedIn": ["AC", "Refrigerator"] (optional)
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "phone": "1234567890",
    "homeAddress": "123 Main St, City",
    "interestedIn": ["AC", "Refrigerator"]
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "User already exists with this email"
}
```

**Status Codes:**
- `201`: Created
- `400`: Validation error or user exists
- `500`: Server error

---

#### 3. Forgot Password
```
POST /api/auth/forgot-password
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset link sent to your email"
}
```

**Status Codes:**
- `200`: Success
- `404`: Email not found
- `500`: Server error

---

### Public Product Endpoints

#### 4. Get Products (Browse)
```
GET /api/acs
```

**Query Parameters:**
- `category` (optional): "AC" | "Refrigerator" | "Washing Machine"
- `search` (optional): Search term for brand, model, location
- `capacity` (optional): Filter by capacity
- `type` (optional): Filter by type
- `location` (optional): Filter by location
- `duration` (optional): "3" | "6" | "9" | "11" | "monthly"

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "product_id",
      "category": "AC",
      "name": "1 Ton 3 Star Convertible Inverter Split AC",
      "brand": "LG",
      "model": "LG123ABC",
      "capacity": "1 Ton",
      "type": "Split",
      "condition": "New",
      "description": "Product description",
      "location": "Mumbai, Maharashtra",
      "status": "Available",
      "discount": 5,
      "price": {
        "3": 15000,
        "6": 28000,
        "9": 40000,
        "11": 50000,
        "monthly": 5000
      },
      "images": ["https://cloudinary.com/image1.jpg", "https://cloudinary.com/image2.jpg"],
      "features": {
        "specs": ["Capacity/Size: 1T"],
        "dimensions": "950\"L x 290\"B x 375\"H",
        "safety": ["Period Maintenance"]
      },
      "energyRating": "",
      "operationType": "",
      "loadType": ""
    }
  ],
  "total": 50
}
```

**Status Codes:**
- `200`: Success
- `500`: Server error

---

#### 5. Get Product by ID
```
GET /api/acs/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "product_id",
    "category": "AC",
    "name": "1 Ton 3 Star Convertible Inverter Split AC",
    "brand": "LG",
    "model": "LG123ABC",
    "capacity": "1 Ton",
    "type": "Split",
    "condition": "New",
    "description": "Product description",
    "location": "Mumbai, Maharashtra",
    "status": "Available",
    "discount": 5,
    "price": {
      "3": 15000,
      "6": 28000,
      "9": 40000,
      "11": 50000,
      "monthly": 5000
    },
    "images": ["https://cloudinary.com/image1.jpg"],
    "features": {
      "specs": ["Capacity/Size: 1T"],
      "dimensions": "950\"L x 290\"B x 375\"H",
      "safety": ["Period Maintenance"]
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Status Codes:**
- `200`: Success
- `404`: Product not found
- `500`: Server error

---

#### 6. Create Rental Inquiry
```
POST /api/acs/:id/inquiry
```

**Request Body:**
```json
{
  "name": "John Doe",
  "phone": "1234567890",
  "email": "john@example.com",
  "message": "I'm interested in this product",
  "acId": "product_id",
  "acDetails": {
    "id": "product_id",
    "brand": "LG",
    "model": "LG123ABC",
    "capacity": "1 Ton",
    "type": "Split",
    "location": "Mumbai, Maharashtra",
    "price": {
      "monthly": 5000
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rental inquiry submitted successfully",
  "data": {
    "_id": "inquiry_id",
    "productId": "product_id",
    "productCategory": "AC",
    "name": "John Doe",
    "phone": "1234567890",
    "email": "john@example.com",
    "message": "I'm interested in this product",
    "status": "Pending",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Status Codes:**
- `201`: Created
- `400`: Validation error
- `500`: Server error

---

### Service Endpoints

#### 7. Get All Services
```
GET /api/services
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "service_id",
      "title": "AC Repair Service",
      "description": "Professional AC repair",
      "price": 500,
      "originalPrice": 700,
      "badge": "Visit Within 1 Hour",
      "image": "https://cloudinary.com/service.jpg",
      "process": ["Step 1", "Step 2"],
      "benefits": ["Benefit 1", "Benefit 2"],
      "keyFeatures": ["Feature 1", "Feature 2"],
      "recommendedFrequency": "Every 3 months"
    }
  ]
}
```

**Status Codes:**
- `200`: Success
- `500`: Server error

---

#### 8. Create Service Booking
```
POST /api/service-bookings
```

**Request Body:**
```json
{
  "serviceId": "service_id",
  "name": "John Doe",
  "phone": "1234567890",
  "email": "john@example.com",
  "address": "123 Main St, City",
  "preferredDate": "2024-01-15",
  "preferredTime": "10:00 AM",
  "description": "AC not cooling properly",
  "images": ["https://cloudinary.com/issue1.jpg"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Service booking submitted successfully",
  "data": {
    "_id": "booking_id",
    "serviceId": "service_id",
    "name": "John Doe",
    "phone": "1234567890",
    "status": "New",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Status Codes:**
- `201`: Created
- `400`: Validation error
- `500`: Server error

---

### Lead & Contact Endpoints

#### 9. Create Lead
```
POST /api/leads
```

**Request Body:**
```json
{
  "name": "John Doe",
  "phone": "1234567890",
  "email": "john@example.com",
  "source": "browse",
  "message": "Interested in AC rental"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Thank you! We will contact you soon.",
  "data": {
    "_id": "lead_id",
    "name": "John Doe",
    "phone": "1234567890",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Status Codes:**
- `201`: Created
- `400`: Validation error
- `500`: Server error

---

#### 10. Submit Contact Form
```
POST /api/contact
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "subject": "General Inquiry",
  "message": "I have a question about your services"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully"
}
```

**Status Codes:**
- `200`: Success
- `400`: Validation error
- `500`: Server error

---

#### 11. Submit Vendor Listing Request
```
POST /api/vendor-listing-request
```

**Request Body:**
```json
{
  "name": "Vendor Name",
  "phone": "1234567890",
  "email": "vendor@example.com",
  "message": "I want to list my products"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Request submitted successfully. We will contact you soon."
}
```

**Status Codes:**
- `201`: Created
- `400`: Validation error
- `500`: Server error

---

### Admin Product Management Endpoints

**All admin endpoints require authentication with `role: "admin"`**

#### 12. Get All Products (Admin)
```
GET /api/admin/products
```

**Query Parameters:**
- `category` (optional): Filter by category

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "product_id",
      "category": "AC",
      "name": "1 Ton 3 Star Convertible Inverter Split AC",
      "brand": "LG",
      "model": "LG123ABC",
      "capacity": "1 Ton",
      "type": "Split",
      "status": "Available",
      "price": {
        "monthly": 5000
      },
      "images": ["https://cloudinary.com/image1.jpg"],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `500`: Server error

---

#### 13. Create Product
```
POST /api/admin/products
```

**Request Body:**
```json
{
  "category": "AC",
  "name": "1 Ton 3 Star Convertible Inverter Split AC",
  "brand": "LG",
  "model": "LG123ABC",
  "capacity": "1 Ton",
  "type": "Split",
  "condition": "New",
  "description": "Product description",
  "location": "Mumbai, Maharashtra",
  "status": "Available",
  "discount": 5,
  "price": {
    "3": 15000,
    "6": 28000,
    "9": 40000,
    "11": 50000,
    "monthly": 5000
  },
  "images": ["https://cloudinary.com/image1.jpg", "https://cloudinary.com/image2.jpg"],
  "features": {
    "specs": ["Capacity/Size: 1T"],
    "dimensions": "950\"L x 290\"B x 375\"H",
    "safety": ["Period Maintenance"]
  },
  "energyRating": "",
  "operationType": "",
  "loadType": ""
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product added successfully",
  "data": {
    "_id": "product_id",
    "category": "AC",
    "name": "1 Ton 3 Star Convertible Inverter Split AC",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Status Codes:**
- `201`: Created
- `400`: Validation error
- `401`: Unauthorized
- `500`: Server error

---

#### 14. Update Product
```
PATCH /api/admin/products/:id
```

**Request Body:** (All fields optional, only send fields to update)
```json
{
  "name": "Updated Product Name",
  "status": "Rented Out",
  "price": {
    "monthly": 5500
  },
  "images": ["https://cloudinary.com/new-image.jpg"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "_id": "product_id",
    "name": "Updated Product Name",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Status Codes:**
- `200`: Success
- `400`: Validation error
- `401`: Unauthorized
- `404`: Product not found
- `500`: Server error

---

#### 15. Delete Product
```
DELETE /api/admin/products/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `404`: Product not found
- `500`: Server error

---

### Admin Service Management Endpoints

#### 16. Add Service
```
POST /api/admin/services
```

**Request Body:**
```json
{
  "title": "AC Repair Service",
  "description": "Professional AC repair",
  "price": 500,
  "originalPrice": 700,
  "badge": "Visit Within 1 Hour",
  "image": "https://cloudinary.com/service.jpg",
  "process": ["Step 1", "Step 2"],
  "benefits": ["Benefit 1", "Benefit 2"],
  "keyFeatures": ["Feature 1", "Feature 2"],
  "recommendedFrequency": "Every 3 months"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Service added successfully",
  "data": {
    "_id": "service_id",
    "title": "AC Repair Service",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Status Codes:**
- `201`: Created
- `400`: Validation error
- `401`: Unauthorized
- `500`: Server error

---

#### 17. Update Service
```
PATCH /api/admin/services/:id
```

**Request Body:** (All fields optional)
```json
{
  "title": "Updated Service Title",
  "price": 600
}
```

**Response:**
```json
{
  "success": true,
  "message": "Service updated successfully",
  "data": {
    "_id": "service_id",
    "title": "Updated Service Title"
  }
}
```

**Status Codes:**
- `200`: Success
- `400`: Validation error
- `401`: Unauthorized
- `404`: Service not found
- `500`: Server error

---

#### 18. Delete Service
```
DELETE /api/admin/services/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Service deleted successfully"
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `404`: Service not found
- `500`: Server error

---

### Admin Lead Management Endpoints

#### 19. Get Service Bookings (Leads)
```
GET /api/admin/service-bookings
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "booking_id",
      "serviceId": {
        "_id": "service_id",
        "title": "AC Repair Service"
      },
      "name": "John Doe",
      "phone": "1234567890",
      "email": "john@example.com",
      "address": "123 Main St",
      "preferredDate": "2024-01-15",
      "preferredTime": "10:00 AM",
      "description": "AC not cooling",
      "images": ["https://cloudinary.com/issue1.jpg"],
      "status": "New",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `500`: Server error

---

#### 20. Update Service Booking Status
```
PATCH /api/admin/service-bookings/:id
```

**Request Body:**
```json
{
  "status": "Contacted"
}
```

**Response:**
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

**Status Codes:**
- `200`: Success
- `400`: Invalid status
- `401`: Unauthorized
- `404`: Booking not found
- `500`: Server error

---

#### 21. Get Rental Inquiries
```
GET /api/admin/rental-inquiries
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "inquiry_id",
      "productId": "product_id",
      "productCategory": "AC",
      "name": "John Doe",
      "phone": "1234567890",
      "email": "john@example.com",
      "message": "I'm interested",
      "acDetails": {
        "brand": "LG",
        "model": "LG123ABC"
      },
      "status": "Pending",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `500`: Server error

---

#### 22. Update Rental Inquiry Status
```
PATCH /api/admin/rental-inquiries/:id
```

**Request Body:**
```json
{
  "status": "Contacted"
}
```

**Response:**
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

**Status Codes:**
- `200`: Success
- `400`: Invalid status
- `401`: Unauthorized
- `404`: Inquiry not found
- `500`: Server error

---

#### 23. Get Vendor Requests
```
GET /api/admin/vendor-requests
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "request_id",
      "name": "Vendor Name",
      "phone": "1234567890",
      "email": "vendor@example.com",
      "message": "I want to list products",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `500`: Server error

---

### User Endpoints

#### 24. Get User Orders
```
GET /api/users/:userId/orders
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "order_id",
      "userId": "user_id",
      "products": [
        {
          "productId": "product_id",
          "quantity": 1,
          "price": 5000
        }
      ],
      "total": 5000,
      "status": "Pending",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `403`: Forbidden (user can only view own orders)
- `500`: Server error

---

#### 25. Update User Profile
```
PATCH /api/users/profile
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Updated Name",
  "phone": "9876543210",
  "homeAddress": "New Address",
  "interestedIn": ["AC", "Refrigerator"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "user_id",
    "name": "Updated Name",
    "phone": "9876543210",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Status Codes:**
- `200`: Success
- `400`: Validation error
- `401`: Unauthorized
- `500`: Server error

---

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "message": "Error message describing what went wrong"
}
```

### HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

### Common Error Messages

- **Authentication Errors:**
  - `"Invalid email or password"`
  - `"Token expired"`
  - `"Unauthorized access"`

- **Validation Errors:**
  - `"Please fill all required fields"`
  - `"Invalid email format"`
  - `"Phone number must be 10 digits"`
  - `"Password must be at least 6 characters"`

- **Resource Errors:**
  - `"Product not found"`
  - `"Service not found"`
  - `"User already exists with this email"`

---

## Integration Notes

### 1. Image Upload
- Frontend uploads images to Cloudinary before sending to backend
- Backend receives image URLs (not files)
- First image in `images` array is the hero/primary image

### 2. Price Structure
- All products must have prices for: 3 months, 6 months, 9 months, 11 months, and monthly
- Prices are in Indian Rupees (₹)

### 3. Category-Specific Fields
- **Refrigerator**: `energyRating` (optional)
- **Washing Machine**: `operationType` and `loadType` (optional)
- **AC**: No additional fields

### 4. Status Values
- **Product Status**: `"Available"`, `"Rented Out"`, `"Under Maintenance"`
- **Service Booking Status**: `"New"`, `"Contacted"`, `"In-Progress"`, `"Resolved"`, `"Rejected"`
- **Rental Inquiry Status**: `"Pending"`, `"Contacted"`, `"Completed"`, `"Cancelled"`

### 5. Phone Number Format
- Frontend sends phone numbers as strings
- Format: 10 digits (e.g., "1234567890")
- Backend should validate and store as string

### 6. Date Format
- All dates should be in ISO 8601 format: `"2024-01-01T00:00:00.000Z"`
- Frontend displays dates in local format

### 7. Pagination (Future Enhancement)
- Currently, all endpoints return all results
- Consider adding pagination for large datasets:
  - Query params: `page`, `limit`
  - Response: Include `total`, `page`, `limit`, `totalPages`

### 8. Search & Filtering
- Product search supports: brand, model, location
- Filters: category, capacity, type, location, duration
- Backend should implement case-insensitive search

### 9. Backward Compatibility
- Keep `/api/admin/acs` endpoint working (can redirect to `/api/admin/products?category=AC`)
- Support both `acId` and `productId` in rental inquiries
- Support both `acDetails` and product reference in responses

### 10. Security Considerations
- Hash passwords using bcrypt (salt rounds: 10)
- Validate JWT tokens on all protected routes
- Check user role for admin endpoints
- Sanitize user inputs to prevent injection attacks
- Use HTTPS in production
- Implement rate limiting for API endpoints

---

## Testing Checklist

### Authentication
- [ ] Login with valid user credentials
- [ ] Login with valid admin credentials
- [ ] Login with invalid credentials
- [ ] Signup with new user
- [ ] Signup with existing email
- [ ] Forgot password with valid email
- [ ] Forgot password with invalid email

### Products
- [ ] Get all products (public)
- [ ] Get products by category
- [ ] Get product by ID
- [ ] Create product (admin)
- [ ] Update product (admin)
- [ ] Delete product (admin)
- [ ] Filter products by various criteria

### Services
- [ ] Get all services (public)
- [ ] Create service booking (public)
- [ ] Add service (admin)
- [ ] Update service (admin)
- [ ] Delete service (admin)

### Leads & Inquiries
- [ ] Create rental inquiry
- [ ] Create lead
- [ ] Submit contact form
- [ ] Submit vendor request
- [ ] Get service bookings (admin)
- [ ] Update service booking status (admin)
- [ ] Get rental inquiries (admin)
- [ ] Update rental inquiry status (admin)
- [ ] Get vendor requests (admin)

### Authorization
- [ ] Access admin endpoints without token
- [ ] Access admin endpoints with user token
- [ ] Access admin endpoints with admin token
- [ ] Access user endpoints with valid token
- [ ] Access user endpoints without token

---

## Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/rental-service

# JWT
JWT_SECRET=your-secret-key-here

# Cloudinary (if backend handles uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (for forgot password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

## Database Indexes

Recommended indexes for optimal performance:

```javascript
// User Model
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ role: 1 })

// Product Model
db.products.createIndex({ category: 1 })
db.products.createIndex({ status: 1 })
db.products.createIndex({ location: 1 })
db.products.createIndex({ brand: 1 })
db.products.createIndex({ createdAt: -1 })

// Service Booking Model
db.servicebookings.createIndex({ status: 1 })
db.servicebookings.createIndex({ createdAt: -1 })

// Rental Inquiry Model
db.rentalinquiries.createIndex({ productCategory: 1 })
db.rentalinquiries.createIndex({ status: 1 })
db.rentalinquiries.createIndex({ createdAt: -1 })
```

---

## Support & Contact

For questions or issues regarding API integration, please contact the development team.

**Last Updated:** January 2024
**Version:** 1.0.0

