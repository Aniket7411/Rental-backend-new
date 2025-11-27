# Backend Update Required - Service Management & Booking System

This document outlines the backend changes needed to support the new Service Management and Booking features.

## New Endpoints Required

### 1. Service Management Endpoints

#### GET `/api/services` (Public)
- **Purpose:** Fetch all available services
- **Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "service_id",
      "title": "AC Repair",
      "description": "Our technician will thoroughly inspect your AC...",
      "price": 149,
      "originalPrice": 349,
      "badge": "Visit Within 1 Hour",
      "image": "https://cloudinary.com/image.jpg",
      "process": "A comprehensive exam of the AC unit's inner and external components...",
      "benefits": "Pinpoints actual problems for effective resolution...",
      "keyFeatures": "In-depth inspection by using certified professionals...",
      "recommendedFrequency": "Immediate inspection if cooling efficiency drops...",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### GET `/api/services/:id` (Public)
- **Purpose:** Fetch a single service by ID
- **Response:** Same structure as above, but single object in `data`

#### POST `/api/admin/services` (Admin Only - Requires Auth)
- **Purpose:** Create a new service
- **Headers:** `Authorization: Bearer <admin_token>`
- **Request Body:**
```json
{
  "title": "AC Repair",
  "description": "Our technician will thoroughly inspect your AC...",
  "price": 149,
  "originalPrice": 349,
  "badge": "Visit Within 1 Hour",
  "image": "https://cloudinary.com/image.jpg",
  "process": "A comprehensive exam...",
  "benefits": "Pinpoints actual problems...",
  "keyFeatures": "In-depth inspection...",
  "recommendedFrequency": "Immediate inspection if cooling efficiency drops..."
}
```
- **Response:**
```json
{
  "success": true,
  "message": "Service added successfully",
  "data": { /* service object */ }
}
```

#### PATCH `/api/admin/services/:id` (Admin Only - Requires Auth)
- **Purpose:** Update an existing service (partial update supported)
- **Headers:** `Authorization: Bearer <admin_token>`
- **Request Body:** All fields optional
```json
{
  "title": "Updated AC Repair",
  "price": 199
}
```
- **Response:**
```json
{
  "success": true,
  "message": "Service updated successfully",
  "data": { /* updated service object */ }
}
```

#### DELETE `/api/admin/services/:id` (Admin Only - Requires Auth)
- **Purpose:** Delete a service
- **Headers:** `Authorization: Bearer <admin_token>`
- **Response:**
```json
{
  "success": true,
  "message": "Service deleted successfully"
}
```

### 2. Service Booking Endpoints

#### POST `/api/service-bookings` (Public)
- **Purpose:** Create a new service booking
- **Request Body:**
```json
{
  "serviceId": "service_id",
  "serviceTitle": "AC Repair",
  "servicePrice": 149,
  "date": "2024-01-15",
  "time": "10:00 AM",
  "address": "123 Main Street, City, State, PIN",
  "addressType": "myself",
  "contactName": "John Doe",
  "contactPhone": "+919876543210",
  "paymentOption": "payNow"
}
```

**Important Notes:**
- `addressType` can be `"myself"` or `"someoneElse"`
- If `addressType` is `"myself"`, `contactName` and `contactPhone` may be empty strings
- If `addressType` is `"someoneElse"`, `contactName` and `contactPhone` are **required**
- `paymentOption` can be `"payNow"` or `"payLater"`
- `contactPhone` format: `+919876543210` (with country code)

