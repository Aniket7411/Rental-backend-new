# Backend Updates Required

This document outlines all the backend changes and API endpoints needed to support the frontend implementation.

## Table of Contents
1. [User Authentication](#user-authentication)
2. [User Management](#user-management)
3. [Product Management](#product-management)
4. [Cart & Wishlist](#cart--wishlist)
5. [Orders Management](#orders-management)
6. [Payment Processing](#payment-processing)
7. [Service Requests](#service-requests)
8. [Database Schema](#database-schema)

---

## User Authentication

### Endpoints Required

#### 1. User Signup
```
POST /api/users/signup
```

**Request Body:**
```json
{
  "name": "string (required)",
  "email": "string (required, unique)",
  "password": "string (required, min 6 characters)",
  "phone": "string (required, min 10 digits)",
  "homeAddress": "string (required)",
  "interestedIn": ["AC", "Refrigerator", "Washing Machine"],
  "role": "user" // default
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "phone": "1234567890",
    "homeAddress": "Full Address",
    "interestedIn": ["AC", "Refrigerator"],
    "role": "user"
  }
}
```

#### 2. User Login
```
POST /api/users/login
```

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "user"
  }
}
```

#### 3. Forgot Password
```
POST /api/users/forgot-password
```

**Request Body:**
```json
{
  "email": "string (required)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset link sent to your email"
}
```

#### 4. Reset Password
```
POST /api/users/reset-password
```

**Request Body:**
```json
{
  "token": "reset_token",
  "newPassword": "string (required, min 6 characters)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

## User Management

### Endpoints Required

#### 1. Get User Profile
```
GET /api/users/profile
Headers: Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "phone": "1234567890",
    "homeAddress": "Full Address",
    "interestedIn": ["AC", "Refrigerator", "Washing Machine"],
    "role": "user",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 2. Update User Profile
```
PATCH /api/users/profile
Headers: Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "name": "string (optional)",
  "phone": "string (optional)",
  "homeAddress": "string (optional)",
  "interestedIn": ["AC", "Refrigerator"] // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": { /* updated user object */ }
}
```

---

## Product Management

### Endpoints Required

#### 1. Get Products (with filtering)
```
GET /api/products
Query Parameters:
  - category: "AC" | "Refrigerator" | "Washing Machine"
  - search: string (search in name, brand, model)
  - brand: string
  - capacity: string (e.g., "1 Ton", "190 L", "6.5 kg")
  - type: string (e.g., "Split", "Automatic", "Single Door")
  - location: string
  - duration: "3" | "6" | "9" | "11" | "monthly"
  - minPrice: number
  - maxPrice: number
  - page: number (default: 1)
  - limit: number (default: 20)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "product_id",
      "category": "AC" | "Refrigerator" | "Washing Machine",
      "name": "1 Ton 3 Star Convertible Inverter Split AC",
      "brand": "LG",
      "model": "Model XYZ",
      "type": "Refurbished" | "New",
      "capacity": "1 Ton" | "190 L" | "6.5 kg",
      "location": "Mumbai",
      "price": {
        "3": 5000,
        "6": 4500,
        "9": 4000,
        "11": 3800,
        "monthly": 5000
      },
      "discount": 5,
      "images": ["url1", "url2"],
      "features": {
        "specs": [
          "Capacity/Size: 1T",
          "Convertible 5 in 1 Modes",
          "2 Way Swing"
        ],
        "dimensions": "950\"L x 290\"B x 375\"H",
        "safety": [
          "Period Maintenance",
          "Ensure electrical hazards & potential fire risks"
        ]
      },
      "reviews": [
        {
          "userId": "user_id",
          "rating": 5,
          "comment": "Great product!",
          "createdAt": "2024-01-01"
        }
      ],
      "averageRating": 4.5,
      "totalReviews": 10,
      "status": "Available" | "Rented Out",
      "createdAt": "2024-01-01"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

#### 2. Get Product by ID
```
GET /api/products/:id
```

**Response:**
```json
{
  "success": true,
  "data": { /* product object with full details */ }
}
```

#### 3. Create Product (Admin)
```
POST /api/admin/products
Headers: Authorization: Bearer {admin_token}
```

**Request Body:**
```json
{
  "category": "AC" | "Refrigerator" | "Washing Machine",
  "name": "string (required)",
  "brand": "string (required)",
  "model": "string",
  "type": "Refurbished" | "New",
  "capacity": "string (required)",
  "location": "string (required)",
  "price": {
    "3": number,
    "6": number,
    "9": number,
    "11": number,
    "monthly": number
  },
  "discount": number (percentage, default: 0),
  "images": ["url1", "url2"],
  "features": {
    "specs": ["string"],
    "dimensions": "string",
    "safety": ["string"]
  },
  "status": "Available"
}
```

**Category-Specific Fields:**

**For AC:**
- `capacity`: "1 Ton" | "1.5 Ton" | "2 Ton" | "2.5 Ton"
- `type`: "Split" | "Window" | "Refurbished" | "New"

**For Refrigerator:**
- `capacity`: "190 L" | "210 L" | "240 L" | "280 L" | "300 L+"
- `type`: "Single Door" | "Double Door" | "Refurbished" | "New"
- `energyRating`: "2 Star" | "3 Star" | "4 Star" | "5 Star"

**For Washing Machine:**
- `capacity`: "5.8 kg" | "6.5 kg" | "7 kg" | "8 kg" | "10 kg+"
- `operationType`: "Automatic" | "Semi-Automatic"
- `loadType`: "Top Load" | "Front Load"
- `type`: "Refurbished" | "New"

#### 4. Update Product (Admin)
```
PATCH /api/admin/products/:id
Headers: Authorization: Bearer {admin_token}
```

#### 5. Delete Product (Admin)
```
DELETE /api/admin/products/:id
Headers: Authorization: Bearer {admin_token}
```

---

## Cart & Wishlist

### Endpoints Required

#### 1. Get User Cart
```
GET /api/users/cart
Headers: Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cart_item_id",
      "productId": "product_id",
      "product": { /* full product object */ },
      "quantity": 1,
      "selectedTenure": "6",
      "createdAt": "2024-01-01"
    }
  ]
}
```

#### 2. Add to Cart
```
POST /api/users/cart
Headers: Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "productId": "product_id (required)",
  "quantity": 1,
  "selectedTenure": "6"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Item added to cart",
  "data": { /* cart item object */ }
}
```

#### 3. Update Cart Item
```
PATCH /api/users/cart/:itemId
Headers: Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "quantity": 2,
  "selectedTenure": "9"
}
```

#### 4. Remove from Cart
```
DELETE /api/users/cart/:itemId
Headers: Authorization: Bearer {token}
```

#### 5. Clear Cart
```
DELETE /api/users/cart
Headers: Authorization: Bearer {token}
```

#### 6. Get User Wishlist
```
GET /api/users/wishlist
Headers: Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "wishlist_item_id",
      "productId": "product_id",
      "product": { /* full product object */ },
      "createdAt": "2024-01-01"
    }
  ]
}
```

#### 7. Add to Wishlist
```
POST /api/users/wishlist
Headers: Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "productId": "product_id (required)"
}
```

#### 8. Remove from Wishlist
```
DELETE /api/users/wishlist/:itemId
Headers: Authorization: Bearer {token}
```

---

## Orders Management

### Endpoints Required

#### 1. Get User Orders
```
GET /api/users/:userId/orders
Headers: Authorization: Bearer {token}
Query Parameters:
  - status: "Pending" | "Processing" | "Completed" | "Cancelled"
  - page: number
  - limit: number
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "order_id",
      "orderId": "ORD-2024-001",
      "userId": "user_id",
      "items": [
        {
          "productId": "product_id",
          "product": { /* product snapshot */ },
          "quantity": 1,
          "price": 5000,
          "tenure": "6",
          "rentalStartDate": "2024-01-01",
          "rentalEndDate": "2024-07-01"
        }
      ],
      "totalAmount": 5000,
      "paymentMethod": "full" | "advance",
      "paymentStatus": "Pending" | "Partial" | "Completed",
      "paidAmount": 0,
      "remainingAmount": 5000,
      "status": "Pending" | "Processing" | "Completed" | "Cancelled",
      "shippingAddress": "Full Address",
      "createdAt": "2024-01-01",
      "updatedAt": "2024-01-01"
    }
  ],
  "total": 10
}
```

#### 2. Get Order by ID
```
GET /api/users/orders/:orderId
Headers: Authorization: Bearer {token}
```

#### 3. Create Order
```
POST /api/users/orders
Headers: Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "items": [
    {
      "productId": "product_id",
      "quantity": 1,
      "tenure": "6",
      "rentalStartDate": "2024-01-01"
    }
  ],
  "paymentMethod": "full" | "advance",
  "shippingAddress": "Full Address",
  "paymentDetails": {
    "amount": 5000,
    "transactionId": "txn_123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "id": "order_id",
    "orderId": "ORD-2024-001",
    "totalAmount": 5000,
    "status": "Pending"
  }
}
```

#### 4. Update Order Status
```
PATCH /api/admin/orders/:orderId
Headers: Authorization: Bearer {admin_token}
```

**Request Body:**
```json
{
  "status": "Processing" | "Completed" | "Cancelled"
}
```

---

## Payment Processing

### Endpoints Required

#### 1. Initiate Payment
```
POST /api/payments/initiate
Headers: Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "orderId": "order_id",
  "amount": 5000,
  "paymentMethod": "full" | "advance",
  "paymentGateway": "razorpay" | "stripe" | "payu"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "payment_id",
    "orderId": "order_id",
    "amount": 5000,
    "currency": "INR",
    "gatewayOrderId": "gateway_order_id",
    "paymentLink": "https://payment-link.com"
  }
}
```

#### 2. Verify Payment
```
POST /api/payments/verify
Headers: Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "paymentId": "payment_id",
  "transactionId": "transaction_id",
  "signature": "signature"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "paymentId": "payment_id",
    "status": "Completed",
    "orderId": "order_id"
  }
}
```

#### 3. Payment Options Calculation
```
POST /api/payments/calculate
Headers: Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "orderId": "order_id",
  "paymentMethod": "full" | "advance"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalAmount": 10000,
    "discount": 5,
    "discountAmount": 500,
    "finalAmount": 9500,
    "advanceAmount": 999,
    "remainingAmount": 9001
  }
}
```

---

## Service Requests

### Endpoints Required

#### 1. Get User Service Requests
```
GET /api/users/service-requests
Headers: Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "request_id",
      "userId": "user_id",
      "serviceType": "Repair" | "Maintenance" | "Installation",
      "productType": "AC" | "Refrigerator" | "Washing Machine",
      "brand": "LG",
      "model": "Model XYZ",
      "description": "Issue description",
      "address": "Service address",
      "preferredDate": "2024-01-15",
      "preferredTime": "10:00 AM",
      "status": "Pending" | "Assigned" | "In Progress" | "Completed" | "Cancelled",
      "assignedTo": "technician_id",
      "createdAt": "2024-01-01",
      "updatedAt": "2024-01-01"
    }
  ]
}
```

#### 2. Create Service Request
```
POST /api/users/service-requests
Headers: Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "serviceType": "Repair" | "Maintenance" | "Installation",
  "productType": "AC" | "Refrigerator" | "Washing Machine",
  "brand": "string",
  "model": "string",
  "description": "string (required)",
  "address": "string (required)",
  "preferredDate": "YYYY-MM-DD",
  "preferredTime": "HH:MM"
}
```

#### 3. Update Service Request Status (Admin)
```
PATCH /api/admin/service-requests/:requestId
Headers: Authorization: Bearer {admin_token}
```

**Request Body:**
```json
{
  "status": "Assigned" | "In Progress" | "Completed" | "Cancelled",
  "assignedTo": "technician_id"
}
```

---

## Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  name: String (required),
  email: String (required, unique, indexed),
  password: String (hashed, required),
  phone: String (required),
  homeAddress: String (required),
  interestedIn: [String], // ["AC", "Refrigerator", "Washing Machine"]
  role: String (enum: ["user", "admin", "vendor"], default: "user"),
  createdAt: Date,
  updatedAt: Date
}
```

### Products Collection
```javascript
{
  _id: ObjectId,
  category: String (enum: ["AC", "Refrigerator", "Washing Machine"], required, indexed),
  name: String (required),
  brand: String (required, indexed),
  model: String,
  type: String, // "Refurbished" | "New" | "Split" | "Window" | etc.
  capacity: String (required), // "1 Ton" | "190 L" | "6.5 kg"
  location: String (required, indexed),
  price: {
    3: Number,
    6: Number,
    9: Number,
    11: Number,
    monthly: Number
  },
  discount: Number (default: 0), // percentage
  images: [String],
  features: {
    specs: [String],
    dimensions: String,
    safety: [String]
  },
  // Category-specific fields
  energyRating: String, // For Refrigerator
  operationType: String, // For Washing Machine
  loadType: String, // For Washing Machine
  reviews: [{
    userId: ObjectId,
    rating: Number (1-5),
    comment: String,
    createdAt: Date
  }],
  averageRating: Number,
  totalReviews: Number,
  status: String (enum: ["Available", "Rented Out"], default: "Available", indexed),
  createdAt: Date,
  updatedAt: Date
}
```

### Cart Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (required, indexed),
  productId: ObjectId (required, indexed),
  quantity: Number (default: 1),
  selectedTenure: String, // "3" | "6" | "9" | "11" | "monthly"
  createdAt: Date,
  updatedAt: Date
}
```

### Wishlist Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (required, indexed),
  productId: ObjectId (required, indexed),
  createdAt: Date
}
// Unique index on (userId, productId)
```

### Orders Collection
```javascript
{
  _id: ObjectId,
  orderId: String (unique, indexed), // "ORD-2024-001"
  userId: ObjectId (required, indexed),
  items: [{
    productId: ObjectId,
    productSnapshot: Object, // Store product details at time of order
    quantity: Number,
    price: Number,
    tenure: String,
    rentalStartDate: Date,
    rentalEndDate: Date
  }],
  totalAmount: Number (required),
  paymentMethod: String (enum: ["full", "advance"]),
  paymentStatus: String (enum: ["Pending", "Partial", "Completed"]),
  paidAmount: Number (default: 0),
  remainingAmount: Number,
  status: String (enum: ["Pending", "Processing", "Completed", "Cancelled"], default: "Pending", indexed),
  shippingAddress: String (required),
  paymentDetails: {
    paymentId: String,
    transactionId: String,
    gateway: String,
    paidAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Service Requests Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (required, indexed),
  serviceType: String (enum: ["Repair", "Maintenance", "Installation"]),
  productType: String (enum: ["AC", "Refrigerator", "Washing Machine"]),
  brand: String,
  model: String,
  description: String (required),
  address: String (required),
  preferredDate: Date,
  preferredTime: String,
  status: String (enum: ["Pending", "Assigned", "In Progress", "Completed", "Cancelled"], default: "Pending", indexed),
  assignedTo: ObjectId, // technician_id
  technicianNotes: String,
  completedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Payments Collection
```javascript
{
  _id: ObjectId,
  paymentId: String (unique, indexed),
  orderId: ObjectId (required, indexed),
  userId: ObjectId (required, indexed),
  amount: Number (required),
  currency: String (default: "INR"),
  paymentMethod: String (enum: ["full", "advance"]),
  paymentGateway: String,
  gatewayOrderId: String,
  transactionId: String,
  status: String (enum: ["Pending", "Completed", "Failed", "Refunded"]),
  signature: String,
  paidAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Authentication & Authorization

### JWT Token Structure
```json
{
  "userId": "user_id",
  "email": "user@example.com",
  "role": "user" | "admin" | "vendor",
  "iat": 1234567890,
  "exp": 1234654290
}
```

### Middleware Required
1. **Authentication Middleware**: Verify JWT token
2. **Authorization Middleware**: Check user role (admin, vendor, user)
3. **Rate Limiting**: Prevent abuse
4. **Input Validation**: Validate request bodies
5. **Error Handling**: Consistent error responses

---

## Error Response Format

All error responses should follow this format:

```json
{
  "success": false,
  "message": "Error message here",
  "error": "ERROR_CODE",
  "details": {} // optional
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Invalid input data
- `UNAUTHORIZED`: Missing or invalid token
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `DUPLICATE_ENTRY`: Resource already exists
- `SERVER_ERROR`: Internal server error

---

## Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/rental-service

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Payment Gateways
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Email Service (for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## Implementation Priority

### Phase 1 (Critical - Week 1)
1. User Authentication (Signup, Login, Forgot Password)
2. Product Management (CRUD operations)
3. Cart & Wishlist (Basic operations)

### Phase 2 (Important - Week 2)
1. Orders Management
2. Payment Integration
3. Service Requests

### Phase 3 (Enhancement - Week 3)
1. Reviews & Ratings
2. Advanced Filtering
3. Analytics & Reporting

---

## Testing Requirements

### Unit Tests
- All API endpoints
- Business logic functions
- Utility functions

### Integration Tests
- Authentication flow
- Order creation flow
- Payment processing flow

### API Testing
- Use Postman collection (already available in `/docs/postman_collection.json`)
- Test all endpoints with valid and invalid data
- Test authentication and authorization

---

## Notes

1. **Security**: Always hash passwords using bcrypt (minimum 10 rounds)
2. **Validation**: Validate all inputs on the backend, don't trust frontend
3. **Error Handling**: Never expose sensitive error details to clients
4. **Rate Limiting**: Implement rate limiting on authentication endpoints
5. **CORS**: Configure CORS properly for frontend domain
6. **File Uploads**: Use Cloudinary or similar service for product images
7. **Pagination**: Implement pagination for all list endpoints
8. **Search**: Consider implementing full-text search for products
9. **Caching**: Cache frequently accessed data (product lists, user profiles)
10. **Logging**: Implement proper logging for debugging and monitoring

---

## Additional Features to Consider

1. **Email Notifications**: Order confirmations, service request updates
2. **SMS Notifications**: Order status updates
3. **Push Notifications**: Mobile app support
4. **Admin Dashboard**: Analytics, reports, user management
5. **Vendor Portal**: For vendors to manage their products
6. **Review System**: Product reviews and ratings
7. **Recommendation Engine**: Suggest products based on user preferences
8. **Inventory Management**: Track product availability
9. **Rental History**: Track rental periods and renewals
10. **Loyalty Program**: Rewards for frequent customers

---

**Last Updated**: 2024-01-XX
**Version**: 1.0.0

