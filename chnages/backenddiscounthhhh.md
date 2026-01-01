# Backend API Implementation Guide - Dynamic Advance Payment Discount

This document provides the API specifications for implementing dynamic advance payment discount. The frontend has been updated to support one discount setting:
- **Advance Payment Discount (Pay Advance)** - Default 5%

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

**Description:** Fetches public system settings that can be accessed by frontend without authentication. This endpoint is used to get the advance payment discount percentage.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "advancePaymentDiscount": 5
  }
}
```

**Error Responses:**
- `500 Internal Server Error`: Server error (frontend will use default if this fails)

**Implementation Notes:**
- This is a public endpoint (no authentication required)
- Returns only settings that are safe to expose publicly
- If settings don't exist, return default value:
  - `advancePaymentDiscount`: 5
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
    "advancePaymentDiscount": 5,
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

**Description:** Updates system settings. Requires admin authentication. Admin can change discount based on offers, promotions, or business needs.

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "advancePaymentDiscount": 5
}
```

**Request Validation:**
- `advancePaymentDiscount` (number, optional): Must be between 0 and 100
- If value is outside range, return 400 error

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "data": {
    "advancePaymentDiscount": 5,
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
- Allow partial updates (only update fields that are provided)
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
  advancePaymentDiscount: Number, // Default: 5, Range: 0-100
  updatedAt: Date,
  updatedBy: ObjectId, // Reference to User (admin)
  createdAt: Date
}
```

If using SQL, create a settings table:

```sql
CREATE TABLE settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  advance_payment_discount DECIMAL(5,2) DEFAULT 5.00,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);
```

**Important Notes:**
- Store only ONE settings document/row (singleton pattern)
- Use upsert operation to create if doesn't exist, update if exists
- Default value: `advancePaymentDiscount`: 5%

---

## Implementation Steps

### 1. Create Settings Model/Table

**MongoDB Example:**
```javascript
const SettingsSchema = new mongoose.Schema({
  advancePaymentDiscount: {
    type: Number,
    default: 5,
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
    settings = await this.create({ 
      advancePaymentDiscount: 5
    });
  }
  return settings;
};
```

**SQL Example:**
```sql
-- Insert default settings if not exists
INSERT INTO settings (advance_payment_discount, updated_by)
SELECT 5.00, NULL
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
        advancePaymentDiscount: settings.advancePaymentDiscount
      }
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    // Return defaults if error
    res.json({
      success: true,
      data: {
        advancePaymentDiscount: 5
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
        advancePaymentDiscount: settings.advancePaymentDiscount,
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
    const { advancePaymentDiscount } = req.body;

    // Build update object (only include fields that are provided)
    const updateData = {};

    if (advancePaymentDiscount !== undefined && advancePaymentDiscount !== null) {
      const discount = parseFloat(advancePaymentDiscount);
      if (isNaN(discount) || discount < 0 || discount > 100) {
        return res.status(400).json({
          success: false,
          message: 'advancePaymentDiscount must be a number between 0 and 100'
        });
      }
      updateData.advancePaymentDiscount = discount;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one discount field must be provided'
      });
    }

    // Update or create settings
    updateData.updatedAt = new Date();
    updateData.updatedBy = req.user.id;

    const settings = await Settings.findOneAndUpdate(
      {},
      updateData,
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
        advancePaymentDiscount: settings.advancePaymentDiscount,
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
        advancePaymentDiscount: 5,
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

## Discount Application Logic

### Pay Advance
- When customer selects "Pay Advance" option (₹999 advance)
- Apply `advancePaymentDiscount` to total order amount
- Calculate discounted total: `discountedTotal = totalAmount * (1 - advancePaymentDiscount / 100)`
- Advance payment: ₹999
- Remaining amount: `discountedTotal - 999`

### Pay Now (Full Payment)
- When customer selects "Pay Now" option
- No discount is applied
- Customer pays full amount: `totalAmount`

---

## Frontend Integration

The frontend has been updated to:

1. **Load settings on app initialization** via `GET /settings`
2. **Use dynamic discount** throughout the application:
   - `PaymentOptions` component - Shows advance payment discount
   - `Checkout` page - Applies discount only for advance payment
   - `Cart` context - Provides discount value
   - Product detail pages - Shows discount information
3. **Admin can update discount** via `/admin/settings` page

**Frontend expects:**
- Public endpoint at `/settings` (no auth required)
- Admin endpoints at `/admin/settings` (auth required)
- Response format as specified above
- Default value if API fails: `advancePaymentDiscount`: 5%

---

## Testing Checklist

- [ ] Test `GET /settings` returns advance payment discount value
- [ ] Test `GET /admin/settings` with valid admin token
- [ ] Test `GET /admin/settings` with invalid token (should return 401)
- [ ] Test `GET /admin/settings` with non-admin user (should return 403)
- [ ] Test `PUT /admin/settings` with valid discount (0-100)
- [ ] Test `PUT /admin/settings` with invalid discount (>100, should return 400)
- [ ] Test `PUT /admin/settings` with invalid discount (<0, should return 400)
- [ ] Test `PUT /admin/settings` with empty body (should return 400)
- [ ] Test settings persist after server restart
- [ ] Test frontend loads discount from API
- [ ] Test admin can update discount and frontend reflects changes
- [ ] Test Pay Advance discount calculation uses advancePaymentDiscount
- [ ] Test Pay Now option has no discount applied
- [ ] Test discount changes apply to new orders only

---

## Migration Notes

If you have existing orders with old discount structure:

1. **Existing orders should NOT be affected** - they retain their original discount percentage
2. **Only new orders** will use the updated discount percentage
3. **No database migration needed** for existing orders
4. **Settings should be initialized** with default value: `advancePaymentDiscount`: 5%

---

## Important Notes

- **Only one discount** is now supported:
  - `advancePaymentDiscount`: Applied when customer chooses "Pay Advance" (₹999 advance)
- The discount is calculated on the total order amount (before coupon discounts)
- Admin can change the discount based on offers, promotions, or business needs
- Changes to settings apply immediately to new orders
- Existing orders retain their original discount percentage
- Default value: Advance Payment Discount: 5%
- **Pay Now option has no discount** - customers pay full amount

---

## Example Usage

### Update Advance Payment Discount

```bash
curl -X PUT http://localhost:5000/api/admin/settings \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "advancePaymentDiscount": 7
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

## Use Cases

### Special Offer Scenario
Admin wants to run a promotion where Pay Advance gets 10% discount instead of 5%:

```json
PUT /admin/settings
{
  "advancePaymentDiscount": 10
}
```

### Seasonal Discount
Admin wants to increase Pay Advance discount to 8% during festival season:

```json
PUT /admin/settings
{
  "advancePaymentDiscount": 8
}
```

---

Once you implement these endpoints, the frontend will automatically:
- Load the discount percentage on app start
- Use the discount only for Pay Advance option
- Allow admins to update the discount via the settings page
- Display the correct discount percentage throughout the UI
- Apply discount correctly in checkout calculations for advance payments only

