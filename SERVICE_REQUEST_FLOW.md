# Service Request Flow Documentation

## Overview

This document describes the complete service request flow for both **frontend** and **backend**. The flow ensures that service bookings go through a proper checkout process (similar to rental products) rather than being created directly.

---

## Frontend Flow

### 1. Service Selection
**Location:** Multiple pages (Home, ServiceRequest, ServiceCard)

**User Action:** User clicks "Book Service" or "Add" button on a service

**Code Flow:**
- User clicks button → `ServiceBookingModal` opens
- Modal collects booking details (date, time, address, contact info)

### 2. Service Booking Modal (`ServiceBookingModal.js`)

**Two Modes:**

#### A. New Booking Mode (Default)
- **When:** No `initialData` provided
- **Action:** Adds service to cart with booking details
- **Code:**
  ```javascript
  addServiceToCart(service, bookingDetails);
  ```
- **Result:** Service item added to cart with `type: 'service'` and `bookingDetails` object

#### B. Edit Mode (Cart Page)
- **When:** `initialData` and `onSubmit` prop provided
- **Action:** Updates existing cart item via `onSubmit` handler
- **Code:**
  ```javascript
  await onSubmit(bookingDetails);
  ```
- **Result:** Existing cart item's booking details updated

**Booking Details Structure:**
```javascript
{
  name: string,
  phone: string,
  preferredDate: string, // ISO date format
  preferredTime: string, // "10-12", "12-2", "2-4", "4-6", "6-8"
  address: string,
  addressType: "myself" | "someoneElse",
  contactName: string,
  contactPhone: string,
  date: string, // Alias for preferredDate
  time: string, // Alias for preferredTime
}
```

### 3. Cart Page (`Cart.js`)

**User Action:** User reviews cart items

**Service Items in Cart:**
- Display service details (title, price, image)
- Display booking details (date, time, address, contact)
- Allow editing booking details via `ServiceBookingModal` in edit mode
- "Proceed to Checkout" button navigates to `/checkout`

**Cart Item Structure (Service):**
```javascript
{
  id: string, // Unique ID: "serviceId-timestamp"
  type: "service",
  serviceId: string,
  serviceTitle: string,
  servicePrice: number,
  serviceDescription: string,
  serviceImage: string,
  bookingDetails: {
    date: string,
    time: string,
    address: string,
    addressType: string,
    contactName: string,
    contactPhone: string,
  },
  quantity: 1
}
```

### 4. Checkout Page (`Checkout.js`)

**User Actions:**
1. Select payment option: `payNow` or `payLater`
2. Review order items (rentals + services)
3. Click "Place Order"

**Order Creation Process:**

#### Step 1: Prepare Order Items
```javascript
// For Services
{
  type: "service",
  serviceId: string,
  quantity: 1,
  price: number, // servicePrice
  serviceDetails: {
    title: string,
    description: string,
    image: string,
  },
  bookingDetails: {
    name: string,
    phone: string,
    preferredDate: string,
    preferredTime: string,
    address: string,
    addressType: string,
    contactName: string,
    contactPhone: string,
  }
}
```

#### Step 2: Prepare Delivery Addresses
```javascript
// Service delivery addresses
{
  type: "service",
  address: string,
  contactName: string,
  contactPhone: string,
  preferredDate: string,
  preferredTime: string,
  addressType: string,
}
```

#### Step 3: Create Order
**API Call:** `POST /api/orders`

**Request Body:**
```javascript
{
  orderId: string, // Format: "ORD-YYYY-XXX"
  items: [
    // Rental items...
    {
      type: "service",
      serviceId: string,
      quantity: 1,
      price: number,
      serviceDetails: {...},
      bookingDetails: {...}
    }
  ],
  total: number,
  discount: number, // 5% if payNow
  finalTotal: number,
  paymentOption: "payNow" | "payLater",
  paymentStatus: "paid" | "pending",
  customerInfo: {
    userId: string,
    name: string,
    email: string,
    phone: string,
    address: {...}
  },
  deliveryAddresses: [
    // Rental addresses...
    {
      type: "service",
      address: string,
      contactName: string,
      contactPhone: string,
      preferredDate: string,
      preferredTime: string,
    }
  ]
}
```

#### Step 4: Clear Cart & Redirect
- Cart cleared after successful order creation
- User redirected to `/user/orders`

---

## Backend Flow

### 1. Order Creation Endpoint

**Endpoint:** `POST /api/orders`

**Expected Request:**
- Order contains items with `type: "service"`
- Service items include `bookingDetails` object
- `deliveryAddresses` array includes service addresses

**Backend Responsibilities:**

#### A. Create Order Document
```javascript
{
  orderId: string,
  items: [
    {
      type: "service",
      serviceId: string,
      bookingDetails: {...},
      // ... other fields
    }
  ],
  // ... order fields
}
```

#### B. Create Service Bookings from Order
**For each service item in the order:**

1. Extract booking details from `item.bookingDetails`
2. Create service booking document:
```javascript
{
  serviceId: string,
  orderId: string, // Link to order
  userId: string, // From customerInfo.userId
  name: string, // From bookingDetails.name or contactName
  phone: string, // From bookingDetails.phone or contactPhone
  preferredDate: string, // From bookingDetails.preferredDate
  preferredTime: string, // From bookingDetails.preferredTime
  address: string, // From bookingDetails.address
  notes: string, // Optional
  addressType: string, // From bookingDetails.addressType
  contactName: string, // From bookingDetails.contactName
  contactPhone: string, // From bookingDetails.contactPhone
  status: "New", // Default status
  createdAt: Date,
  updatedAt: Date,
}
```

