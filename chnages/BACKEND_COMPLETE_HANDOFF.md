# Backend Developer Complete Handoff Document

**Project:** Rental Service Platform  
**Date:** [Current Date]  
**Frontend Status:** Complete and Ready for Integration  
**Priority:** High - Handover Required by Evening

---

## Table of Contents

1. [Overview](#overview)
2. [Admin Authentication](#admin-authentication)
3. [Service Categories Implementation](#service-categories-implementation)
4. [API Endpoints Summary](#api-endpoints-summary)
5. [Data Models & Schema Requirements](#data-models--schema-requirements)
6. [Critical Backend Tasks](#critical-backend-tasks)
7. [Testing Checklist](#testing-checklist)
8. [Known Issues & Notes](#known-issues--notes)
9. [Quick Start Guide](#quick-start-guide)

---

## Overview

This is a comprehensive handoff document for the backend developer to complete the remaining backend tasks for the Rental Service Platform. The frontend is complete and tested, but requires backend implementation for:

1. **Admin Authentication System** - Admin login with email/password
2. **Service Categories** - Category field for services with filtering support
3. **Service Data Structure** - Ensure services match frontend expectations

---

## Admin Authentication

### 1. Admin Credentials (URGENT)

**Default Admin Account Must Be Created:**
- **Email:** `admin@example.com`
- **Password:** `password123` (hashed using bcrypt)
- **Role:** `admin`

**Implementation Priority:** CRITICAL - Required for admin access

### 2. API Endpoint Required

#### POST `/api/auth/login`

**Unified Login Endpoint** - Must auto-detect admin vs user

**Request:**
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
    "id": "admin_id",
    "_id": "admin_id",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin",
    "phone": "optional_phone_number"
  }
}
```

**Response (401):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

### 3. User Model Requirements

```javascript
{
  _id: ObjectId,
  name: String (required),
  email: String (required, unique, indexed),
  password: String (hashed with bcrypt, required),
  role: String (enum: ['admin', 'user'], default: 'user', indexed),
  phone: String (optional, for OTP login),
  createdAt: Date,
  updatedAt: Date
}
```

### 4. Seed Script Required

Create a seed script to initialize the admin user:

```javascript
// scripts/seedAdmin.js
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('./models/User');

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create admin user
    const admin = new User({
      name: 'Admin User',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin'
    });

    await admin.save();
    console.log('Admin user created successfully');
    console.log('Email: admin@example.com');
    console.log('Password: password123');
  } catch (error) {
    console.error('Error seeding admin:', error);
  } finally {
    mongoose.connection.close();
  }
}

seedAdmin();
```

**Run:** `node scripts/seedAdmin.js`

**For detailed admin authentication requirements, see:** `BACKEND_ADMIN_AUTHENTICATION.md`

---

## Service Categories Implementation

### 1. Service Model Schema Update

**ADD `category` field to Service model:**

```javascript
{
  // ... existing fields ...
  category: {
    type: String,
    enum: [
      'Water Leakage Repair',
      'AC Gas Refilling',
      'AC Foam Wash',
      'AC Jet Wash Service',
      'AC Repair Inspection',
      'Split AC Installation'
    ],
    required: false, // Optional for backward compatibility
    index: true, // For efficient filtering
    default: null
  }
}
```

**Category Values (EXACT strings, case-sensitive):**
- `Water Leakage Repair`
- `AC Gas Refilling`
- `AC Foam Wash`
- `AC Jet Wash Service`
- `AC Repair Inspection`
- `Split AC Installation`

### 2. API Endpoint Updates

#### GET `/api/services`

**Add category filtering support:**

**Query Parameter:**
- `category` (string, optional): Filter services by exact category match

**Example:**
```
GET /api/services?category=AC%20Gas%20Refilling
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "service_id",
      "title": "AC Gas Refilling Service",
      "description": "...",
      "category": "AC Gas Refilling",
      "price": 1500,
      "image": "url"
    }
  ],
  "total": 1
}
```

**Backend Filtering Logic:**
```javascript
router.get('/services', async (req, res) => {
  try {
    const { category } = req.query;
    const query = {};
    
    if (category) {
      // Validate category
      const validCategories = [
        'Water Leakage Repair',
        'AC Gas Refilling',
        'AC Foam Wash',
        'AC Jet Wash Service',
        'AC Repair Inspection',
        'Split AC Installation'
      ];
      
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
        });
      }
      
      query.category = category;
    }
    
    const services = await Service.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: services, total: services.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

#### POST `/api/admin/services`

**Update to accept `category` field:**

**Request Body:**
```json
{
  "title": "AC Gas Refilling Service",
  "description": "...",
  "price": 1500,
  "category": "AC Gas Refilling",  // NEW FIELD
  "image": "url"
}
```

#### PATCH `/api/admin/services/:id`

**Update to accept `category` field:**

**Request Body:**
```json
{
  "category": "AC Gas Refilling"  // Can be updated
}
```

### 3. Validation Rules

**Category validation middleware:**

```javascript
const SERVICE_CATEGORIES = [
  'Water Leakage Repair',
  'AC Gas Refilling',
  'AC Foam Wash',
  'AC Jet Wash Service',
  'AC Repair Inspection',
  'Split AC Installation'
];

const validateCategory = (category) => {
  if (category && !SERVICE_CATEGORIES.includes(category)) {
    throw new Error(`Invalid category. Must be one of: ${SERVICE_CATEGORIES.join(', ')}`);
  }
  return true;
};
```

### 4. Migration for Existing Services

**Important:** When creating new services, ensure they have the `category` field set correctly. The frontend currently uses intelligent title matching as a fallback, but proper category fields will provide more accurate filtering.

**Migration Strategy (for existing services):**
1. Review existing services
2. Assign appropriate categories based on service titles
3. Update services in admin panel or via migration script

**For detailed service category requirements, see:** `SERVICE_CATEGORY_BACKEND_REQUIREMENTS.md`

---

## API Endpoints Summary

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/login` | Unified login (admin/user) | No |
| POST | `/api/auth/signup` | User registration | No |
| POST | `/api/auth/send-otp` | Send OTP to phone | No |
| POST | `/api/auth/verify-otp` | Verify OTP | No |
| POST | `/api/auth/forgot-password` | Request password reset | No |
| POST | `/api/auth/reset-password` | Reset password | No |

### Service Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/services` | Get all services (with category filter) | No |
| GET | `/api/services/:id` | Get service by ID | No |
| POST | `/api/admin/services` | Create service | Admin |
| PATCH | `/api/admin/services/:id` | Update service | Admin |
| DELETE | `/api/admin/services/:id` | Delete service | Admin |

### Product/AC Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/acs` | Get all products | No |
| GET | `/api/acs/:id` | Get product by ID | No |
| POST | `/api/admin/acs` | Create product | Admin |
| PATCH | `/api/admin/acs/:id` | Update product | Admin |
| DELETE | `/api/admin/acs/:id` | Delete product | Admin |

### Order Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/user/orders` | Get user orders | User |
| POST | `/api/user/orders` | Create order | User |
| GET | `/api/admin/orders` | Get all orders | Admin |
| PATCH | `/api/admin/orders/:id` | Update order status | Admin |

---

## Data Models & Schema Requirements

### User Model

```javascript
{
  _id: ObjectId,
  name: String (required),
  email: String (required, unique, indexed, lowercase),
  password: String (hashed, required),
  phone: String (optional, indexed for OTP login),
  role: String (enum: ['admin', 'user'], default: 'user', indexed),
  homeAddress: String (optional),
  nearLandmark: String (optional),
  alternateNumber: String (optional),
  pincode: String (optional),
  createdAt: Date,
  updatedAt: Date
}
```

### Service Model

```javascript
{
  _id: ObjectId,
  title: String (required),
  description: String (required),
  price: Number (required),
  originalPrice: Number (optional),
  image: String (required, URL),
  category: String (enum: SERVICE_CATEGORIES, optional, indexed),
  badge: String (optional, e.g., "Most Booked", "Visit Within 1 Hour"),
  process: Array<String> (optional),
  benefits: Array<String> (optional),
  keyFeatures: Array<String> (optional),
  recommendedFrequency: String (optional),
  status: String (enum: ['active', 'inactive'], default: 'active'),
  createdAt: Date,
  updatedAt: Date
}
```

### Product/AC Model

```javascript
{
  _id: ObjectId,
  name: String (required),
  brand: String (required),
  model: String (optional),
  category: String (enum: ['AC', 'Refrigerator', 'Washing Machine'], default: 'AC'),
  capacity: String (required),
  type: String (required, e.g., 'Split', 'Window', 'Portable'),
  condition: String (enum: ['New', 'Refurbished'], default: 'New'),
  description: String (required),
  location: String (required),
  price: {
    3: Number,
    6: Number,
    9: Number,
    11: Number,
    12: Number,
    24: Number
  },
  monthlyPrice: Number (optional, for monthly payment option),
  monthlyPaymentEnabled: Boolean (default: false),
  discount: Number (optional, percentage, e.g., 5),
  status: String (enum: ['Available', 'Rented Out'], default: 'Available'),
  heroImage: String (URL),
  images: Array<String> (URLs),
  features: {
    specs: Array<String>,
    dimensions: String,
    safety: Array<String>
  },
  installationCharges: {
    amount: Number,
    includedItems: Array<String>
  },
  energyRating: String (optional),
  createdAt: Date,
  updatedAt: Date
}
```

### Order Model

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', indexed),
  items: [{
    type: String (enum: ['rental', 'service']),
    productId: ObjectId (optional, for rentals),
    serviceId: ObjectId (optional, for services),
    quantity: Number,
    price: Number,
    duration: Number (for rentals),
    bookingDetails: Object (for services)
  }],
  totalAmount: Number,
  paymentDiscount: Number (5% if payNow),
  finalAmount: Number,
  paymentMethod: String (enum: ['payNow', 'payLater']),
  paymentStatus: String (enum: ['pending', 'paid', 'failed']),
  orderStatus: String (enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled']),
  shippingAddress: Object,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Critical Backend Tasks

### Priority 1: CRITICAL (Required for Handover)

1. **✅ Create Admin User**
   - Create seed script
   - Run seed script to create admin@example.com with password123
   - Verify admin can login via `/api/auth/login`

2. **✅ Implement Service Category Field**
   - Add `category` field to Service model
   - Update POST/PATCH endpoints to accept category
   - Add validation for category values
   - Create database index on category field

3. **✅ Update GET /api/services Endpoint**
   - Add category query parameter support
   - Implement filtering logic
   - Return filtered services when category is provided

### Priority 2: IMPORTANT (Should be done)

4. **✅ Admin Panel Category Dropdown**
   - Add category dropdown in service creation form
   - Add category dropdown in service edit form
   - Ensure category is saved/updated correctly

5. **✅ Service Data Review**
   - Review existing services
   - Assign appropriate categories to existing services
   - Ensure service data structure matches frontend expectations

### Priority 3: NICE TO HAVE

6. **Service Migration Script**
   - Create script to auto-assign categories based on titles
   - Allow manual review and correction

---

## Testing Checklist

### Admin Authentication

- [ ] Admin user exists in database (admin@example.com / password123)
- [ ] Can login via POST `/api/auth/login` with admin credentials
- [ ] Login returns correct user object with role: 'admin'
- [ ] Login returns JWT token
- [ ] Token can be used to access admin-only endpoints
- [ ] Invalid credentials return 401 error

### Service Categories

- [ ] Service model has `category` field
- [ ] Category field accepts valid enum values
- [ ] Category field rejects invalid values (400 error)
- [ ] GET `/api/services` returns all services without category filter
- [ ] GET `/api/services?category=AC Gas Refilling` returns only matching services
- [ ] POST `/api/admin/services` accepts and saves category
- [ ] PATCH `/api/admin/services/:id` can update category
- [ ] Category field is indexed in database

### Integration Testing

- [ ] Frontend can login as admin
- [ ] Frontend can filter services by category
- [ ] Frontend displays correct service counts per category
- [ ] Admin panel can create/edit services with category
- [ ] All services are properly categorized

---

## Known Issues & Notes

### 1. Service Filtering

**Current Status:** Frontend has intelligent title-based matching as fallback, but proper `category` field in database is preferred for accurate filtering.

**Action Required:** Ensure all services have correct `category` field set when creating/updating services.

### 2. Admin Login

**Current Status:** Frontend is ready, waiting for backend implementation.

**Action Required:** Create admin user and ensure login endpoint works correctly.

### 3. Service Category Values

**IMPORTANT:** Category values must match EXACTLY (case-sensitive):
- `Water Leakage Repair` (not "water leakage repair")
- `AC Gas Refilling` (not "Ac Gas Refilling")
- etc.

### 4. Frontend API Base URL

**Current:** `http://localhost:5000/api` (development)  
**Production:** Update to production URL when deploying

**File:** `src/services/api.js` (line 5)

---

## Quick Start Guide

### Step 1: Set Up Admin User

```bash
# Create seed script
# Run: node scripts/seedAdmin.js
# Verify admin can login
```

### Step 2: Update Service Model

```javascript
// Add category field to Service schema
category: {
  type: String,
  enum: ['Water Leakage Repair', 'AC Gas Refilling', ...],
  required: false,
  index: true
}
```

### Step 3: Update Service Endpoints

```javascript
// GET /api/services - Add category filter
// POST /api/admin/services - Accept category
// PATCH /api/admin/services/:id - Accept category
```

### Step 4: Test Integration

1. Login as admin via frontend (`/admin/login`)
2. Create a service with category
3. Test category filtering on `/service-request` page
4. Verify counts match correctly

---

## Additional Documentation

- **Admin Authentication Details:** See `BACKEND_ADMIN_AUTHENTICATION.md`
- **Service Categories Details:** See `SERVICE_CATEGORY_BACKEND_REQUIREMENTS.md`
- **API Documentation:** See `docs/API.md`
- **OTP Login Implementation:** See `OTP_LOGIN_IMPLEMENTATION.md`

---

## Support & Questions

If you encounter any issues or need clarification:

1. Check the detailed documentation files referenced above
2. Review frontend code in `src/services/api.js` for expected API responses
3. Check frontend service filtering logic in `src/pages/user/ServiceRequest.js`

---

## Handover Checklist

Before final handover, ensure:

- [ ] Admin user created and login works
- [ ] Service category field implemented
- [ ] Category filtering works via API
- [ ] Admin panel can set/update categories
- [ ] All existing services have categories assigned (or null is acceptable)
- [ ] Frontend integration tested and working
- [ ] All endpoints return data in expected format

---

**Document Version:** 1.0  
**Status:** Ready for Backend Implementation  
**Priority:** CRITICAL - Handover Required by Evening

---

**Note:** The frontend is complete and tested. Once the backend tasks above are completed, the entire system will be fully functional.

