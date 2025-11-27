# Backend API Updates Required

## Critical Updates

### 1. Rental Inquiry - Include AC Details

**Endpoint:** `POST /acs/:id/inquiry`

**Request Body (Updated):**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+91 9876543210",
  "message": "I'm interested in renting this AC",
  "acId": "ac_id",
  "acDetails": {
    "id": "ac_id",
    "brand": "LG",
    "model": "LG 1.5 Ton 5 Star Split AC",
    "capacity": "1.5 Ton",
    "type": "Split",
    "location": "Mumbai, Maharashtra",
    "price": {
      "monthly": 2500,
      "quarterly": 7000,
      "yearly": 25000
    }
  }
}
```

**Note:** 
- Frontend sends both `acId` (from URL) and `acDetails` (full AC info) in the request body
- Backend should store this information with the inquiry for admin reference
- Admin needs to see which AC the customer inquired about

---

### 2. Update AC - Preserve Images on Status Update

**Endpoint:** `PATCH /admin/acs/:id`

**CRITICAL:** When only `status` is sent in the request body, **DO NOT** update or remove existing images. Backend must preserve existing images.

**Example Request (Status Update Only):**
```json
{
  "status": "Rented Out"
}
```

**Backend Behavior:**
- If `images` field is **NOT** in request → **Keep existing images unchanged** (preserve them)
- If `images` field **IS** in request → Update to new images array
- If `images` is empty array `[]` → Clear all images (explicit clear)

**Implementation:**
```javascript
// Pseudo-code for backend
if (req.body.images === undefined) {
  // Don't touch images - preserve existing
  // Do NOT update ac.images
} else if (Array.isArray(req.body.images)) {
  // Update images to new array
  ac.images = req.body.images;
}
```

---

### 3. Get Vendor Requests (New Endpoint)

**Endpoint:** `GET /admin/vendor-requests`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "request_id",
      "name": "Vendor Name",
      "email": "vendor@example.com",
      "phone": "+91 9876543210",
      "message": "I want to list my ACs on your platform",
      "createdAt": "2024-01-25T00:00:00.000Z"
    }
  ]
}
```

**Note:** 
- This endpoint should return all vendor listing requests submitted via the contact form
- These are requests from vendors who want to list their ACs on the platform
- Store these when `POST /vendor-listing-request` is called

---

## Summary of Changes

1. ✅ **Rental Inquiry** - Now includes `acId` and `acDetails` object with full AC information
2. ✅ **Update AC** - Backend **MUST** preserve images when only status is updated (images field not in request)
3. ✅ **Vendor Requests** - New endpoint `GET /admin/vendor-requests` to fetch vendor listing requests
4. ✅ **Image Handling** - Backend receives image URLs (strings), not files (already documented)

---

## Backend Implementation Notes

### Image Preservation Logic (CRITICAL):
```javascript
// When updating AC via PATCH /admin/acs/:id
const updateData = req.body;

// Only update images if explicitly provided
if (updateData.images !== undefined) {
  ac.images = updateData.images; // Can be array of URLs or empty array
}
// If images is not in updateData, DO NOTHING - preserve existing images
```

### Rental Inquiry Storage:
```javascript
// Store inquiry with AC details
{
  _id: ObjectId,
  acId: ObjectId, // Reference to AC
  acDetails: {
    id: String,
    brand: String,
    model: String,
    capacity: String,
    type: String,
    location: String,
    price: {
      monthly: Number,
      quarterly: Number,
      yearly: Number
    }
  },
  name: String,
  email: String,
  phone: String, // Format: "+91 XXXXXXXXXX"
  message: String,
  status: String, // "Pending", "Contacted", "Completed", "Cancelled"
  createdAt: Date,
  updatedAt: Date
}
```

### Vendor Request Storage:
```javascript
// Store vendor listing requests
{
  _id: ObjectId,
  name: String,
  email: String,
  phone: String, // Format: "+91 XXXXXXXXXX"
  message: String,
  createdAt: Date
}
```

---

## Response Format Requirements

**All endpoints must return:**
- Success: `{ "success": true, "message": "...", "data": {...} }`
- Error: `{ "success": false, "message": "Error description" }`

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

---

## Testing Checklist

- [ ] Rental inquiry includes `acId` and `acDetails` in database
- [ ] Updating AC status (without images field) **DOES NOT** remove images
- [ ] Updating AC with images array updates images correctly
- [ ] Vendor requests endpoint returns all requests
- [ ] All endpoints return proper success/error responses
- [ ] Images are stored as URL strings (not file objects)
- [ ] Phone numbers are stored in "+91 XXXXXXXXXX" format

---

## Important Notes

1. **Image Preservation is CRITICAL** - If you update status and images disappear, users will lose their uploaded images
2. **AC Details in Inquiries** - Admin needs to see which AC customer inquired about, so store full AC details
3. **Vendor Requests** - These come from contact form when user selects "Want to list your AC?" option