3. Save service booking to database
4. Link booking to order (store `orderId` in booking)

**Important:** Service bookings should be created **automatically** when an order containing service items is created. The frontend should **NOT** call `POST /service-bookings` directly during the checkout flow.

### 2. Service Booking Endpoints

#### A. Direct Booking (Legacy/Alternative Flow)
**Endpoint:** `POST /api/service-bookings`

**When to Use:**
- Direct service booking without going through cart/checkout
- Admin creates booking manually
- API integrations

**Request:**
```javascript
{
  serviceId: string,
  name: string,
  phone: string,
  preferredDate: string,
  preferredTime: string,
  address: string,
  notes: string, // Optional
  addressType: "myself" | "other",
  contactName: string, // If addressType is "other"
  contactPhone: string, // If addressType is "other"
}
```

**Note:** This endpoint should still work, but the primary flow should be through orders.

#### B. Get User's Service Bookings
**Endpoint:** `GET /api/service-bookings/my-bookings`

**Returns:** List of service bookings for authenticated user

#### C. Admin: Get All Service Bookings
**Endpoint:** `GET /api/admin/service-bookings`

**Returns:** All service bookings (for admin dashboard)

#### D. Admin: Update Booking Status
**Endpoint:** `PATCH /api/admin/service-bookings/:leadId`

**Request:**
```javascript
{
  status: "New" | "Contacted" | "In-Progress" | "Resolved" | "Rejected"
}
```

---

## Data Flow Diagram

```
┌─────────────────┐
│  User Selects   │
│     Service     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Booking Modal    │
│ Collects Details │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Add to Cart     │
│ (with booking   │
│  details)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Cart Page      │
│  Review Items   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Checkout Page  │
│  Select Payment │
│  Place Order    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ POST /orders    │
│ (with service   │
│  items)         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Backend:        │
│ 1. Create Order │
│ 2. Create       │
│    Service      │
│    Bookings     │
│    (one per     │
│    service item)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Order Created   │
│ Bookings Created│
│ Cart Cleared    │
└─────────────────┘
```

---

## Key Points for Backend Implementation

### 1. Order Creation Should Auto-Create Service Bookings

When processing `POST /api/orders`:

```javascript
// Pseudo-code
async function createOrder(orderData) {
  // 1. Create order
  const order = await Order.create(orderData);
  
  // 2. For each service item, create a service booking
  for (const item of orderData.items) {
    if (item.type === 'service' && item.bookingDetails) {
      await ServiceBooking.create({
        serviceId: item.serviceId,
        orderId: order._id,
        userId: orderData.customerInfo.userId,
        ...item.bookingDetails,
        status: 'New',
      });
    }
  }
  
  return order;
}
```

### 2. Service Booking Model Should Include Order Reference

```javascript
{
  _id: ObjectId,
  serviceId: ObjectId,
  orderId: ObjectId, // Reference to order (if created via order)
  userId: ObjectId, // Reference to user
  name: string,
  phone: string,
  preferredDate: Date,
  preferredTime: string,
  address: string,
  notes: string,
  addressType: string,
  contactName: string,
  contactPhone: string,
  status: string,
  createdAt: Date,
  updatedAt: Date,
}
```

### 3. Order Model Should Support Service Items

The order model already supports service items (as documented in API.md). Ensure:
- `items[].type` can be `"service"`
- `items[].bookingDetails` contains all booking information
- `deliveryAddresses[]` includes service addresses

---

## Testing Checklist

### Frontend Testing

- [ ] Service can be added to cart from ServiceRequest page
- [ ] Service can be added to cart from Home page
- [ ] Service can be added to cart from ServiceCard component
- [ ] Booking details are correctly stored in cart
- [ ] Service booking can be edited in cart
- [ ] Checkout page displays service items correctly
- [ ] Checkout page displays booking details for services
- [ ] Order creation includes service items
- [ ] Cart is cleared after order creation
- [ ] User is redirected to orders page after checkout

### Backend Testing

- [ ] Order with service items is created successfully
- [ ] Service bookings are automatically created from order
- [ ] Service booking is linked to order (orderId field)
- [ ] Service booking contains all booking details
- [ ] Direct service booking endpoint still works (POST /service-bookings)
- [ ] User can view their service bookings (GET /service-bookings/my-bookings)
- [ ] Admin can view all service bookings (GET /admin/service-bookings)
- [ ] Admin can update booking status (PATCH /admin/service-bookings/:id)

---

## Migration Notes

If you have existing service bookings created directly (not through orders):

1. **Option 1:** Keep both flows (direct booking + order-based booking)
2. **Option 2:** Migrate existing bookings to have `orderId: null` and add migration script
3. **Option 3:** Deprecate direct booking endpoint (not recommended if it's used elsewhere)

---

## Summary

**Frontend:** Service → Cart → Checkout → Order (with service items)

**Backend:** Order Creation → Auto-create Service Bookings (one per service item)

**Key Change:** Service bookings are now created through the order flow, not directly. This ensures consistency with rental products and proper payment processing.

---

**Last Updated:** 2024-12-19  
**Version:** 1.0.0

