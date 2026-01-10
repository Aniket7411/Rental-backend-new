# Backend Update Requirements for Checkout Flow

## Overview
This document outlines the backend changes required to support the updated checkout flow with proper email validation and guest checkout functionality.

## Frontend Changes Summary

### 1. Signup Flow - Email Mandatory
- **File**: `src/pages/Signup.js`
- **Change**: Email is now **mandatory** for signup
- **Validation**: Email must be provided and must be a valid email format before OTP is sent
- **Behavior**: OTP will only be sent if a valid email is provided

### 2. Guest Checkout Flow - Email Optional
- **File**: `src/components/GuestCheckoutOTP.js`
- **Change**: Email is **optional** for guest checkout
- **Behavior**: 
  - Users can place orders without providing email
  - If email is provided but not registered, system should still allow checkout
  - User will be auto-registered after order placement

## Backend API Changes Required

### Issue Identified
**Current Problem**: When a user does guest checkout and provides an email that is not registered, they receive OTP but get error: "email is not registered". This prevents them from placing orders.

**Expected Behavior**: 
- Guest checkout should work even if email is not registered
- Email should be optional for guest checkout
- User should be automatically registered after order placement

### Required Backend Changes

#### 1. Update `/api/auth/send-signup-otp` Endpoint

**Current Behavior** (May need verification):
- Checks if email exists if provided
- Rejects if email is provided but not registered

**Required Behavior**:
- If phone number exists: Send login OTP (existing user)
- If phone number doesn't exist: Send signup OTP (new user)
- **Email should be optional and should NOT block OTP sending**
- If email is provided, store it for later use (during account creation)
- Do NOT check if email is registered - allow OTP to be sent regardless

**Request Body**:
```json
{
  "phone": "+911234567890",
  "name": "John Doe",
  "email": "user@example.com"  // Optional - should not block OTP if not provided or not registered
}
```

