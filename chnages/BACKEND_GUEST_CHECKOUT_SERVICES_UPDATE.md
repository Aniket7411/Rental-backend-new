# Backend Updates Required: Guest Checkout for Services & Address Validation

## Overview
This document outlines the backend changes required to support guest checkout for **both rentals AND services**, with mandatory address collection before order placement. The goal is to eliminate friction in the checkout process and ensure customers can place orders without signup/login barriers.

## Current Issues
1. Guest checkout currently works for rentals but not fully for services
2. Address collection is optional, but admin needs address to provide service/delivery
3. If user tries to login without registration, OTP fails with "number not registered"
4. Customer experience is broken when trying to place service orders

## Required Backend Changes

### 1. OTP Signup/Login Flow - Handle Both New and Existing Users

**Current Problem:** When a user tries to login with OTP but hasn't registered, the system returns "number not registered" error.

**Required Fix:** The OTP signup endpoint should handle both scenarios:
- **New User:** Create account automatically with phone number, name, email (optional), and address
- **Existing User:** Login the user and update their profile with provided information

**API Endpoint:** `POST /auth/send-signup-otp`

**Request Body:**
```json
{
  "phone": "+91XXXXXXXXXX",
  "name": "Customer Name",
  "email": "customer@email.com" // Optional
}
```

**Expected Behavior:**
- If phone number is **not registered**: Send OTP and prepare to create new account
- If phone number **is already registered**: Send OTP and prepare to login (don't fail with "not registered" error)
- Email should be optional - don't fail if email is provided but not registered

**API Endpoint:** `POST /auth/verify-signup-otp`

**Request Body:**
```json
{
  "phone": "+91XXXXXXXXXX",
  "otp": "123456",
  "sessionId": "session_id_from_send_otp",
  "userData": {
    "name": "Customer Name",
    "email": "customer@email.com", // Optional
    "homeAddress": "Complete address here" // MANDATORY for guest checkout
  }
}
```

**Expected Behavior:**
- If phone number is **not registered**: Create new user account with provided data
- If phone number **is already registered**: 
  - Login the user
  - Update user profile with provided information (name, email if provided, address)
  - Return user object and token

**Response:**
```json
{
  "success": true,
  "token": "jwt_token",
  "user": {
    "id": "user_id",
    "name": "Customer Name",
    "phone": "+91XXXXXXXXXX",
    "email": "customer@email.com",
    "homeAddress": "Complete address here",
    "address": {
      "homeAddress": "Complete address here",
      "nearLandmark": "",
      "pincode": "",
      "alternateNumber": ""
    },
    "role": "user"
  }
}
```

### 2. Order Creation - Support Guest Checkout for Services

**Current Issue:** Orders for services may fail if user is not fully registered or address is missing.

**API Endpoint:** `POST /api/orders`

**Required Changes:**
1. **Accept orders from guest users** (users created via guest checkout)
2. **Validate address is present** for both rentals and services before creating order
3. **Ensure service booking details include complete address**

**Order Data Structure:**
```json
{
  "orderId": "ORD-2024-001",
  "items": [
    {
      "type": "rental",
      "productId": "product_id",
      "quantity": 1,
      "price": 5000,
      "duration": 3,
      "deliveryInfo": {
        "address": "Complete delivery address",
        "contactName": "Customer Name",
        "contactPhone": "+91XXXXXXXXXX",
        "pincode": "123456"
      }
    },
    {
      "type": "service",
      "serviceId": "service_id",
      "quantity": 1,
      "price": 1500,
      "bookingDetails": {
        "name": "Customer Name",
        "phone": "+91XXXXXXXXXX",
        "address": "Complete service address", // MANDATORY
        "preferredDate": "2024-01-20",
        "preferredTime": "10-12",
        "contactName": "Customer Name",
        "contactPhone": "+91XXXXXXXXXX"
      }
    }
  ],
  "customerInfo": {
    "userId": "user_id",
    "name": "Customer Name",
    "phone": "+91XXXXXXXXXX",
    "email": "customer@email.com", // Optional
    "address": {
      "homeAddress": "Complete address",
      "pincode": "123456"
    }
  },
  "deliveryAddresses": [
    {
      "type": "rental",
      "address": "Complete delivery address",
      "contactName": "Customer Name",
      "contactPhone": "+91XXXXXXXXXX"
    },
    {
      "type": "service",
      "address": "Complete service address", // MANDATORY
      "contactName": "Customer Name",
      "contactPhone": "+91XXXXXXXXXX",
      "preferredDate": "2024-01-20",
      "preferredTime": "10-12"
    }
  ],
  "total": 6500,
  "finalTotal": 6000,
  "paymentOption": "payNow" // or "payLater", "payAdvance"
}
```

**Validation Rules:**
1. **For rentals:** `customerInfo.address.homeAddress` must be present
2. **For services:** Each service item must have `bookingDetails.address` present
3. **Contact information:** Name and phone must be present for all items

**Error Response (if validation fails):**
```json
{
  "success": false,
  "message": "Address is required for service delivery. Please provide complete address.",
  "errors": {
    "address": "Address is mandatory for service orders"
  }
}
```

### 3. User Profile Update - Handle Address Updates

**API Endpoint:** `PUT /api/users/profile` or `PATCH /api/users/profile`

**Required:** When user updates profile during guest checkout, ensure address is saved properly.

**Request Body:**
```json
{
  "name": "Customer Name",
  "email": "customer@email.com",
  "homeAddress": "Complete address",
  "address": {
    "homeAddress": "Complete address",
    "nearLandmark": "Near landmark",
    "pincode": "123456",
    "alternateNumber": "9876543210"
  }
}
```

**Expected Behavior:**
- Update user profile with provided address
- If user doesn't exist, this should not be called (user should be created via signup OTP)
- Return updated user object

### 4. Service Booking Details Validation

**When service is added to cart:**
- Frontend collects: date, time, address, contact name, contact phone
- Backend should validate these are present when order is created

**When order is created with services:**
- Ensure `bookingDetails.address` is not empty
- Ensure `bookingDetails.contactName` and `bookingDetails.contactPhone` are present
- Store complete booking details in order for admin reference

## Database Schema Updates

### Orders Collection
Ensure order schema supports:
- `deliveryAddresses[]` array with both rental and service addresses
- `items[].bookingDetails.address` for services
- `customerInfo.address` for rentals

### Users Collection
Ensure user schema supports:
- `homeAddress` field (string)
- `address` object with:
  - `homeAddress` (string, required)
  - `nearLandmark` (string, optional)
  - `pincode` (string, optional)
  - `alternateNumber` (string, optional)

## Error Handling

### OTP Signup/Login Errors
- **Phone number not registered:** Should NOT be an error - create account automatically
- **Invalid OTP:** Return clear error message
- **OTP expired:** Return clear error message with option to resend

### Order Creation Errors
- **Missing address for rentals:** Return error: "Delivery address is required for rental products"
- **Missing address for services:** Return error: "Service address is required. Please provide complete address where service will be provided"
- **Missing contact information:** Return error: "Contact name and phone are required"

## Testing Checklist

### Guest Checkout Flow
- [ ] New user can place rental order without prior registration
- [ ] New user can place service order without prior registration
- [ ] Existing user can place order via guest checkout (should login and update profile)
- [ ] Address is collected and validated before order placement
- [ ] OTP verification works for both new and existing users

### Order Creation
- [ ] Order with rentals validates delivery address
- [ ] Order with services validates service address
- [ ] Order with both rentals and services validates both addresses
- [ ] Missing address returns appropriate error message

### User Account Creation
- [ ] New user account created automatically after OTP verification
- [ ] User profile includes address from guest checkout
- [ ] Existing user profile updated with new address if provided

## API Response Examples

### Successful Guest Checkout OTP Send
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "sessionId": "session_123456"
}
```

### Successful Guest Checkout OTP Verify (New User)
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "name": "John Doe",
    "phone": "+919876543210",
    "email": "john@example.com",
    "homeAddress": "123 Main Street, City, State 123456",
    "address": {
      "homeAddress": "123 Main Street, City, State 123456",
      "pincode": "123456"
    },
    "role": "user",
    "createdAt": "2024-01-20T10:00:00Z"
  }
}
```