- **Response:**
```json
{
  "success": true,
  "message": "Service booking submitted successfully",
  "data": {
    "_id": "booking_id",
    "serviceId": "service_id",
    "serviceTitle": "AC Repair",
    "servicePrice": 149,
    "date": "2024-01-15",
    "time": "10:00 AM",
    "address": "123 Main Street, City, State, PIN",
    "addressType": "myself",
    "contactName": "",
    "contactPhone": "",
    "paymentOption": "payNow",
    "status": "Pending",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### GET `/api/admin/service-bookings` (Admin Only - Requires Auth)
- **Purpose:** Get all service bookings (for admin leads page)
- **Headers:** `Authorization: Bearer <admin_token>`
- **Query Parameters (optional):**
  - `status`: Filter by status (e.g., `Pending`, `Confirmed`, `Completed`)
  - `page`: Page number
  - `limit`: Items per page
- **Response:**
```json
{
  "success": true,
  "data": [ /* array of booking objects */ ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

#### PATCH `/api/admin/service-bookings/:id` (Admin Only - Requires Auth)
- **Purpose:** Update booking status
- **Headers:** `Authorization: Bearer <admin_token>`
- **Request Body:**
```json
{
  "status": "Confirmed"
}
```
- **Valid Status Values:**
  - `Pending` (default)
  - `Confirmed`
  - `Scheduled`
  - `In Progress`
  - `Completed`
  - `Cancelled`
- **Response:**
```json
{
  "success": true,
  "message": "Booking status updated",
  "data": { /* updated booking object */ }
}
```

## Database Models Required

### Service Model
```javascript
{
  _id: ObjectId,
  title: String (required),
  description: String (required),
  price: Number (required),
  originalPrice: Number (optional),
  badge: String (optional), // "Visit Within 1 Hour", "Most Booked", "Power Saver"
  image: String (optional), // Cloudinary URL
  process: String (optional),
  benefits: String (optional),
  keyFeatures: String (optional),
  recommendedFrequency: String (optional),
  createdAt: Date,
  updatedAt: Date
}
```

### ServiceBooking Model
```javascript
{
  _id: ObjectId,
  serviceId: ObjectId (required, ref: 'Service'),
  serviceTitle: String (required),
  servicePrice: Number (required),
  date: String (required), // ISO date string (YYYY-MM-DD)
  time: String (required), // e.g., "10:00 AM"
  address: String (required),
  addressType: String (required), // "myself" or "someoneElse"
  contactName: String (optional), // Required if addressType is "someoneElse"
  contactPhone: String (optional), // Required if addressType is "someoneElse", format: +919876543210
  paymentOption: String (required), // "payNow" or "payLater"
  status: String (default: "Pending"), // "Pending", "Confirmed", "Scheduled", "In Progress", "Completed", "Cancelled"
  createdAt: Date,
  updatedAt: Date
}
```

## Validation Rules

### Service Validation:
- `title`: Required, string
- `description`: Required, string
- `price`: Required, number, must be > 0
- `originalPrice`: Optional, number, must be > 0 if provided
- `badge`: Optional, must be one of: "Visit Within 1 Hour", "Most Booked", "Power Saver", or null
- `image`: Optional, must be a valid URL if provided
- All other fields are optional strings

### Service Booking Validation:
- `serviceId`: Required, must be valid ObjectId
- `serviceTitle`: Required, string
- `servicePrice`: Required, number, must be > 0
- `date`: Required, must be valid date string (YYYY-MM-DD), must be in the future
- `time`: Required, string format: "HH:MM AM/PM"
- `address`: Required, string, min length 10
- `addressType`: Required, must be "myself" or "someoneElse"
- `contactName`: Required if `addressType` is "someoneElse", string
- `contactPhone`: Required if `addressType` is "someoneElse", must match format: `+91XXXXXXXXXX` (13 characters)
- `paymentOption`: Required, must be "payNow" or "payLater"
- `status`: Optional, defaults to "Pending"

## Error Responses

All endpoints should return errors in this format:
```json
{
  "success": false,
  "message": "Error message here"
}
```

**Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

## Integration Notes

1. **Image Handling:**
   - Images are uploaded to Cloudinary by the frontend
   - Backend receives image URLs (strings) only
   - Store the Cloudinary URL in the `image` field

2. **Authentication:**
   - Admin endpoints require JWT token in `Authorization: Bearer <token>` header
   - Use existing admin authentication middleware
   - Public endpoints (GET services, POST booking) do not require authentication

3. **Service Bookings in Admin Leads:**
   - Service bookings should be accessible in the admin leads page
   - Consider adding a new tab or section for "Service Bookings" alongside existing "Service Requests" and "Rental Inquiries"
   - The existing leads endpoint can be extended or a new endpoint can be created

4. **Payment Integration:**
   - The `paymentOption` field is stored but payment processing is not implemented yet
   - For "payNow" bookings, you may want to mark them differently or add a payment status field later

## Example Implementation Priority

1. **High Priority:**
   - Service CRUD endpoints (GET, POST, PATCH, DELETE)
   - Service Booking creation endpoint (POST)
   - Service Booking model and validation

2. **Medium Priority:**
   - Admin service bookings list endpoint
   - Booking status update endpoint

3. **Low Priority:**
   - Service booking filtering and pagination
   - Integration with existing leads system

## Testing Checklist

- [ ] Create a service via POST `/api/admin/services`
- [ ] Get all services via GET `/api/services`
- [ ] Update a service via PATCH `/api/admin/services/:id`
- [ ] Delete a service via DELETE `/api/admin/services/:id`
- [ ] Create a booking with `addressType: "myself"`
- [ ] Create a booking with `addressType: "someoneElse"` (with contact details)
- [ ] Validate that contact details are required when `addressType` is "someoneElse"
- [ ] Get all bookings via GET `/api/admin/service-bookings`
- [ ] Update booking status via PATCH `/api/admin/service-bookings/:id`
- [ ] Test authentication on admin endpoints
- [ ] Test error handling and validation

## Questions/Clarifications

If you need any clarifications, please refer to the detailed API documentation in `BACKEND_API_SERVICES.md` or contact the frontend team.