**Expected Response** (Success):
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "sessionId": "unique-session-id-here"
}
```

**Error Response** (Should NOT occur for email issues):
```json
{
  "success": false,
  "message": "Failed to send OTP. Please try again."
}
```

**Note**: Email-related errors like "email is not registered" should NOT be returned from this endpoint.

#### 2. Update `/api/auth/verify-signup-otp` Endpoint

**Current Behavior** (May need verification):
- May check if email exists and reject if not registered

**Required Behavior**:
- Verify OTP with session ID
- If user exists (by phone): Log them in and return user data
- If user doesn't exist (by phone): **Create new user account** with provided details
  - Name: Use provided name or null
  - Phone: Required (from OTP verification)
  - Email: Use provided email if available, otherwise null (optional)
  - Address: Use provided address if available
- **DO NOT check if email is registered before creating account**
- **Email should be optional** - account creation should succeed even without email
- If email is provided but already exists in another account, handle gracefully:
  - Option 1: Update current user account with email (if no conflict)
  - Option 2: Create account without email and return warning
  - Option 3: Merge with existing account (if phone matches existing account with different email)

**Request Body**:
```json
{
  "phone": "+911234567890",
  "otp": "123456",
  "sessionId": "unique-session-id-here",
  "name": "John Doe",           // Optional
  "email": "user@example.com",  // Optional - should not block account creation
  "homeAddress": "123 Main St"  // Optional
}
```

**Expected Response** (Success):
```json
{
  "success": true,
  "message": "Account created successfully" OR "Login successful",
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "phone": "+911234567890",
    "email": "user@example.com" OR null,  // Can be null for guest checkout
    "role": "user",
    "homeAddress": "123 Main St" OR null,
    "address": {
      "homeAddress": "123 Main St" OR "",
      "nearLandmark": "",
      "pincode": "",
      "alternateNumber": ""
    },
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Response** (Only for OTP/session issues):
```json
{
  "success": false,
  "message": "Invalid OTP" OR "OTP expired" OR "Session expired"
}
```

**Important**: Do NOT return errors like "Email is not registered" from this endpoint.

#### 3. Update Order Creation Flow (Auto-Registration)

**Current Behavior** (May need verification):
- Orders require authenticated user
- May check for registered email

**Required Behavior**:
- Orders can be created after OTP verification (user is authenticated)
- If user was created during guest checkout (email optional), order should still be created
- After successful order creation, ensure user account exists:
  - If user was just created via OTP: Account already exists, no action needed
  - If user exists but missing details: Update user with order information (if available)

**Order Creation Endpoint**: `POST /api/orders`

**Request** (after OTP verification - user is authenticated):
```json
{
  "orderId": "ORD-2024-123",
  "items": [...],
  "total": 10000,
  "customerInfo": {
    "userId": "user-id-from-token",
    "name": "John Doe",
    "email": "user@example.com" OR null,  // Can be null
    "phone": "+911234567890"
  },
  ...
}
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "orderId": "ORD-2024-123",
    "status": "pending",
    ...
  }
}
```

## Database Schema Considerations

### User Model
Ensure User model/schema allows:
- Email to be optional/nullable
- Phone to be required and unique
- Account creation without email

**Example Schema** (if using MongoDB/Mongoose):
```javascript
{
  name: { type: String, required: false },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: false, unique: true, sparse: true }, // Optional, unique only if provided
  role: { type: String, default: 'user' },
  homeAddress: { type: String, required: false },
  address: {
    homeAddress: { type: String },
    nearLandmark: { type: String },
    pincode: { type: String },
    alternateNumber: { type: String }
  },
  createdAt: { type: Date, default: Date.now },
  // Optional: Track if user was created via guest checkout
  isGuestCheckout: { type: Boolean, default: false },
  guestCheckoutDate: { type: Date }
}
```

**Key Points**:
- `email` should have `sparse: true` index (unique only if email exists)
- `phone` should be unique and required
- Email should NOT block account creation

## Implementation Checklist

### Priority 1: Critical Fixes (Required Immediately)

- [ ] **Fix `/api/auth/send-signup-otp`**: Remove email registration check
  - Allow OTP to be sent even if email is not registered
  - Store email in session for later use during account creation
  - Only validate email format (if provided), not registration status

- [ ] **Fix `/api/auth/verify-signup-otp`**: Allow account creation without email
  - Remove any email registration checks
  - Create user account with phone (required) and email (optional)
  - If user exists by phone, log them in (ignore email status)
  - If user doesn't exist, create new account (email can be null)

- [ ] **Update User Model**: Make email optional
  - Ensure email field is nullable/optional
  - Update validation to allow null emails
  - Ensure unique constraint on email uses sparse index (only unique if email exists)

- [ ] **Test Order Creation**: Verify orders can be created after guest checkout
  - Test with email provided
  - Test without email provided
  - Verify user is properly associated with order

### Priority 2: Enhancements (Recommended)

- [ ] **Handle Email Conflicts**: If email already exists in another account
  - Option A: Update current user with email (if email account has same phone)
  - Option B: Create account without email and return info message
  - Option C: Merge accounts if phone matches

- [ ] **Add Guest Checkout Tracking**: Track users created via guest checkout
  - Add `isGuestCheckout` flag to user model
  - Set flag when user is created during guest checkout
  - Useful for analytics and support

- [ ] **Email Update Flow**: Allow users to add/update email later
  - Endpoint: `PATCH /api/users/profile` or `PATCH /api/users/email`
  - Validate email format
  - Check for duplicates before updating
  - Update user email if valid and unique

### Priority 3: Validation & Security (Best Practices)

- [ ] **Email Format Validation**: Validate email format (if provided)
  - Use proper regex or validation library
  - Return clear error message if format is invalid
  - But do NOT block OTP sending for invalid format - only warn

- [ ] **Phone Number Validation**: Ensure consistent phone format
  - Normalize phone numbers (add country code if missing)
  - Validate phone number format
  - Store in consistent format (e.g., +911234567890)

- [ ] **Rate Limiting**: Implement proper rate limiting
  - Limit OTP send requests: 3 per phone per 15 minutes
  - Limit OTP verify attempts: 5 per session
  - Prevent abuse while allowing legitimate use

## Testing Scenarios

### Test Case 1: Guest Checkout Without Email
**Steps**:
1. User adds items to cart (not logged in)
2. User clicks checkout
3. Guest checkout modal appears
4. User enters: Name, Phone (no email)
5. User receives OTP
6. User verifies OTP
7. User places order successfully

**Expected Result**: 
- ✅ OTP is sent successfully
- ✅ Account is created without email (email = null)
- ✅ Order is placed successfully
- ✅ User is authenticated and can view order

### Test Case 2: Guest Checkout With Unregistered Email
**Steps**:
1. User adds items to cart (not logged in)
2. User clicks checkout
3. Guest checkout modal appears
4. User enters: Name, Phone, Email (not registered)
5. User receives OTP
6. User verifies OTP
7. User places order successfully

**Expected Result**:
- ✅ OTP is sent successfully (no "email not registered" error)
- ✅ Account is created with provided email
- ✅ Order is placed successfully
- ✅ User is authenticated and can view order

### Test Case 3: Guest Checkout With Existing Phone
**Steps**:
1. User adds items to cart (not logged in)
2. User clicks checkout
3. Guest checkout modal appears
4. User enters: Name, Phone (existing user's phone)
5. User receives OTP
6. User verifies OTP
7. User is logged in (not new account created)
8. User places order successfully

**Expected Result**:
- ✅ OTP is sent successfully
- ✅ Existing user is logged in (no duplicate account)
- ✅ Order is placed successfully
- ✅ User is authenticated with existing account

### Test Case 4: Signup With Valid Email (Email Mandatory)
**Steps**:
1. User goes to signup page
2. User enters: Name, Phone, Valid Email
3. User receives OTP
4. User verifies OTP
5. Account is created

**Expected Result**:
- ✅ Email validation works (valid email required)
- ✅ OTP is sent only if email is valid
- ✅ Account is created with email
- ✅ User is authenticated

### Test Case 5: Signup Without Email (Should Fail)
**Steps**:
1. User goes to signup page
2. User enters: Name, Phone (no email)
3. User tries to send OTP

**Expected Result**:
- ❌ Error: "Email address is required for signup"
- ❌ OTP is NOT sent
- ❌ User must provide valid email to continue

## Error Handling

### Common Errors and Solutions

#### Error 1: "Email is not registered"
**Current Issue**: Returned when email is provided but not in database
**Fix**: Remove this check from `/api/auth/send-signup-otp` and `/api/auth/verify-signup-otp`
**Expected Behavior**: OTP should be sent and account should be created regardless of email registration status

#### Error 2: "Email is required"
**Context**: Should only appear in signup flow (frontend validation)
**Backend**: Should not return this error - email is optional for guest checkout

#### Error 3: "Invalid email format"
**Context**: When email format is invalid
**Fix**: Validate format but don't block OTP - allow account creation without email if format is invalid
**Expected Behavior**: If email format is invalid, create account without email (or return format error but still allow account creation)

#### Error 4: "Email already exists"
**Context**: When email is provided but exists in another account
**Fix**: Handle gracefully - either update current account or create without email
**Expected Behavior**: 
- If phone matches existing account with different email: Update email if valid
- If phone is new but email exists: Create account without email (or merge if appropriate)

## API Response Format Standards

Ensure all endpoints follow consistent response format:

**Success Response**:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ },
  "sessionId": "..." // If applicable
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Clear error description",
  "error": "ERROR_CODE", // Optional
  "details": {} // Optional additional error details
}
```

## Security Considerations

1. **OTP Security**:
   - Generate secure random OTPs
   - Store OTPs with expiration (5-10 minutes)
   - Invalidate OTP after successful verification
   - Limit OTP verification attempts

2. **Rate Limiting**:
   - Limit OTP send: 3 per phone per 15 minutes
   - Limit OTP verify: 5 attempts per session
   - Implement IP-based rate limiting

3. **Data Validation**:
   - Validate phone number format
   - Validate email format (if provided)
   - Sanitize all user inputs
   - Prevent SQL injection and XSS

4. **Authentication**:
   - Ensure JWT tokens are properly generated after OTP verification
   - Set appropriate token expiration
   - Validate tokens on protected endpoints

## Monitoring & Logging

Add logging for:
- OTP send attempts (success/failure with phone)
- OTP verification attempts (success/failure)
- Account creation via guest checkout
- Order creation after guest checkout
- Email-related errors (for debugging)

**Log Format Example**:
```
[INFO] OTP sent: phone=+911234567890, sessionId=abc123
[INFO] Account created: userId=xyz, phone=+911234567890, email=null, source=guest_checkout
[WARN] Email conflict: email=user@example.com, existingUserId=old123, newUserId=new456
[ERROR] OTP verification failed: sessionId=abc123, reason=expired
```

## Migration Steps (If Database Changes Required)

If email field is currently required:

1. **Backup Database**: Always backup before schema changes
2. **Update Schema**: Make email field optional/nullable
3. **Update Existing Records**: Set email to null for users without email (if any)
4. **Update Indexes**: Add sparse unique index on email (if using MongoDB)
5. **Update Code**: Remove email validation/requirement checks
6. **Test Thoroughly**: Test all scenarios before deploying

## Conclusion

The main changes required are:
1. **Remove email registration checks** from OTP endpoints
2. **Make email optional** in user model/schema
3. **Allow account creation without email** for guest checkout
4. **Ensure order creation works** after guest checkout

These changes will enable seamless guest checkout while maintaining email requirement for regular signup.

---

**Last Updated**: January 2024
**Priority**: High (Blocks guest checkout functionality)
**Status**: Backend Implementation Required
**Estimated Effort**: 2-4 hours (depending on current implementation)

