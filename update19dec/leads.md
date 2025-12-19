# Lead Capture API Documentation

## Overview
This document describes the backend API endpoints required for the Lead Capture Modal functionality. The modal appears on the Browse and Contact pages to capture user information for callback requests.

---

## Data Model

### Lead Schema
```javascript
{
  _id: ObjectId,                    // Auto-generated
  name: String,                     // Required: User's full name
  phone: String,                    // Required: Phone number with country code (e.g., "+91XXXXXXXXXX")
  interest: String,                 // Required: 'rental' or 'service'
  source: String,                   // Required: 'browse' or 'contact' (page where modal was shown)
  status: String,                    // Default: 'New', Options: 'New', 'Contacted', 'In-Progress', 'Resolved', 'Closed'
  notes: String,                    // Optional: Admin notes about the lead
  contactedAt: Date,                // Optional: When the lead was first contacted
  resolvedAt: Date,                 // Optional: When the lead was resolved
  createdAt: Date,                  // Auto-generated: When the lead was created
  updatedAt: Date                   // Auto-updated: Last modification time
}
```

### Status Values
- `New`: Lead just created, not yet contacted
- `Contacted`: Initial contact made with the lead
- `In-Progress`: Lead is being actively worked on
- `Resolved`: Lead's request has been fulfilled
- `Closed`: Lead is no longer active (e.g., not interested, duplicate, etc.)

---

## API Endpoints

### 1. Create Lead (Public)
**POST** `/api/leads`

Creates a new callback lead from the Lead Capture Modal.

**Request Body:**
```json
{
  "name": "John Doe",
  "phone": "+919876543210",
  "interest": "rental",
  "source": "browse"
}
```

**Validation Rules:**
- `name`: Required, string, min 2 characters, max 100 characters
- `phone`: Required, string, must match pattern `^\+91[0-9]{10}$` (10 digits after +91)
- `interest`: Required, must be either `'rental'` or `'service'`
- `source`: Required, must be either `'browse'` or `'contact'`

**Success Response (201):**
```json
{
  "success": true,
  "message": "Thank you! We will contact you soon.",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "phone": "+919876543210",
    "interest": "rental",
    "source": "browse",
    "status": "New",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
  ```json
  {
    "success": false,
    "message": "Please provide all required fields",
    "errors": {
      "phone": "Phone number must be 10 digits"
    }
  }
  ```
- `500 Internal Server Error`: Server error
  ```json
  {
    "success": false,
    "message": "Failed to create lead. Please try again."
  }
  ```

---

### 2. Get All Leads (Admin Only)
**GET** `/api/admin/leads`

Retrieves all callback leads with optional filtering and pagination.

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `status` (optional): Filter by status (`New`, `Contacted`, `In-Progress`, `Resolved`, `Closed`)
- `interest` (optional): Filter by interest type (`rental`, `service`)
- `source` (optional): Filter by source (`browse`, `contact`)
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of results per page (default: 50, max: 100)
- `sortBy` (optional): Sort field (`createdAt`, `updatedAt`, `name`) (default: `createdAt`)
- `sortOrder` (optional): Sort order (`asc`, `desc`) (default: `desc`)

**Example Request:**
```
GET /api/admin/leads?status=New&interest=rental&page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "phone": "+919876543210",
      "interest": "rental",
      "source": "browse",
      "status": "New",
      "notes": null,
      "contactedAt": null,
      "resolvedAt": null,
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalLeads": 95,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: User is not an admin
- `500 Internal Server Error`: Server error

---

### 3. Get Single Lead (Admin Only)
**GET** `/api/admin/leads/:id`

Retrieves details of a specific lead.

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "phone": "+919876543210",
    "interest": "rental",
    "source": "browse",
    "status": "New",
    "notes": null,
    "contactedAt": null,
    "resolvedAt": null,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `404 Not Found`: Lead not found
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: User is not an admin

---

### 4. Update Lead Status (Admin Only)
**PATCH** `/api/admin/leads/:id`

Updates the status and optionally adds notes to a lead.

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "status": "Contacted",
  "notes": "Called customer, interested in 1.5 Ton AC rental"
}
```

**Validation:**
- `status`: Optional, must be one of: `New`, `Contacted`, `In-Progress`, `Resolved`, `Closed`
- `notes`: Optional, string, max 1000 characters

**Success Response (200):**
```json
{
  "success": true,
  "message": "Lead updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "phone": "+919876543210",
    "interest": "rental",
    "source": "browse",
    "status": "Contacted",
    "notes": "Called customer, interested in 1.5 Ton AC rental",
    "contactedAt": "2025-01-15T11:00:00.000Z",
    "resolvedAt": null,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T11:00:00.000Z"
  }
}
```

**Special Behavior:**
- When status changes to `Contacted` and `contactedAt` is null, automatically set `contactedAt` to current timestamp
- When status changes to `Resolved` or `Closed` and `resolvedAt` is null, automatically set `resolvedAt` to current timestamp

**Error Responses:**
- `400 Bad Request`: Invalid status value or validation error
- `404 Not Found`: Lead not found
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: User is not an admin

---

### 5. Delete Lead (Admin Only)
**DELETE** `/api/admin/leads/:id`

Permanently deletes a lead from the database.

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Lead deleted successfully"
}
```

**Error Responses:**
- `404 Not Found`: Lead not found
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: User is not an admin

---

### 6. Get Lead Statistics (Admin Only)
**GET** `/api/admin/leads/stats`

