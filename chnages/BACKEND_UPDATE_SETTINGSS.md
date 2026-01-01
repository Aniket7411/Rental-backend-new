# Backend Update: Admin Settings API

## Issue Description
The admin settings page at `/admin/settings` is unable to update payment discount percentages dynamically. Even though the API returns a successful response, the frontend is not reflecting the updated values. The following settings need to be editable:

1. **Instant Payment Discount (Pay Now)** - Percentage discount for full upfront payment
2. **Advance Payment Discount (Book Now)** - Percentage discount for advance payment option
3. **Advance Payment Amount (Book Now)** - Fixed amount for advance payment

## Frontend Fixes Applied

### 1. Settings Context Refresh
**File:** `src/pages/admin/ManageSettings.js`

**Issue:** After successfully updating settings, the `SettingsContext` was not being refreshed, causing other components (like `PaymentOptions`) to continue using old values.

**Fix Applied:**
- Imported `useSettings` hook from `SettingsContext`
- Added `refreshSettings()` call after successful update to refresh the global settings context
- This ensures all components using settings get the updated values immediately

**Code Changes:**
```javascript
import { useSettings } from '../../context/SettingsContext';

// Inside component
const { refreshSettings } = useSettings();

// In handleSave function
if (response.success) {
  success('Settings saved successfully');
  await loadSettings(); // Reload local settings
  await refreshSettings(); // Refresh SettingsContext for all components
}
```

### 2. Data Validation
**File:** `src/pages/admin/ManageSettings.js`

**Fix Applied:**
- Added explicit number conversion before sending to API
- Ensures all values are valid numbers with fallback defaults

**Code Changes:**
```javascript
const settingsToSave = {
  instantPaymentDiscount: Number(settings.instantPaymentDiscount) || 10,
  advancePaymentDiscount: Number(settings.advancePaymentDiscount) || 5,
  advancePaymentAmount: Number(settings.advancePaymentAmount) || 500,
};
```

## Backend API Requirements

### Endpoint: `PUT /api/admin/settings`

**Authentication:** Required (Admin only)
- Header: `Authorization: Bearer <admin_token>`

**Request Body:**
```json
{
  "instantPaymentDiscount": 10,
  "advancePaymentDiscount": 5,
  "advancePaymentAmount": 500
}
```

**Field Descriptions:**
- `instantPaymentDiscount` (number, required): Percentage discount (0-100) applied when customers choose "Pay Now" (full upfront payment)
- `advancePaymentDiscount` (number, required): Percentage discount (0-100) applied when customers choose "Book Now" (advance payment)
- `advancePaymentAmount` (number, required): Fixed amount in rupees that customers pay as advance when choosing "Book Now"

**Validation Rules:**
1. All fields must be numbers
2. `instantPaymentDiscount` must be between 0 and 100 (inclusive)
3. `advancePaymentDiscount` must be between 0 and 100 (inclusive)
4. `advancePaymentAmount` must be a positive number (minimum 1)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "data": {
    "instantPaymentDiscount": 10,
    "advancePaymentDiscount": 5,
    "advancePaymentAmount": 500,
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

**400 Bad Request - Validation Error:**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": {
    "instantPaymentDiscount": "Must be between 0 and 100",
    "advancePaymentDiscount": "Must be between 0 and 100",
    "advancePaymentAmount": "Must be a positive number"
  }
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized. Admin access required."
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to update settings"
}
```

### Endpoint: `GET /api/admin/settings`

**Authentication:** Required (Admin only)
- Header: `Authorization: Bearer <admin_token>`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "instantPaymentDiscount": 10,
    "advancePaymentDiscount": 5,
    "advancePaymentAmount": 500,
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**If settings don't exist (200 with defaults):**
```json
{
  "success": true,
  "data": {
    "instantPaymentDiscount": 10,
    "advancePaymentDiscount": 5,
    "advancePaymentAmount": 500
  }
}
```

### Endpoint: `GET /api/settings` (Public)

**Authentication:** Not required

**Purpose:** Public endpoint for frontend to fetch current settings for payment calculations

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "instantPaymentDiscount": 10,
    "advancePaymentDiscount": 5,
    "advancePaymentAmount": 500
  }
}
```

**Note:** This endpoint should return the same settings but without requiring authentication. Used by `SettingsContext` to load settings on app initialization.

## Database Schema

### Settings Collection/Table

**Recommended Structure:**
```javascript
{
  _id: ObjectId,
  instantPaymentDiscount: Number, // 0-100, default: 10
  advancePaymentDiscount: Number, // 0-100, default: 5
  advancePaymentAmount: Number,   // Positive number, default: 500
  updatedAt: Date,
  updatedBy: ObjectId (reference to admin user)
}
```

**Notes:**
- Since there's only one settings document, you can use a singleton pattern
- The document ID can be fixed (e.g., `"system_settings"`) or you can ensure only one document exists
- On first creation, use default values if not provided

## Backend Implementation Checklist

- [ ] Create/Update Settings model/schema
- [ ] Implement `PUT /api/admin/settings` endpoint
  - [ ] Validate admin authentication
  - [ ] Validate input data (numbers, ranges)
  - [ ] Update or create settings document
  - [ ] Return updated settings in response
- [ ] Implement `GET /api/admin/settings` endpoint
  - [ ] Validate admin authentication
  - [ ] Return current settings or defaults if not set
- [ ] Implement `GET /api/settings` endpoint (public)
  - [ ] Return current settings or defaults
  - [ ] No authentication required
