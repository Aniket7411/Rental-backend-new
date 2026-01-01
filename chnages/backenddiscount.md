# Backend API Implementation Guide - Dynamic Instant Payment Discount

This document provides the API specifications for implementing the dynamic instant payment discount feature. The frontend has been updated to use a configurable discount percentage (default 10%) instead of the hardcoded 5% discount.

## Base URL
```
http://localhost:5000/api
```

## Authentication
- Admin endpoints require authentication via Bearer token in the Authorization header
- Public settings endpoint does not require authentication (read-only)

---

## 1. Get Settings (Public - No Auth Required)

**Endpoint:** `GET /settings`

**Description:** Fetches public system settings that can be accessed by frontend without authentication. This endpoint is used to get the instant payment discount percentage.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "instantPaymentDiscount": 10
  }
}
```

**Error Responses:**
- `500 Internal Server Error`: Server error (frontend will use default 10% if this fails)

**Implementation Notes:**
- This is a public endpoint (no authentication required)
- Returns only settings that are safe to expose publicly
- If settings don't exist, return default value of 10%
- This endpoint is called on app initialization to load discount settings

---

## 2. Get Settings (Admin)

**Endpoint:** `GET /admin/settings`

**Description:** Fetches all system settings for admin management. Requires admin authentication.

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "instantPaymentDiscount": 10,
    "updatedAt": "2024-03-15T10:30:00.000Z",
    "updatedBy": "admin_id"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: User is not an admin
- `500 Internal Server Error`: Server error

**Implementation Notes:**
- Returns all settings including metadata (updatedAt, updatedBy)
- If no settings exist, return default values

---

## 3. Update Settings (Admin)

**Endpoint:** `PUT /admin/settings`

**Description:** Updates system settings. Requires admin authentication.

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "instantPaymentDiscount": 10
}
```

