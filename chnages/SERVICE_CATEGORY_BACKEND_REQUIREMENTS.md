# Service Category Backend Requirements

## Overview
This document outlines the backend changes required to properly support service categories for filtering services on the Service Request page (`/service-request`). The frontend currently has intelligent title-based matching, but proper category fields in the database will provide more accurate and reliable filtering.

## Current Issue
- Services are being categorized using title-based keyword matching as a fallback
- This can lead to inaccurate categorizations and inconsistent filtering
- Category counts in the UI may not match filtered results accurately

## Required Changes

### 1. Service Model/Database Schema

Add a `category` field to the Service model/schema:

```javascript
// Mongoose Schema Example
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

**Field Specifications:**
- **Type:** String
- **Required:** No (optional field for backward compatibility)
- **Enum Values:** Only the exact strings listed above (case-sensitive)
- **Default:** null (for uncategorized services)
- **Indexed:** Yes (for efficient querying)

### 2. API Endpoints

#### GET `/api/services`
Update to support category filtering via query parameter:

**Query Parameters:**
- `category` (string, optional): Filter services by exact category match
  - Valid values: 
    - `Water Leakage Repair`
    - `AC Gas Refilling`
    - `AC Foam Wash`
    - `AC Jet Wash Service`
    - `AC Repair Inspection`
    - `Split AC Installation`

**Example Request:**
```
GET /api/services?category=AC%20Gas%20Refilling
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "service_id",
      "title": "AC Gas Refilling Service",
      "description": "Professional AC gas refilling...",
      "category": "AC Gas Refilling",
      "price": 1500,
      "image": "url",
      // ... other fields
    }
  ],
  "total": 1
}
```

**Filtering Logic:**
```javascript
// Backend filtering example
router.get('/services', async (req, res) => {
  const { category } = req.query;
  const query = {};
  
  if (category && SERVICE_CATEGORIES.includes(category)) {
    query.category = category;
  }
  
  const services = await Service.find(query).sort({ createdAt: -1 });
  res.json({ success: true, data: services, total: services.length });
});
```

#### POST `/api/admin/services`
Update the service creation endpoint to accept `category` field:

**Request Body:**
```json
{
  "title": "AC Gas Refilling Service",
  "description": "Professional AC gas refilling service...",
  "price": 1500,
  "category": "AC Gas Refilling", // NEW FIELD - optional
  "image": "url",
  // ... other fields
}
```

**Validation:**
- If `category` is provided, it must be one of the valid enum values
- Invalid category values should return `400 Bad Request` with error message

#### PATCH `/api/admin/services/:id`
Update the service update endpoint to accept `category` field:

**Request Body:**
```json
{
  "category": "AC Gas Refilling", // NEW FIELD - can be updated
  // ... other fields to update
}
```

**Validation:**
- Same validation rules as POST endpoint
- Category can be set to null to remove categorization

### 3. Admin Panel Updates

The admin panel (ManageServices component) should include a category dropdown when adding/editing services:

**Field Specifications:**
- **Label:** "Service Category"
- **Type:** Dropdown/Select
- **Options:**
  - (Empty/Optional option for "Uncategorized")
  - Water Leakage Repair
  - AC Gas Refilling
  - AC Foam Wash
  - AC Jet Wash Service
  - AC Repair Inspection
  - Split AC Installation
- **Required:** No (optional field)
- **Default:** null/empty
- **Placement:** Should appear after "Title" and "Description" fields

**Example Form Field:**
```jsx
<select
  name="category"
  value={formData.category || ''}
  onChange={handleChange}
  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
>
  <option value="">Select Category (Optional)</option>
  <option value="Water Leakage Repair">Water Leakage Repair</option>
  <option value="AC Gas Refilling">AC Gas Refilling</option>
  <option value="AC Foam Wash">AC Foam Wash</option>
  <option value="AC Jet Wash Service">AC Jet Wash Service</option>
  <option value="AC Repair Inspection">AC Repair Inspection</option>
  <option value="Split AC Installation">Split AC Installation</option>
</select>
```

### 4. Migration Strategy

For existing services in the database, you have two options:

#### Option 1: Manual Assignment (Recommended for Accuracy)
- Admin can manually assign categories through the admin panel
- Most accurate method, allows for review and correction
- Best for smaller datasets or when accuracy is critical

#### Option 2: Automatic Category Detection with Review
Create a migration script that attempts to match service titles/descriptions to categories:

```javascript
// Migration Script Example
const categoryMappings = {
  'Water Leakage Repair': ['water leakage', 'water leak', 'leakage repair', 'leak repair'],
  'AC Gas Refilling': ['gas refilling', 'gas refill', 'gas filling', 'refill gas', 'refrigerant'],
  'AC Foam Wash': ['foam wash', 'foam cleaning'],
  'AC Jet Wash Service': ['jet wash', 'jet cleaning', 'pressure wash'],
  'AC Repair Inspection': ['inspection', 'diagnosis', 'repair inspection', 'ac inspection'],
  'Split AC Installation': ['split ac installation', 'split installation', 'installation split']
};

