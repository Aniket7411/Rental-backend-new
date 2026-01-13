# Backend Fix: OTP Verification Error - phoneDigits Not Defined

## Issue Description

When verifying OTP during guest checkout, the backend throws a `ReferenceError: phoneDigits is not defined` at line 1045 in `authController.js`.

**Error Location:**
```
C:\Users\Naman\Desktop\rnt\acb\controllers\authController.js:1045
const existingUser = await User.findOne({ phone: phoneDigits });
                                         ^
ReferenceError: phoneDigits is not defined
```

## Root Cause

The backend `verifySignupOTP` function is trying to use a variable `phoneDigits` that hasn't been defined. The phone number is being received from the frontend, but the code needs to extract the digits from the formatted phone number (which may include country code prefix like `+91`).

## Frontend Data Being Sent

The frontend sends the following data to `/auth/verify-signup-otp`:

```javascript
{
  phone: "+918318825828",  // Formatted phone with +91 prefix
  otp: "123456",           // 6-digit OTP code
  sessionId: "SM863a1ccbd044982b81fec3ce842d58eb",  // Session ID from Twilio
  name: "User Name",       // User's name
  email: "user@email.com", // Optional email
  homeAddress: "User Address" // Optional address for guest checkout
}
```

## Required Backend Fix

### File: `controllers/authController.js`
### Function: `verifySignupOTP` (around line 1045)

**Current Issue:**
The code is trying to use `phoneDigits` without defining it first.

**Fix Required:**

1. **Extract phone digits from the phone number:**
   ```javascript
   // Extract phone digits (remove +91 or other country codes)
   let phoneDigits = req.body.phone;
   
   // Remove country code prefix if present
   if (phoneDigits.startsWith('+91')) {
     phoneDigits = phoneDigits.substring(3); // Remove '+91'
   } else if (phoneDigits.startsWith('91') && phoneDigits.length === 12) {
     phoneDigits = phoneDigits.substring(2); // Remove '91' prefix
   }
   
   // Ensure it's a 10-digit number
   phoneDigits = phoneDigits.replace(/\D/g, ''); // Remove any non-digit characters
   
   if (phoneDigits.length !== 10) {
     return res.status(400).json({
       success: false,
       message: 'Invalid phone number. Please provide a valid 10-digit phone number.'
     });
   }
   ```

2. **Complete Function Structure:**
   ```javascript
   exports.verifySignupOTP = async (req, res) => {
     try {
       const { phone, otp, sessionId, name, email, homeAddress } = req.body;
       
       // Validate required fields
       if (!phone || !otp) {
         return res.status(400).json({
           success: false,
           message: 'Phone number and OTP are required'
         });
       }
       
       // Extract phone digits (remove +91 or other country codes)
       let phoneDigits = phone;
       
       // Remove country code prefix if present
       if (phoneDigits.startsWith('+91')) {
         phoneDigits = phoneDigits.substring(3); // Remove '+91'
       } else if (phoneDigits.startsWith('91') && phoneDigits.length === 12) {
         phoneDigits = phoneDigits.substring(2); // Remove '91' prefix
       }
       
       // Ensure it's a 10-digit number (remove any non-digit characters)
       phoneDigits = phoneDigits.replace(/\D/g, '');
       
       if (phoneDigits.length !== 10) {
         return res.status(400).json({
           success: false,
           message: 'Invalid phone number. Please provide a valid 10-digit phone number.'
         });
       }
       
       // Verify OTP with sessionId
       // ... existing OTP verification logic ...
       
       // Check if user exists
       const existingUser = await User.findOne({ phone: phoneDigits });
       
       if (existingUser) {
         // User exists - login flow
         // Update user data if provided (for guest checkout)
         if (name && existingUser.name !== name) {
           existingUser.name = name;
         }
         if (email && !existingUser.email) {
           existingUser.email = email;
         }
         if (homeAddress && !existingUser.homeAddress) {
           existingUser.homeAddress = homeAddress;
         }
         await existingUser.save();
         
         // Generate token and return user
         // ... existing login logic ...
       } else {
         // New user - signup flow
         const newUser = new User({
           phone: phoneDigits,
           name: name || 'Guest User',
           email: email || undefined,
           homeAddress: homeAddress || undefined,
           // ... other user fields ...
         });
         
         await newUser.save();
         
         // Generate token and return user
         // ... existing signup logic ...
       }
       
       // ... rest of the function ...
     } catch (error) {
       console.error('Verify signup OTP error:', error);
       return res.status(500).json({
         success: false,
         message: 'An error occurred during OTP verification. Please try again.'
       });
     }
   };
   ```

## Key Points

1. **Phone Number Format:**
   - Frontend sends phone with `+91` prefix (e.g., `+918318825828`)
   - Backend needs to extract 10-digit number (e.g., `8318825828`)
   - Handle both `+91` and `91` prefixes
   - Remove any non-digit characters

2. **Phone Number Storage:**
   - Store phone numbers in database as 10-digit numbers (without country code)
   - This ensures consistency across the application

3. **User Data Updates:**
   - For existing users: Update name, email, and address if provided (for guest checkout)
   - For new users: Create user with provided data

4. **Error Handling:**
   - Validate phone number format before processing
   - Return clear error messages for invalid phone numbers
   - Handle edge cases (missing fields, invalid formats)

## Testing Checklist

After implementing the fix, test the following scenarios:

- [ ] Verify OTP with phone number starting with `+91`
- [ ] Verify OTP with phone number starting with `91`
- [ ] Verify OTP with 10-digit phone number (no prefix)
- [ ] Verify OTP for existing user (should login)
- [ ] Verify OTP for new user (should create account)
- [ ] Verify OTP with name, email, and address (guest checkout)
- [ ] Verify OTP with only name (guest checkout without email)
- [ ] Test with invalid phone number formats
- [ ] Test with invalid OTP codes
- [ ] Test with missing sessionId

## Additional Notes

- The frontend sends phone numbers in the format `+91XXXXXXXXXX` (with country code)
- The backend should normalize all phone numbers to 10-digit format for storage
- Ensure OTP verification logic uses the same phone format as stored in the database
- Consider adding phone number validation middleware if not already present

## Related Files

- Frontend: `src/components/GuestCheckoutOTP.js` (sends phone with +91 prefix)
- Frontend: `src/context/AuthContext.js` (verifySignupOTP function)
- Frontend: `src/services/api.js` (API call to `/auth/verify-signup-otp`)
- Backend: `controllers/authController.js` (verifySignupOTP function - needs fix)

