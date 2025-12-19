# Testing Forgot Password Endpoint

## Quick Test Methods

### Method 1: Using the Test Script

```bash
# Test with default email (test@example.com)
node test-forgot-password.js

# Test with specific email
node test-forgot-password.js user@example.com
```

### Method 2: Using cURL

```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

### Method 3: Using Postman/Thunder Client

**Request:**
- Method: `POST`
- URL: `http://localhost:5000/api/auth/forgot-password`
- Headers: `Content-Type: application/json`
- Body (JSON):
```json
{
  "email": "user@example.com"
}
```

### Method 4: Using Browser Console (Frontend)

```javascript
fetch('http://localhost:5000/api/auth/forgot-password', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com'
  })
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error('Error:', err));
```

---

## Expected Responses

### ✅ Success Response (200)
```json
{
  "success": true,
  "message": "Password reset link sent to your email"
}
```

### ❌ Missing Email (400)
```json
{
  "success": false,
  "message": "Please provide email",
  "error": "VALIDATION_ERROR"
}
```

### ❌ Email Service Not Configured (500)
```json
{
  "success": false,
  "message": "Failed to send password reset email. Please try again later.",
  "error": "EMAIL_ERROR"
}
```

---

## Troubleshooting

### Issue: "Email service not configured"
**Solution:** 
1. Create `.env` file in root directory
2. Add email credentials:
   ```env
   EMAIL_USER=ashenterprises148@gmail.com
   EMAIL_PASSWORD=your-app-password-here
   FRONTEND_URL=https://rental-ac-frontend.vercel.app
   ```
3. Restart the server

### Issue: "Connection refused" or "ECONNREFUSED"
**Solution:**
- Make sure the server is running: `npm start` or `npm run dev`
- Check the server is running on port 5000
- Verify the API URL is correct

### Issue: Email not received
**Solution:**
1. Check spam folder
2. Verify email credentials in `.env`
3. Check server logs for email errors
4. Verify Gmail App Password is correct (16 characters, no spaces)
5. Make sure 2-Step Verification is enabled on Gmail account

---

## Verification Checklist

- [ ] Server is running
- [ ] `.env` file exists with email credentials
- [ ] Gmail App Password is set correctly
- [ ] `FRONTEND_URL` is set to production URL
- [ ] Test request returns success response
- [ ] Email is received in inbox
- [ ] Reset link in email works correctly

---

## Next Steps After Testing

1. ✅ Verify email is sent successfully
2. ✅ Check email contains correct reset link
3. ✅ Test reset link opens frontend page
4. ✅ Test password reset flow end-to-end
5. ✅ Verify token expires after 10 minutes