async function migrateServiceCategories() {
  const services = await Service.find({ category: { $exists: false } });
  
  for (const service of services) {
    const title = (service.title || '').toLowerCase();
    const description = (service.description || '').toLowerCase();
    const searchText = `${title} ${description}`;
    
    let matchedCategory = null;
    
    // Check each category (order matters - more specific first)
    for (const [category, keywords] of Object.entries(categoryMappings)) {
      for (const keyword of keywords) {
        if (searchText.includes(keyword.toLowerCase())) {
          matchedCategory = category;
          break;
        }
      }
      if (matchedCategory) break;
    }
    
    if (matchedCategory) {
      service.category = matchedCategory;
      await service.save();
      console.log(`Updated service "${service.title}" to category "${matchedCategory}"`);
    } else {
      console.log(`No category match for service "${service.title}"`);
    }
  }
}
```

**Usage:**
1. Run migration script to auto-assign categories
2. Review results and manually correct any inaccuracies
3. Update any services that don't match properly

#### Option 3: Hybrid Approach
- Use automatic detection for bulk assignment
- Allow admins to review and correct through admin panel
- Provides speed with accuracy

### 5. Frontend Compatibility

The frontend has been updated to:
- **Primary:** Use `service.category` field if available (exact match)
- **Fallback:** Use intelligent title/description-based matching if category field is missing
- This ensures backward compatibility while transitioning to proper categorization

**Frontend Logic:**
```javascript
// Frontend will prioritize category field
if (service.category && SERVICE_CATEGORIES.includes(service.category)) {
  return service.category; // Exact match from database
}
// Fallback to title matching for services without category field
```

### 6. Validation Rules

**Category Values:**
Only the following exact values (case-sensitive) should be accepted:
- `Water Leakage Repair`
- `AC Gas Refilling`
- `AC Foam Wash`
- `AC Jet Wash Service`
- `AC Repair Inspection`
- `Split AC Installation`

**Validation Implementation:**
```javascript
const SERVICE_CATEGORIES = [
  'Water Leakage Repair',
  'AC Gas Refilling',
  'AC Foam Wash',
  'AC Jet Wash Service',
  'AC Repair Inspection',
  'Split AC Installation'
];

// Validation middleware
const validateCategory = (category) => {
  if (category && !SERVICE_CATEGORIES.includes(category)) {
    throw new Error(`Invalid category. Must be one of: ${SERVICE_CATEGORIES.join(', ')}`);
  }
  return true;
};
```

**Error Response:**
```json
{
  "success": false,
  "message": "Invalid category. Must be one of: Water Leakage Repair, AC Gas Refilling, AC Foam Wash, AC Jet Wash Service, AC Repair Inspection, Split AC Installation"
}
```

### 7. Database Index

Create an index on the `category` field for efficient filtering:

**MongoDB:**
```javascript
db.services.createIndex({ category: 1 });
```

**Mongoose:**
```javascript
serviceSchema.index({ category: 1 });
```

### 8. Testing Checklist

- [ ] Create a new service with a category
- [ ] Create a new service without a category (should work)
- [ ] Update an existing service to add a category
- [ ] Update an existing service to change category
- [ ] Update an existing service to remove category (set to null)
- [ ] Filter services by category via API (GET /api/services?category=...)
- [ ] Test invalid category values are rejected (400 error)
- [ ] Test empty/null category values are accepted
- [ ] Verify category field is returned in all API responses
- [ ] Verify admin panel can assign/update categories
- [ ] Test migration script (if using Option 2 or 3)
- [ ] Verify category filtering works correctly in frontend
- [ ] Verify category counts match filtered results
- [ ] Test backward compatibility with services lacking category field

### 9. Example Service Objects

**Before (without category):**
```json
{
  "_id": "service1",
  "title": "AC Gas Refilling Service",
  "description": "Professional AC gas refilling...",
  "price": 1500,
  "image": "url"
}
```

**After (with category):**
```json
{
  "_id": "service1",
  "title": "AC Gas Refilling Service",
  "description": "Professional AC gas refilling...",
  "price": 1500,
  "image": "url",
  "category": "AC Gas Refilling"
}
```

### 10. Implementation Priority

1. **High Priority:**
   - Add `category` field to Service model (optional, with enum validation)
   - Update POST/PATCH endpoints to accept and validate category
   - Create database index on category field
   - Update admin panel to include category dropdown

2. **Medium Priority:**
   - Update GET endpoint to support category filtering
   - Implement migration script for existing services
   - Add validation for category values

3. **Low Priority:**
   - Analytics/Reporting by category
   - Category-based recommendations
   - Category ordering/preferences

### 11. Example Implementation (Mongoose/MongoDB)

```javascript
// Service Schema
const serviceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
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
    required: false,
    index: true,
    default: null
  },
  image: { type: String },
  // ... other fields
});

// Validation before save
serviceSchema.pre('save', function(next) {
  if (this.category && !serviceSchema.path('category').enumValues.includes(this.category)) {
    return next(new Error('Invalid category value'));
  }
  next();
});

// GET /api/services with category filter
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

// POST /api/admin/services
router.post('/admin/services', async (req, res) => {
  try {
    const { title, description, price, category, image, ...otherFields } = req.body;
    
    // Validate category if provided
    if (category) {
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
    }
    
    const service = new Service({
      title,
      description,
      price,
      category: category || null,
      image,
      ...otherFields
    });
    
    await service.save();
    res.json({ success: true, data: service, message: 'Service created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

### 12. Notes

- The category field is **optional** to maintain backward compatibility
- Frontend will work correctly even if backend doesn't implement categories immediately (uses title matching as fallback)
- Categories can be added gradually to existing services without breaking functionality
- Category names must match **exactly** (case-sensitive) what's defined in the frontend
- Consider adding more categories in the future if needed (update enum accordingly)

### 13. Benefits of Proper Implementation

1. **Accurate Filtering:** Exact category matching is more reliable than title-based matching
2. **Better UX:** Category counts will match filtered results accurately
3. **Performance:** Database-level filtering is faster than client-side filtering
4. **Maintainability:** Easier to manage and update service categorizations
5. **Analytics:** Better reporting and insights by category
6. **Scalability:** Can easily add new categories or subcategories in future

---

**Document Version:** 1.0  
**Created:** [Current Date]  
**Status:** Ready for Implementation  
**Frontend Status:** Ready (with fallback support)