**Request Validation:**
- `instantPaymentDiscount` (number, required): Must be between 0 and 100
- If value is outside range, return 400 error

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "data": {
    "instantPaymentDiscount": 10,
    "updatedAt": "2024-03-15T10:30:00.000Z",
    "updatedBy": "admin_id"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input (e.g., discount > 100 or < 0)
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: User is not an admin
- `500 Internal Server Error`: Server error

**Implementation Notes:**
- Validate that discount is between 0 and 100
- Store updatedBy with admin user ID
- Store updatedAt timestamp
- Return updated settings in response

---

## Database Schema Considerations

### Settings Model/Collection

If using MongoDB, create a Settings collection with a single document:

```javascript
{
  _id: ObjectId,
  instantPaymentDiscount: Number, // Default: 10, Range: 0-100
  updatedAt: Date,
  updatedBy: ObjectId, // Reference to User (admin)
  createdAt: Date
}
```

If using SQL, create a settings table:

```sql
CREATE TABLE settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  instant_payment_discount DECIMAL(5,2) DEFAULT 10.00,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);
```

**Important Notes:**
- Store only ONE settings document/row (singleton pattern)
- Use upsert operation to create if doesn't exist, update if exists
- Default value should be 10% (not 5%)

---

## Implementation Steps

### 1. Create Settings Model/Table

**MongoDB Example:**
```javascript
const SettingsSchema = new mongoose.Schema({
  instantPaymentDiscount: {
    type: Number,
    default: 10,
    min: 0,
    max: 100,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
SettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({ instantPaymentDiscount: 10 });
  }
  return settings;
};
```

**SQL Example:**
```sql
-- Insert default settings if not exists
INSERT INTO settings (instant_payment_discount, updated_by)
SELECT 10.00, NULL
WHERE NOT EXISTS (SELECT 1 FROM settings);
```

### 2. Create Route Handlers

**Express.js Example:**

```javascript
// GET /settings (Public)
router.get('/settings', async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json({
      success: true,
      data: {
        instantPaymentDiscount: settings.instantPaymentDiscount
      }
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    // Return default if error
    res.json({
      success: true,
      data: {
        instantPaymentDiscount: 10
      }
    });
  }
});

// GET /admin/settings (Admin only)
router.get('/admin/settings', authenticateAdmin, async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json({
      success: true,
      data: {
        instantPaymentDiscount: settings.instantPaymentDiscount,
        updatedAt: settings.updatedAt,
        updatedBy: settings.updatedBy
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
});

// PUT /admin/settings (Admin only)
router.put('/admin/settings', authenticateAdmin, async (req, res) => {
  try {
    const { instantPaymentDiscount } = req.body;

    // Validation
    if (instantPaymentDiscount === undefined || instantPaymentDiscount === null) {
      return res.status(400).json({
        success: false,
        message: 'instantPaymentDiscount is required'
      });
    }

    const discount = parseFloat(instantPaymentDiscount);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      return res.status(400).json({
        success: false,
        message: 'instantPaymentDiscount must be a number between 0 and 100'
      });
    }

    // Update or create settings
    const settings = await Settings.findOneAndUpdate(
      {},
      {
        instantPaymentDiscount: discount,
        updatedAt: new Date(),
        updatedBy: req.user.id
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        instantPaymentDiscount: settings.instantPaymentDiscount,
        updatedAt: settings.updatedAt,
        updatedBy: settings.updatedBy
      }
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
});
```

### 3. Add Authentication Middleware

Ensure `/admin/settings` routes are protected with admin authentication:

```javascript
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};
```

### 4. Initialize Default Settings

Create a migration script or initialization function to ensure default settings exist:

```javascript
// Initialize default settings on server start
async function initializeSettings() {
  try {
    const settings = await Settings.findOne();
    if (!settings) {
      await Settings.create({
        instantPaymentDiscount: 10,
        updatedBy: null
      });
      console.log('Default settings initialized');
    }
  } catch (error) {
    console.error('Error initializing settings:', error);
  }
}

// Call on server start
initializeSettings();
```

---

## Frontend Integration

The frontend has been updated to:

1. **Load settings on app initialization** via `GET /settings`
2. **Use dynamic discount** throughout the application:
   - PaymentOptions component
   - Checkout page
   - Cart context
   - Product detail pages
3. **Admin can update settings** via `/admin/settings` page

**Frontend expects:**
- Public endpoint at `/settings` (no auth required)
- Admin endpoints at `/admin/settings` (auth required)
- Response format as specified above
- Default value of 10% if API fails

---

## Testing Checklist

- [ ] Test `GET /settings` returns default 10% discount
- [ ] Test `GET /admin/settings` with valid admin token
- [ ] Test `GET /admin/settings` with invalid token (should return 401)
- [ ] Test `GET /admin/settings` with non-admin user (should return 403)
- [ ] Test `PUT /admin/settings` with valid discount (0-100)
- [ ] Test `PUT /admin/settings` with invalid discount (>100, should return 400)
- [ ] Test `PUT /admin/settings` with invalid discount (<0, should return 400)
- [ ] Test `PUT /admin/settings` with missing discount (should return 400)
- [ ] Test settings persist after server restart
- [ ] Test frontend loads discount from API
- [ ] Test admin can update discount and frontend reflects changes
- [ ] Test discount calculation in checkout uses new percentage

---

## Migration Notes

If you have existing orders with 5% discount:

1. **Existing orders should NOT be affected** - they retain their original discount percentage
2. **Only new orders** will use the updated discount percentage
3. **No database migration needed** for existing orders
4. **Settings should be initialized** with default value of 10%

---

## Important Notes

- The discount is applied when customers choose "Pay Now" or "Pay Advance" payment options
- The discount is calculated on the total order amount (before coupon discounts)
- Changes to settings apply immediately to new orders
- Existing orders retain their original discount percentage
- The default discount has been changed from 5% to 10%
- Admin can change the discount percentage at any time via the admin panel

---

## Example Usage

### Update Discount to 15%

```bash
curl -X PUT http://localhost:5000/api/admin/settings \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "instantPaymentDiscount": 15
  }'
```

### Get Current Settings (Public)

```bash
curl http://localhost:5000/api/settings
```

### Get Current Settings (Admin)

```bash
curl http://localhost:5000/api/admin/settings \
  -H "Authorization: Bearer <admin_token>"
```

---

Once you implement these endpoints, the frontend will automatically:
- Load the discount percentage on app start
- Use the dynamic discount in all calculations
- Allow admins to update the discount via the settings page
- Display the correct discount percentage throughout the UI

