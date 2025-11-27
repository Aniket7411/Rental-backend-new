# Backend Changes Required - Summary

## Critical Changes

### 1. Image Upload - **NO FILE HANDLING NEEDED**

**CHANGE:** Frontend uploads images to Cloudinary before sending to backend.

**What backend needs to do:**
- ✅ Accept JSON requests (NOT multipart/form-data)
- ✅ Receive `images` as array of URL strings: `["https://cloudinary.com/img1.jpg", ...]`
- ✅ Store URLs directly in database
- ❌ **REMOVE** all file upload middleware (multer, etc.)

**Affected Endpoints:**
- `POST /admin/acs` 
- `PATCH /admin/acs/:id`
- `POST /service-requests`

**Example Request:**
```json
{
  "brand": "LG",
  "model": "LG 1.5 Ton",
  "images": ["https://res.cloudinary.com/defgskoxv/image/upload/v123/STJ/abc.jpg"]
}
```

---

### 2. Delete AC Endpoint

**ADD:** Delete endpoint for ACs

**Endpoint:** `DELETE /admin/acs/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "AC deleted successfully"
}
```

---

### 3. Rental Inquiry Form

**ENSURE:** Inquiry endpoint works properly

**Endpoint:** `POST /acs/:id/inquiry`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+91 9876543210",
  "message": "I'm interested in renting this AC"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rental inquiry submitted successfully",
  "data": {
    "_id": "inquiry_id",
    "acId": "ac_id",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+91 9876543210",
    "message": "I'm interested in renting this AC",
    "status": "Pending",
    "createdAt": "2024-01-25T00:00:00.000Z"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error message here"
}
```

---

## Summary

1. ✅ **Remove file upload handling** - Frontend handles Cloudinary uploads
2. ✅ **Accept JSON** - All image endpoints use `application/json`
3. ✅ **Store image URLs** - Backend just stores the URLs received
4. ✅ **Add DELETE endpoint** - For deleting ACs
5. ✅ **Fix inquiry endpoint** - Ensure proper error handling

**That's it!** Backend is much simpler now - no file processing needed.

