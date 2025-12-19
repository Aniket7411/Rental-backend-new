# OTP-Based Login Implementation Documentation

## Overview
This document outlines the implementation of phone number OTP-based authentication using Twilio. The system has been updated to use **only phone number OTP login** instead of email/password authentication. Email is now optional and can be added later in the user profile.

## Changes Summary

### 1. API Service Updates (`src/services/api.js`)

#### New Methods Added:

**OTP Login Methods:**
- `sendOTP(phoneNumber)` - Sends OTP to the provided phone number
  - Endpoint: `POST /auth/send-otp`
  - Request: `{ phone: phoneNumber }`
  - Response: `{ success: true, message: string, sessionId: string }`

- `verifyOTP(phoneNumber, otp, sessionId)` - Verifies the OTP and logs in the user
  - Endpoint: `POST /auth/verify-otp`
  - Request: `{ phone: phoneNumber, otp: string, sessionId: string }`
  - Response: `{ success: true, token: string, user: object }`

**OTP Signup Methods:**
- `sendSignupOTP(phoneNumber, name, email)` - Sends OTP for new user registration
  - Endpoint: `POST /auth/send-signup-otp`
  - Request: `{ phone: phoneNumber, name: string, email: string (optional) }`
  - Response: `{ success: true, message: string, sessionId: string }`

- `verifySignupOTP(phoneNumber, otp, sessionId, userData)` - Verifies OTP and creates new account
  - Endpoint: `POST /auth/verify-signup-otp`
  - Request: `{ phone: phoneNumber, otp: string, sessionId: string, name: string, email: string (optional) }`
  - Response: `{ success: true, token: string, user: object }`

### 2. Authentication Context Updates (`src/context/AuthContext.js`)

#### New Methods Added:
- `sendOTP(phoneNumber)` - Sends OTP for login
- `verifyOTP(phoneNumber, otp, sessionId)` - Verifies OTP and authenticates user
- `sendSignupOTP(phoneNumber, name, email)` - Sends OTP for signup
- `verifySignupOTP(phoneNumber, otp, sessionId, userData)` - Verifies OTP and creates account

All methods are now available in the AuthContext and can be accessed via `useAuth()` hook.

### 3. Login Page Updates (`src/pages/Login.js`)

**Complete Redesign:**
- Removed email/password fields
- Added phone number input with +91 country code
- Two-step process:
  1. **Step 1: Phone Number Entry**
     - User enters 10-digit phone number
     - Clicks "Send OTP" button
     - OTP is sent via Twilio
  
  2. **Step 2: OTP Verification**
     - User enters 6-digit OTP
     - OTP input with auto-focus and formatting
     - Resend OTP functionality with 60-second countdown
     - "Change Phone Number" option to go back

**Features:**
- Phone number validation (10 digits)
- OTP input with 6-digit limit
- Resend OTP with countdown timer
- Error handling and user feedback
- Responsive design with animations
- Auto-redirect after successful login

### 4. Signup Page Updates (`src/pages/Signup.js`)

**Complete Redesign:**
- Phone number is now **required**
- Email is now **optional** (can be added later)
- Two-step process:
  1. **Step 1: User Details**
     - Name (required)
     - Phone Number (required, 10 digits)
     - Email (optional)
     - Click "Send OTP" to proceed
  
  2. **Step 2: OTP Verification**
     - Enter 6-digit OTP
     - Resend OTP functionality
     - Account created after successful verification

**Features:**
- Phone number validation
- Optional email field with clear indication
- OTP verification flow
- Resend OTP with countdown
- Error handling
- Success messages

### 5. User Dashboard Compatibility (`src/pages/user/UserDashboard.js`)

**No Changes Required:**
- UserDashboard already works with phone-based authentication
- Uses `user` object from AuthContext which contains phone number
- All features (profile editing, address management) work as before
- Email field is optional in profile updates

## User Flow

### Login Flow:
1. User visits `/login`
2. Enters phone number (10 digits)
3. Clicks "Send OTP"
4. Receives OTP via SMS (Twilio)
5. Enters 6-digit OTP
6. Clicks "Verify & Login"
7. Redirected to home page or dashboard

### Signup Flow:
1. User visits `/signup`
2. Enters name (required)
3. Enters phone number (required, 10 digits)
4. Optionally enters email
5. Clicks "Send OTP"
6. Receives OTP via SMS (Twilio)
7. Enters 6-digit OTP
8. Clicks "Verify & Create Account"
9. Account created and user logged in
10. Redirected to home page

## Backend Requirements

### Required API Endpoints:

1. **POST `/api/auth/send-otp`**
   - Body: `{ phone: string }`
   - Response: `{ success: true, message: string, sessionId: string }`
   - Should integrate with Twilio to send OTP