Returns statistics about leads for dashboard display.

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "byStatus": {
      "New": 45,
      "Contacted": 30,
      "In-Progress": 25,
      "Resolved": 35,
      "Closed": 15
    },
    "byInterest": {
      "rental": 90,
      "service": 60
    },
    "bySource": {
      "browse": 100,
      "contact": 50
    },
    "newToday": 12,
    "newThisWeek": 45,
    "newThisMonth": 120
  }
}
```

---

## Frontend Integration

### API Service Methods

The frontend expects these methods in `apiService`:

```javascript
// Create lead (public)
createLead: async (leadData) => {
  // POST /api/leads
  // leadData: { name, phone, interest, source }
}

// Get all leads (admin)
getCallbackLeads: async (filters = {}) => {
  // GET /api/admin/leads
  // filters: { status, interest, source, page, limit, sortBy, sortOrder }
}

// Get single lead (admin)
getCallbackLead: async (leadId) => {
  // GET /api/admin/leads/:id
}

// Update lead status (admin)
updateCallbackLeadStatus: async (leadId, updates) => {
  // PATCH /api/admin/leads/:id
  // updates: { status, notes }
}

// Delete lead (admin)
deleteCallbackLead: async (leadId) => {
  // DELETE /api/admin/leads/:id
}

// Get lead statistics (admin)
getCallbackLeadStats: async () => {
  // GET /api/admin/leads/stats
}
```

---

## Database Schema (MongoDB Example)

```javascript
const leadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^\+91[0-9]{10}$/, 'Phone number must be 10 digits with +91 prefix']
  },
  interest: {
    type: String,
    required: [true, 'Interest type is required'],
    enum: {
      values: ['rental', 'service'],
      message: 'Interest must be either "rental" or "service"'
    }
  },
  source: {
    type: String,
    required: [true, 'Source is required'],
    enum: {
      values: ['browse', 'contact'],
      message: 'Source must be either "browse" or "contact"'
    }
  },
  status: {
    type: String,
    enum: ['New', 'Contacted', 'In-Progress', 'Resolved', 'Closed'],
    default: 'New'
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    default: null
  },
  contactedAt: {
    type: Date,
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  collection: 'callback_leads'
});

// Indexes for better query performance
leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ interest: 1, createdAt: -1 });
leadSchema.index({ source: 1, createdAt: -1 });
leadSchema.index({ phone: 1 });
```

---

## Testing Examples

### 1. Create a Lead (cURL)
```bash
curl -X POST http://localhost:5000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "phone": "+919876543210",
    "interest": "rental",
    "source": "browse"
  }'
```

### 2. Get All Leads (cURL)
```bash
curl -X GET "http://localhost:5000/api/admin/leads?status=New&page=1&limit=20" \
  -H "Authorization: Bearer <admin_token>"
```

### 3. Update Lead Status (cURL)
```bash
curl -X PATCH http://localhost:5000/api/admin/leads/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Contacted",
    "notes": "Customer called, interested in AC rental"
  }'
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `LEAD_001` | Name is required |
| `LEAD_002` | Phone number is required |
| `LEAD_003` | Invalid phone number format |
| `LEAD_004` | Interest type is required |
| `LEAD_005` | Invalid interest type (must be 'rental' or 'service') |
| `LEAD_006` | Source is required |
| `LEAD_007` | Invalid source (must be 'browse' or 'contact') |
| `LEAD_008` | Lead not found |
| `LEAD_009` | Invalid status value |
| `LEAD_010` | Notes cannot exceed 1000 characters |

---

## Notes for Backend Implementation

1. **Phone Number Format**: The frontend sends phone numbers in the format `+91XXXXXXXXXX` (10 digits after +91). Ensure your backend validates and stores this format.

2. **Auto-timestamps**: When status changes to `Contacted`, automatically set `contactedAt` if it's null. When status changes to `Resolved` or `Closed`, automatically set `resolvedAt` if it's null.

3. **Pagination**: Implement pagination for the GET all leads endpoint to handle large datasets efficiently.

4. **Indexing**: Create database indexes on frequently queried fields (`status`, `interest`, `source`, `createdAt`, `phone`) for better performance.

5. **Admin Authentication**: All admin endpoints must verify the user has admin role before processing requests.

6. **Rate Limiting**: Consider implementing rate limiting on the public create lead endpoint to prevent spam.

7. **Duplicate Prevention**: Optionally, you may want to prevent duplicate leads (same phone number within 24 hours) to avoid spam.

---

## Integration with Admin Panel

The admin panel at `/admin/leads` should display callback leads in a new tab or section. The frontend will need to:

1. Add a new tab "Callback Leads" in the Leads page
2. Fetch leads using `apiService.getCallbackLeads()`
3. Display leads in a table/card format with:
   - Name
   - Phone (clickable to call)
   - Interest type (rental/service)
   - Source (browse/contact)
   - Status (with color coding)
   - Created date
   - Actions (Update status, Add notes, Delete)
4. Allow filtering by status, interest, and source
5. Allow sorting by date
6. Show statistics in the dashboard

---

## Security Considerations

1. **Input Validation**: Always validate and sanitize all input data
2. **SQL Injection**: Use parameterized queries or ORM methods
3. **XSS Prevention**: Sanitize user input before storing
4. **Rate Limiting**: Implement rate limiting to prevent abuse
5. **Authentication**: Verify admin tokens on all admin endpoints
6. **Phone Number Privacy**: Consider masking phone numbers in logs
7. **GDPR Compliance**: Implement data deletion and export features if required

---

## Future Enhancements

1. **Email Notifications**: Send email to admin when a new lead is created
2. **SMS Integration**: Send SMS to customer confirming callback request
3. **Lead Assignment**: Assign leads to specific team members
4. **Follow-up Reminders**: Set reminders for follow-up calls
5. **Export Functionality**: Export leads to CSV/Excel
6. **Bulk Actions**: Allow bulk status updates
7. **Search Functionality**: Search leads by name, phone, or notes
8. **Analytics Dashboard**: Show conversion rates, response times, etc.

