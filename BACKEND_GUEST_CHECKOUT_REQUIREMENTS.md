# Backend Requirements for Guest Checkout with OTP

## Overview
The frontend has been updated to support guest checkout with OTP verification. This document outlines what needs to be verified and potentially updated in the backend to ensure seamless guest checkout functionality.

## Frontend Implementation Summary
- **Component**: `src/components/GuestCheckoutOTP.js` - Handles OTP verification for guest users
- **Modified Files**:
  - `src/pages/user/Checkout.js` - Now supports guest checkout flow
  - `src/pages/user/Cart.js` - Allows navigation to checkout without authentication

## Backend API Endpoints Used

### 1. OTP Signup Endpoints (Already Implemented)
These endpoints should already exist and work correctly:

#### POST `/api/auth/send-signup-otp`
**Purpose**: Send OTP to phone number for guest checkout/signup

**Request Body**:
```json
{
  "phone": "+911234567890",  // Formatted phone number (10 digits)
  "name": "John Doe",        // Optional - user's name
  "email": "user@example.com" // Optional - user's email
}
```

**Expected Response**:
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "sessionId": "unique-session-id-here"
}
```

**Requirements**:
- ✅ Should generate a 6-digit OTP
- ✅ Should send OTP via SMS to the phone number
- ✅ Should store OTP with session ID and expiration (typically 5-10 minutes)
- ✅ Should handle existing users (if phone exists, send login OTP instead)
- ✅ Should rate limit OTP requests (e.g., max 3 requests per phone per 15 minutes)

#### POST `/api/auth/verify-signup-otp`
**Purpose**: Verify OTP and create user account (or login if exists)

**Request Body**:
```json
{
  "phone": "+911234567890",
  "otp": "123456",
  "sessionId": "unique-session-id-here",
  "name": "John Doe",           // Optional - for new users
  "email": "user@example.com",  // Optional - for new users
  "homeAddress": "123 Main St"  // Optional - for new users
}
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Account created successfully" OR "Login successful",
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "phone": "+911234567890",
    "email": "user@example.com",
    "role": "user",
    "homeAddress": "123 Main St",
    "address": {
      "homeAddress": "123 Main St",
      "nearLandmark": "",
      "pincode": "",
      "alternateNumber": ""
    }
  }
}
```

**Requirements**:
- ✅ Verify OTP matches and hasn't expired
- ✅ If user exists (by phone), log them in and return user data
- ✅ If user doesn't exist, create new user account with provided details
- ✅ Return JWT token for authentication
- ✅ Save optional fields (name, email, homeAddress) if provided
- ✅ Handle duplicate phone numbers gracefully

## Backend Verification Checklist

### 1. OTP Service Configuration
- [ ] SMS gateway (Twilio/AWS SNS/etc.) is configured and working
- [ ] OTP generation logic creates secure 6-digit codes
- [ ] OTP expiration time is set (recommended: 5-10 minutes)
- [ ] OTP storage is secure (encrypted or hashed if stored in DB)

### 2. User Account Creation
- [ ] New user accounts are created correctly when phone doesn't exist
- [ ] User role defaults to "user" for guest checkout
- [ ] Optional fields (name, email, address) are saved if provided
- [ ] Phone number is stored in consistent format (with country code)

### 3. Existing User Handling
- [ ] If phone number exists, user is logged in instead of creating duplicate
- [ ] Existing user data is returned correctly
- [ ] User preferences/settings are preserved

### 4. Security & Rate Limiting
- [ ] Rate limiting on OTP send requests (prevent abuse)
- [ ] Rate limiting on OTP verify attempts (prevent brute force)
- [ ] Session ID validation prevents replay attacks
- [ ] OTP can only be used once (invalidate after successful verification)

### 5. Order Creation After OTP
- [ ] Orders can be created with authenticated user (after OTP verification)
- [ ] Order creation endpoint `/api/orders` accepts authenticated requests
- [ ] User ID from token is correctly associated with order
- [ ] Guest checkout orders are treated same as regular orders

## Backend Changes Required (If Needed)

### Minimal Changes Required
If the existing OTP signup flow works correctly, **NO backend changes are needed**. The frontend uses existing endpoints:
- `POST /api/auth/send-signup-otp`
- `POST /api/auth/verify-signup-otp`

### Optional Enhancements

#### 1. Guest Order Tracking (Optional)
If you want to track "guest orders" separately:
```javascript
// In Order model/schema
{
  orderType: {
    type: String,
    enum: ['guest', 'registered'],
    default: 'registered'
  }
}
```

#### 2. Guest User Flag (Optional)
Mark users created via guest checkout:
```javascript
// In User model/schema
{
  isGuest: {
    type: Boolean,
    default: false
  },
  guestCheckoutDate: {
    type: Date
  }
}
```

#### 3. Enhanced Address Handling
Ensure address is properly saved during OTP verification:
```javascript
// In verify-signup-otp endpoint
if (userData.homeAddress) {
  user.homeAddress = userData.homeAddress;
  user.address = {
    homeAddress: userData.homeAddress,
    ...user.address // Preserve existing address fields
  };
  await user.save();
}
```

## Testing Checklist

### Backend Testing
1. **Test OTP Sending**:
   ```bash
   POST /api/auth/send-signup-otp
   Body: { "phone": "+911234567890", "name": "Test User" }
   ```
   - ✅ OTP is sent to phone
   - ✅ Session ID is returned
   - ✅ Rate limiting works (try 4+ requests quickly)

2. **Test OTP Verification (New User)**:
   ```bash
   POST /api/auth/verify-signup-otp
   Body: { "phone": "+911234567890", "otp": "123456", "sessionId": "..." }
   ```
   - ✅ New user account is created
   - ✅ JWT token is returned
   - ✅ User data includes all provided fields

3. **Test OTP Verification (Existing User)**:
   - ✅ User is logged in (not duplicated)
   - ✅ Existing user data is returned
   - ✅ Token is valid for authenticated requests

4. **Test Order Creation After Guest Checkout**:
   - ✅ Create order with JWT token from OTP verification
   - ✅ Order is associated with user correctly
   - ✅ Payment processing works

### Frontend-Backend Integration Testing
1. ✅ Complete guest checkout flow end-to-end
2. ✅ Verify user can place order after OTP verification
3. ✅ Verify user can view order history after checkout
4. ✅ Test with existing phone number (should login, not create duplicate)

## Common Issues & Solutions

### Issue 1: OTP Not Being Sent
**Symptoms**: Frontend receives error "Failed to send OTP"
**Solutions**:
- Check SMS gateway credentials
- Verify phone number format (should include country code)
- Check rate limiting configuration
- Review server logs for SMS gateway errors

### Issue 2: OTP Verification Fails
**Symptoms**: "Invalid OTP" error even with correct code
**Solutions**:
- Check OTP expiration time (may be too short)
- Verify session ID is being passed correctly
- Check OTP storage/retrieval logic
- Ensure OTP isn't being invalidated prematurely

### Issue 3: User Duplication
**Symptoms**: Multiple accounts created for same phone number
**Solutions**:
- Ensure phone number lookup happens before account creation
- Check phone number normalization (format consistency)
- Verify database unique constraint on phone field

### Issue 4: Order Creation Fails After OTP
**Symptoms**: Order creation fails even after successful OTP verification
**Solutions**:
- Verify JWT token is being sent in Authorization header
- Check token expiration time (may be too short)
- Verify user ID extraction from token
- Check order creation endpoint authentication middleware

## API Response Format Standards

Ensure all endpoints return consistent format:

**Success Response**:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE"
}
```