2. **POST `/api/auth/verify-otp`**
   - Body: `{ phone: string, otp: string, sessionId: string }`
   - Response: `{ success: true, token: string, user: object }`
   - Should verify OTP and return JWT token

3. **POST `/api/auth/send-signup-otp`**
   - Body: `{ phone: string, name: string, email?: string }`
   - Response: `{ success: true, message: string, sessionId: string }`
   - Should send OTP for new user registration

4. **POST `/api/auth/verify-signup-otp`**
   - Body: `{ phone: string, otp: string, sessionId: string, name: string, email?: string }`
   - Response: `{ success: true, token: string, user: object }`
   - Should verify OTP and create new user account

### Twilio Integration:

The backend needs to:
1. Generate a 6-digit OTP
2. Store OTP with session ID and expiration (typically 5-10 minutes)
3. Send OTP via Twilio SMS API
4. Verify OTP when user submits it
5. Create/authenticate user and return JWT token

**Example Twilio Integration (Backend):**
```javascript
// Send OTP
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const otp = Math.floor(100000 + Math.random() * 900000).toString();
await client.messages.create({
  body: `Your OTP is ${otp}. Valid for 10 minutes.`,
  from: process.env.TWILIO_PHONE_NUMBER,
  to: `+91${phoneNumber}`
});
```

## Environment Variables Required

### Frontend:
No new environment variables needed (uses existing API_BASE_URL)

### Backend:
```
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

## Database Schema Updates

### User Model:
- `phone` (required, unique) - Primary identifier
- `email` (optional) - Can be null
- `name` (required)
- `password` (optional) - Can be removed or kept for admin login
- Other fields remain the same

## Security Considerations

1. **OTP Expiration**: OTPs should expire after 5-10 minutes
2. **Rate Limiting**: Limit OTP requests per phone number (e.g., 3 per hour)
3. **Session Management**: Use secure session IDs for OTP verification
4. **Phone Number Validation**: Validate phone number format on backend
5. **OTP Storage**: Store OTPs securely (hashed or encrypted)
6. **Brute Force Protection**: Limit OTP verification attempts

## Testing Checklist

- [ ] Login with valid phone number
- [ ] OTP sent successfully
- [ ] OTP verification with correct code
- [ ] OTP verification with incorrect code
- [ ] Resend OTP functionality
- [ ] OTP expiration handling
- [ ] Signup with phone number only
- [ ] Signup with phone number and email
- [ ] User dashboard access after login
- [ ] Profile editing with phone-based auth
- [ ] Address management
- [ ] Error handling for network issues
- [ ] Error handling for invalid phone numbers
- [ ] Error handling for expired OTPs

## Migration Notes

### For Existing Users:
- Existing users with email/password can continue using admin login
- Regular users will need to use phone OTP login
- Consider migration script to link phone numbers to existing accounts

### For New Users:
- All new users must sign up with phone number
- Email is optional and can be added later
- Phone number becomes primary identifier

## UI/UX Improvements

1. **Phone Number Input**: 
   - Auto-formats to 10 digits
   - Shows +91 country code
   - Clear validation messages

2. **OTP Input**:
   - Large, centered input
   - Auto-focus
   - 6-digit limit
   - Clear visual feedback

3. **Resend OTP**:
   - 60-second countdown timer
   - Disabled during countdown
   - Clear messaging

4. **Error Handling**:
   - Clear error messages
   - Visual error indicators
   - Helpful guidance

5. **Success States**:
   - Success messages
   - Smooth transitions
   - Auto-redirect after success

## Files Modified

1. `src/services/api.js` - Added OTP API methods
2. `src/context/AuthContext.js` - Added OTP authentication methods
3. `src/pages/Login.js` - Complete redesign for OTP login
4. `src/pages/Signup.js` - Complete redesign for OTP signup

## Files Not Modified (Compatible)

1. `src/pages/user/UserDashboard.js` - Works with phone-based auth
2. `src/components/Header.js` - No changes needed
3. `src/pages/Home.js` - No changes needed
4. All other pages - Compatible with new auth system

## Next Steps

1. **Backend Implementation**:
   - Implement OTP endpoints
   - Integrate Twilio
   - Update user model
   - Add OTP storage/verification logic

2. **Testing**:
   - Test with real Twilio account
   - Test OTP expiration
   - Test rate limiting
   - Test error scenarios

3. **Optional Enhancements**:
   - Add phone number verification badge
   - Add email verification (if email provided)
   - Add profile completion prompts
   - Add phone number change functionality

## Support

For issues or questions:
- Check backend logs for OTP sending/verification
- Verify Twilio credentials and phone number format
- Ensure backend endpoints match frontend expectations
- Check network requests in browser DevTools

---

**Implementation Date**: [Current Date]
**Version**: 1.0
**Status**: Frontend Complete - Backend Integration Required

