# Render Deployment Guide - Email Configuration

## Setting Up Environment Variables on Render

Your backend is deployed on Render at: `https://rental-backend-new.onrender.com`

### Step 1: Access Render Dashboard

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your service: `rental-backend-new`
3. Go to **Environment** tab

### Step 2: Add Required Environment Variables

Add these environment variables in the Render dashboard:

#### Required Variables:

```env
# Email Configuration (REQUIRED for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=ashenterprises148@gmail.com
EMAIL_PASSWORD=your-16-character-gmail-app-password
EMAIL_FROM=ashenterprises148@gmail.com

# Frontend URL
FRONTEND_URL=https://rental-ac-frontend.vercel.app

# Server Configuration
PORT=5000
NODE_ENV=production

# MongoDB (if using MongoDB Atlas)
MONGODB_URI=your-mongodb-connection-string

# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRE=24h

# CORS (optional - comma-separated)
CORS_ORIGINS=https://rental-ac-frontend.vercel.app
```

### Step 3: Get Gmail App Password

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** (if not already enabled)
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Select:
   - **App**: Mail
   - **Device**: Other (Custom name)
   - **Name**: Render Backend
5. Click **Generate**
6. Copy the **16-character password** (remove spaces)
7. Paste it in `EMAIL_PASSWORD` in Render

### Step 4: Verify Configuration

After adding environment variables:

1. **Redeploy** your service (or it will auto-redeploy)
2. Check the **Logs** tab for any errors
3. Test the forgot password endpoint

### Step 5: Test Email Sending

```bash
curl -X POST https://rental-backend-new.onrender.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

---

## Common Issues & Solutions

### Issue: "Email service not configured"

**Solution:**
- ✅ Check that `EMAIL_USER` and `EMAIL_PASSWORD` are set in Render
- ✅ Make sure there are no extra spaces in the values
- ✅ Verify the App Password is correct (16 characters, no spaces)

### Issue: "EAUTH" Error (Authentication Failed)

**Solution:**
- ✅ Make sure you're using **App Password**, not your regular Gmail password
- ✅ Verify 2-Step Verification is enabled on your Gmail account
- ✅ Generate a new App Password if the old one doesn't work

### Issue: "ECONNECTION" Error (Connection Failed)

**Solution:**
- ✅ Check `EMAIL_HOST` is set to `smtp.gmail.com`
- ✅ Check `EMAIL_PORT` is set to `587`
- ✅ Verify Render allows outbound connections (should be enabled by default)

### Issue: Email Not Received

**Solution:**
- ✅ Check spam folder
- ✅ Verify email address is correct
- ✅ Check Render logs for email sending errors
- ✅ Test with a different email address

---

## Environment Variables Checklist

Before deploying, ensure these are set in Render:

- [ ] `EMAIL_USER` = ashenterprises148@gmail.com
- [ ] `EMAIL_PASSWORD` = 16-character App Password
- [ ] `EMAIL_HOST` = smtp.gmail.com
- [ ] `EMAIL_PORT` = 587
- [ ] `EMAIL_FROM` = ashenterprises148@gmail.com
- [ ] `FRONTEND_URL` = https://rental-ac-frontend.vercel.app
- [ ] `MONGODB_URI` = Your MongoDB connection string
- [ ] `JWT_SECRET` = Strong random string
- [ ] `NODE_ENV` = production

---

## After Configuration

1. **Redeploy** your service
2. **Check logs** for email configuration messages
3. **Test** the forgot password endpoint
4. **Verify** email is received

---

## Security Notes

- ✅ Never commit `.env` files to Git
- ✅ Use App Passwords, not regular passwords
- ✅ Rotate App Passwords periodically
- ✅ Use strong `JWT_SECRET` in production
- ✅ Enable 2-Step Verification on Gmail

---

## Need Help?

Check the Render logs for detailed error messages. The improved error logging will show:
- Whether email credentials are configured
- Specific error codes (EAUTH, ECONNECTION, etc.)
- Connection verification status