## Security Best Practices

1. **OTP Security**:
   - Generate cryptographically secure random OTPs
   - Store OTPs with expiration time
   - Hash OTPs if stored in database
   - Limit OTP attempts (e.g., 3 attempts before requiring new OTP)

2. **Rate Limiting**:
   - Limit OTP requests: 3 per phone per 15 minutes
   - Limit OTP verification: 5 attempts per session
   - Implement IP-based rate limiting for additional security

3. **Session Management**:
   - Use secure, random session IDs
   - Store sessions with expiration
   - Invalidate sessions after successful verification or expiration

4. **Data Validation**:
   - Validate phone number format (10 digits + country code)
   - Sanitize user input (name, email, address)
   - Validate email format if provided

## Monitoring & Logging

Add logging for:
- OTP send attempts (success/failure)
- OTP verification attempts (success/failure)
- Guest checkout completions
- Failed authentication attempts
- Rate limit violations

## Support & Maintenance

### Regular Maintenance
- Monitor OTP delivery success rates
- Review failed OTP verification attempts
- Check for rate limiting false positives
- Monitor SMS gateway costs

### Performance Optimization
- Cache OTP sessions in Redis for faster lookups
- Use async SMS sending (don't block API response)
- Implement OTP cleanup job (remove expired OTPs)

## Conclusion

The frontend implementation is complete and uses existing backend endpoints. **If your backend already has working OTP signup/login functionality, no changes are required.** However, please verify all checklist items to ensure smooth guest checkout experience.

If you encounter any issues during implementation, refer to the "Common Issues & Solutions" section above.

---

**Last Updated**: [Current Date]
**Frontend Implementation**: Complete
**Backend Status**: Verification Required

