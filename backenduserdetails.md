# Backend API Implementation Guide - User Management Feature

This document provides the API specifications for implementing the user management feature on the admin side. The frontend is already implemented and expects these endpoints to be available.

## Base URL
```
http://localhost:5000/api
```

## Authentication
All admin endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <admin_token>
```

---

## 1. Get All Users

**Endpoint:** `GET /admin/users`

**Description:** Fetches all users with their order statistics aggregated.

**Query Parameters (Optional):**
- `page` (number): Page number for pagination (default: 1)
- `limit` (number): Number of users per page (default: 50)
- `search` (string): Search by name, email, or phone
- `sortBy` (string): Sort field (e.g., 'createdAt', 'name', 'totalOrders')
- `sortOrder` (string): 'asc' or 'desc' (default: 'desc')

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "user_id_1",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "role": "user",
      "address": {
        "homeAddress": "123 Main St",
        "nearLandmark": "Near Park",
        "pincode": "12345"
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "orderStats": {
        "totalOrders": 5,
        "completedOrders": 3,
        "pendingOrders": 1,
        "cancelledOrders": 1,
        "totalSpent": 25000,
        "averageOrderValue": 5000
      }
    },
    {
      "_id": "user_id_2",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+1234567891",
      "role": "user",
      "address": null,
      "createdAt": "2024-02-20T14:20:00.000Z",
      "orderStats": {
        "totalOrders": 0,
        "completedOrders": 0,
        "pendingOrders": 0,
        "cancelledOrders": 0,
        "totalSpent": 0,
        "averageOrderValue": 0
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalUsers": 250,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: User is not an admin
- `500 Internal Server Error`: Server error

**Implementation Notes:**
- Aggregate order statistics for each user:
  - Count total orders
  - Count completed/delivered orders
  - Count pending orders
  - Count cancelled orders
  - Sum total amount spent (from completed orders)
  - Calculate average order value
- Include users with zero orders (orderStats should show all zeros)
- Populate address if available
- Sort by most recent users by default

---

## 2. Get User by ID

**Endpoint:** `GET /admin/users/:userId`

**Description:** Fetches detailed information about a specific user.

**URL Parameters:**
- `userId` (string, required): The user's ID

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "user_id_1",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "role": "user",
    "address": {
      "homeAddress": "123 Main St",
      "nearLandmark": "Near Park",
      "pincode": "12345",
      "city": "Mumbai",
      "state": "Maharashtra"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-02-10T08:15:00.000Z",
    "orderStats": {
      "totalOrders": 5,
      "completedOrders": 3,
      "pendingOrders": 1,
      "cancelledOrders": 1,
      "totalSpent": 25000,
      "averageOrderValue": 5000,
      "lastOrderDate": "2024-03-01T12:00:00.000Z"
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: User is not an admin
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

---

## 3. Get User Orders

**Endpoint:** `GET /admin/users/:userId/orders`

**Description:** Fetches all orders placed by a specific user.

**URL Parameters:**
- `userId` (string, required): The user's ID

**Query Parameters (Optional):**
- `status` (string): Filter by order status (pending, confirmed, processing, delivered, cancelled)
- `page` (number): Page number for pagination
- `limit` (number): Number of orders per page

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "order_id_1",
      "orderId": "ORD-2024-001",
      "userId": "user_id_1",
      "status": "delivered",
      "paymentStatus": "paid",
      "paymentOption": "razorpay",
      "items": [
        {
          "type": "rental",
          "productId": "product_id_1",
          "productDetails": {
            "brand": "LG",
            "model": "1.5 Ton Split AC",
            "capacity": "1.5 Ton",
            "type": "Split",
            "location": "Mumbai"
          },
          "duration": 6,
          "quantity": 1,
          "price": 5000
        }
      ],
      "total": 5000,
      "discount": 0,
      "finalTotal": 5000,
      "customerInfo": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "address": {
          "homeAddress": "123 Main St",
          "nearLandmark": "Near Park",
          "pincode": "12345"
        }
      },
      "createdAt": "2024-03-01T12:00:00.000Z",
      "updatedAt": "2024-03-05T10:00:00.000Z"
    },
    {
      "_id": "order_id_2",
      "orderId": "ORD-2024-002",
      "userId": "user_id_1",
      "status": "pending",
      "paymentStatus": "pending",
      "paymentOption": "cod",
      "items": [
        {
          "type": "service",
          "serviceId": "service_id_1",
          "serviceDetails": {
            "title": "AC Installation",
            "description": "Professional AC installation service"
          },
          "quantity": 1,
          "price": 2000,
          "bookingDetails": {
            "preferredDate": "2024-03-15",
            "preferredTime": "10:00 AM",
            "address": "123 Main St"
          }
        }
      ],
      "total": 2000,
      "discount": 0,
      "finalTotal": 2000,
      "customerInfo": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "address": {
          "homeAddress": "123 Main St",
          "nearLandmark": "Near Park",
          "pincode": "12345"
        }
      },
      "createdAt": "2024-03-10T14:30:00.000Z",
      "updatedAt": "2024-03-10T14:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalOrders": 2,
    "hasNext": false,
    "hasPrev": false
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: User is not an admin
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

**Implementation Notes:**
- Populate product/service details in order items
- Include customer info from the order (may differ from current user profile)
- Sort by most recent orders first (createdAt descending)

---

## 4. Get User Statistics

**Endpoint:** `GET /admin/users/:userId/stats`

**Description:** Fetches detailed statistics for a specific user.

**URL Parameters:**
- `userId` (string, required): The user's ID

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "user_id_1",
    "userInfo": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "memberSince": "2024-01-15T10:30:00.000Z"
    },
    "orderStats": {
      "totalOrders": 5,
      "completedOrders": 3,
      "pendingOrders": 1,
      "cancelledOrders": 1,
      "totalSpent": 25000,
      "averageOrderValue": 5000,
      "lastOrderDate": "2024-03-01T12:00:00.000Z",
      "firstOrderDate": "2024-01-20T08:00:00.000Z"
    },
    "orderBreakdown": {
      "byStatus": {
        "pending": 1,
        "confirmed": 0,
        "processing": 0,
        "delivered": 3,
        "cancelled": 1
      },
      "byPaymentStatus": {
        "paid": 4,
        "pending": 1,
        "failed": 0
      },
      "byType": {
        "rental": 3,
        "service": 2
      }
    },
    "monthlyStats": [
      {
        "month": "2024-01",
        "orders": 1,
        "spent": 5000
      },
      {
        "month": "2024-02",
        "orders": 2,
        "spent": 10000
      },
      {
        "month": "2024-03",
        "orders": 2,
        "spent": 10000
      }
    ]
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: User is not an admin
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

---

## Database Schema Considerations

### User Model
Ensure your User model includes:
- `_id` / `id`: Unique identifier
- `name`: User's full name
- `email`: Email address (unique)
- `phone`: Phone number
- `role`: 'user' or 'admin'
- `address`: Object with address details (optional)
- `createdAt`: Registration date
- `updatedAt`: Last update date

### Order Model
Ensure your Order model includes:
- `_id` / `id`: Unique identifier
- `orderId`: Human-readable order ID
- `userId`: Reference to User
- `status`: Order status (pending, confirmed, processing, delivered, cancelled)
- `paymentStatus`: Payment status (paid, pending, failed)
- `paymentOption`: Payment method (razorpay, cod, etc.)
- `items`: Array of order items
- `total`: Subtotal amount
- `discount`: Discount amount
- `finalTotal`: Final amount after discount
- `customerInfo`: Customer details at time of order
- `createdAt`: Order creation date
- `updatedAt`: Last update date

---

## Implementation Steps

1. **Create Route Handlers:**
   - Create `/admin/users` route handler
   - Create `/admin/users/:userId` route handler
   - Create `/admin/users/:userId/orders` route handler
   - Create `/admin/users/:userId/stats` route handler

2. **Add Authentication Middleware:**
   - Ensure all routes are protected with admin authentication middleware
   - Verify the user has admin role before allowing access

3. **Implement Aggregation Logic:**
   - Use MongoDB aggregation pipeline (if using MongoDB) or equivalent SQL queries
   - Aggregate order statistics for each user
   - Calculate totals, averages, and counts

4. **Add Pagination:**
   - Implement pagination for list endpoints
   - Return pagination metadata in response

5. **Add Search Functionality:**
   - Implement search by name, email, or phone number
   - Use case-insensitive search

6. **Add Sorting:**
   - Implement sorting by various fields
   - Default sort by most recent users/orders

7. **Error Handling:**
   - Handle invalid user IDs
   - Handle missing data gracefully
   - Return appropriate HTTP status codes

8. **Testing:**
   - Test with users who have orders
   - Test with users who have no orders
   - Test pagination
   - Test search functionality
   - Test sorting
   - Test error cases (invalid IDs, unauthorized access)

---

## Example MongoDB Aggregation (if using MongoDB)

```javascript
// Get all users with order statistics
const usersWithStats = await User.aggregate([
  {
    $lookup: {
      from: 'orders',
      localField: '_id',
      foreignField: 'userId',
      as: 'orders'
    }
  },
  {
    $project: {
      name: 1,
      email: 1,
      phone: 1,
      role: 1,
      address: 1,
      createdAt: 1,
      orderStats: {
        totalOrders: { $size: '$orders' },
        completedOrders: {
          $size: {
            $filter: {
              input: '$orders',
              as: 'order',
              cond: { $eq: ['$$order.status', 'delivered'] }
            }
          }
        },
        pendingOrders: {
          $size: {
            $filter: {
              input: '$orders',
              as: 'order',
              cond: { $eq: ['$$order.status', 'pending'] }
            }
          }
        },
        cancelledOrders: {
          $size: {
            $filter: {
              input: '$orders',
              as: 'order',
              cond: { $eq: ['$$order.status', 'cancelled'] }
            }
          }
        },
        totalSpent: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: '$orders',
                  as: 'order',
                  cond: { $in: ['$$order.status', ['delivered', 'completed']] }
                }
              },
              as: 'order',
              in: '$$order.finalTotal'
            }
          }
        }
      }
    }
  },
  {
    $addFields: {
      'orderStats.averageOrderValue': {
        $cond: {
          if: { $gt: ['$orderStats.totalOrders', 0] },
          then: { $divide: ['$orderStats.totalSpent', '$orderStats.totalOrders'] },
          else: 0
        }
      }
    }
  },
  {
    $sort: { createdAt: -1 }
  }
]);
```

---

## Notes

- All endpoints should return consistent response format with `success`, `data`, and optional `message` fields
- Use proper HTTP status codes (200 for success, 401 for unauthorized, 404 for not found, etc.)
- Implement proper error handling and validation
- Consider adding rate limiting for admin endpoints
- Log admin actions for audit purposes
- Ensure data privacy - only return necessary user information

---

## Frontend Integration

The frontend is already implemented and expects:
- All endpoints to be available at `/admin/users/*`
- Responses in the format specified above
- Proper error handling with meaningful error messages
- CORS enabled if frontend and backend are on different domains

Once you implement these endpoints, the frontend will automatically work with your backend API.