### Successful Guest Checkout OTP Verify (Existing User)
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "name": "John Doe Updated",
    "phone": "+919876543210",
    "email": "john@example.com",
    "homeAddress": "456 New Street, City, State 654321",
    "address": {
      "homeAddress": "456 New Street, City, State 654321",
      "pincode": "654321"
    },
    "role": "user",
    "updatedAt": "2024-01-20T11:00:00Z"
  }
}
```

### Order Creation Success
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "orderId": "ORD-2024-001",
    "status": "pending",
    "paymentStatus": "pending",
    "finalTotal": 6000,
    "createdAt": "2024-01-20T10:00:00Z"
  }
}
```

### Order Creation Error (Missing Address)
```json
{
  "success": false,
  "message": "Service address is required. Please provide complete address where service will be provided.",
  "errors": {
    "address": "Address is mandatory for service orders"
  }
}
```

## Priority

**HIGH PRIORITY** - This directly impacts customer conversion and sales. Customers are currently unable to place service orders smoothly, leading to lost sales.

## Implementation Notes

1. **Backward Compatibility:** Ensure existing registered users can still login and place orders normally
2. **Security:** OTP verification must be properly validated to prevent unauthorized access
3. **Data Integrity:** Ensure address data is properly stored and accessible for admin order management
4. **Error Messages:** Provide clear, user-friendly error messages that guide customers to fix issues

## Questions for Backend Team

1. Can the OTP signup endpoint handle both new user creation and existing user login?
2. Is there a way to check if a phone number is registered without failing the request?
3. How should we handle email conflicts (if email is provided but belongs to another account)?
4. Should we create a separate "guest" user type or use the existing "user" role?

## Frontend Changes Summary

The frontend has been updated to:
1. Make address mandatory in GuestCheckoutOTP component
2. Validate address before order placement in Checkout page
3. Support guest checkout for both rentals and services
4. Collect Name, Phone, and Address before placing order

Backend must support these frontend changes to ensure seamless customer experience.