- [ ] Add proper error handling
- [ ] Add input validation middleware
- [ ] Test all endpoints with Postman/Thunder Client

## Testing Guide

### Test Case 1: Update Settings (Admin)
```bash
PUT /api/admin/settings
Headers:
  Authorization: Bearer <admin_token>
  Content-Type: application/json

Body:
{
  "instantPaymentDiscount": 15,
  "advancePaymentDiscount": 8,
  "advancePaymentAmount": 999
}

Expected: 200 OK with updated settings
```

### Test Case 2: Get Settings (Admin)
```bash
GET /api/admin/settings
Headers:
  Authorization: Bearer <admin_token>

Expected: 200 OK with current settings
```

### Test Case 3: Get Settings (Public)
```bash
GET /api/settings
Headers: None

Expected: 200 OK with current settings
```

### Test Case 4: Validation Error
```bash
PUT /api/admin/settings
Headers:
  Authorization: Bearer <admin_token>
  Content-Type: application/json

Body:
{
  "instantPaymentDiscount": 150,  // Invalid: > 100
  "advancePaymentDiscount": -5,   // Invalid: < 0
  "advancePaymentAmount": 0       // Invalid: must be > 0
}

Expected: 400 Bad Request with validation errors
```

### Test Case 5: Unauthorized Access
```bash
PUT /api/admin/settings
Headers:
  Authorization: Bearer <invalid_token>

Expected: 401 Unauthorized
```

## Frontend Integration Notes

1. **API Service:** The frontend uses `apiService.updateSettings()` which calls `PUT /api/admin/settings`
2. **Response Handling:** Frontend expects `response.success === true` and `response.data` with the updated settings
3. **Settings Context:** After successful update, frontend refreshes `SettingsContext` to update all components
4. **Public Settings:** Frontend uses `apiService.getPublicSettings()` which calls `GET /api/settings` (no auth required)

## Important Notes

1. **Singleton Pattern:** Since there's only one settings document, ensure your backend either:
   - Uses a fixed document ID (e.g., `"system_settings"`)
   - Or uses `findOneAndUpdate` with `upsert: true` to create if not exists

2. **Default Values:** If settings don't exist, return these defaults:
   - `instantPaymentDiscount`: 10
   - `advancePaymentDiscount`: 5
   - `advancePaymentAmount`: 500

3. **Data Persistence:** Ensure settings are persisted in database and survive server restarts

4. **Response Format:** Always return settings in the exact format shown above to match frontend expectations

5. **Caching (Optional):** Consider caching settings in memory for faster access, but ensure updates are immediately reflected

## Example Backend Implementation (Node.js/Express)

```javascript
// routes/admin/settings.js
const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { authenticateAdmin } = require('../middleware/auth');

// GET /api/admin/settings - Get settings (Admin)
router.get('/admin/settings', authenticateAdmin, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    
    if (!settings) {
      // Return defaults if settings don't exist
      settings = {
        instantPaymentDiscount: 10,
        advancePaymentDiscount: 5,
        advancePaymentAmount: 500
      };
    }
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
});

// PUT /api/admin/settings - Update settings (Admin)
router.put('/admin/settings', authenticateAdmin, async (req, res) => {
  try {
    const { instantPaymentDiscount, advancePaymentDiscount, advancePaymentAmount } = req.body;
    
    // Validation
    if (typeof instantPaymentDiscount !== 'number' || instantPaymentDiscount < 0 || instantPaymentDiscount > 100) {
      return res.status(400).json({
        success: false,
        message: 'instantPaymentDiscount must be a number between 0 and 100'
      });
    }
    
    if (typeof advancePaymentDiscount !== 'number' || advancePaymentDiscount < 0 || advancePaymentDiscount > 100) {
      return res.status(400).json({
        success: false,
        message: 'advancePaymentDiscount must be a number between 0 and 100'
      });
    }
    
    if (typeof advancePaymentAmount !== 'number' || advancePaymentAmount < 1) {
      return res.status(400).json({
        success: false,
        message: 'advancePaymentAmount must be a positive number'
      });
    }
    
    // Update or create settings (singleton pattern)
    const settings = await Settings.findOneAndUpdate(
      {}, // Empty filter - update the only document
      {
        instantPaymentDiscount,
        advancePaymentDiscount,
        advancePaymentAmount,
        updatedAt: new Date(),
        updatedBy: req.user._id
      },
      {
        upsert: true, // Create if doesn't exist
        new: true,    // Return updated document
        setDefaultsOnInsert: true
      }
    );
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
});

// GET /api/settings - Get settings (Public)
router.get('/settings', async (req, res) => {
  try {
    let settings = await Settings.findOne();
    
    if (!settings) {
      // Return defaults if settings don't exist
      settings = {
        instantPaymentDiscount: 10,
        advancePaymentDiscount: 5,
        advancePaymentAmount: 500
      };
    }
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    // Return defaults on error
    res.json({
      success: true,
      data: {
        instantPaymentDiscount: 10,
        advancePaymentDiscount: 5,
        advancePaymentAmount: 500
      }
    });
  }
});

module.exports = router;
```

## Summary

The frontend has been fixed to properly refresh the settings context after updates. The backend needs to ensure:

1. **PUT /api/admin/settings** endpoint properly validates and saves settings
2. **GET /api/admin/settings** endpoint returns current settings
3. **GET /api/settings** public endpoint returns current settings (no auth)
4. All endpoints return data in the expected format
5. Settings are persisted in the database
6. Default values are returned if settings don't exist

Once the backend is updated according to this specification, the admin settings page will work correctly and all components using these settings will reflect the updated values immediately.

