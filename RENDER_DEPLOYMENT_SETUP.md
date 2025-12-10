# Render Deployment - Email Configuration Guide

## ⚠️ Important: Environment Variables on Render

Since your backend is deployed on **Render** (`rental-backend-new.onrender.com`), you need to configure environment variables in the Render dashboard, NOT in a `.env` file.

## Step-by-Step: Configure Email on Render

### 1. Go to Render Dashboard

1. Log in to [Render Dashboard](https://dashboard.render.com/)
2. Select your service: **rental-backend-new**
3. Go to **Environment** tab (in the left sidebar)

### 2. Add These Environment Variables

Click **"Add Environment Variable"** and add each of these:

| Key | Value | Description |
|-----|-------|-------------|
| `EMAIL_HOST` | `smtp.gmail.com` | Gmail SMTP server |
| `EMAIL_PORT` | `587` | Gmail SMTP port |
| `EMAIL_USER` | `ashenterprises148@gmail.com` | Your Gmail address |
| `EMAIL_PASSWORD` | `your-16-char-app-password` | Gmail App Password (see below) |
| `EMAIL_FROM` | `ashenterprises148@gmail.com` | Sender email |
| `FRONTEND_URL` | `https://rental-ac-frontend.vercel.app` | Frontend URL for reset links |

### 3. Get Gmail App Password

**Important:** You MUST use a Gmail App Password, NOT your regular Gmail password.

1. Go to: https://myaccount.google.com/security
2. Enable **2-Step Verification** (if not already enabled)
3. Go to **App passwords**: https://myaccount.google.com/apppasswords
4. Select:
   - **App**: Mail
   - **Device**: Other (Custom name)
   - **Name**: Render Backend
5. Click **Generate**
6. Copy the **16-character password** (remove spaces)
7. Paste it as the value for `EMAIL_PASSWORD` in Render

### 4. Save and Redeploy

1. After adding all environment variables, click **Save Changes**
2. Render will automatically redeploy your service
3. Wait for deployment to complete

### 5. Test the Email

After redeployment, test the forgot password endpoint:

```bash
POST https://rental-backend-new.onrender.com/api/auth/forgot-password
Body: { "email": "test@example.com" }
```

---

## Common Issues & Solutions

### Issue 1: "Email service not configured"

**Solution:** 
- ✅ Make sure `EMAIL_USER` and `EMAIL_PASSWORD` are set in Render
- ✅ Check for typos in variable names (case-sensitive)
- ✅ Make sure you saved the environment variables

### Issue 2: "Authentication failed" (EAUTH error)

**Solution:**
- ✅ Use Gmail App Password, NOT regular password
- ✅ Make sure 2-Step Verification is enabled
- ✅ Remove spaces from the app password
- ✅ Generate a new app password if needed

### Issue 3: "Connection timeout" (ETIMEDOUT)

**Solution:**
- ✅ Check `EMAIL_HOST` is `smtp.gmail.com`
- ✅ Check `EMAIL_PORT` is `587`
- ✅ Render's network should allow SMTP connections

### Issue 4: Gmail blocking the connection

**Solution:**
- ✅ Gmail may block connections from new IPs
- ✅ Check Gmail account for security alerts
- ✅ You may need to allow "Less secure app access" (not recommended)
- ✅ Consider using a dedicated email service (SendGrid, Mailgun) for production

---

## Environment Variables Checklist

Make sure these are ALL set in Render:

```env
✅ EMAIL_HOST=smtp.gmail.com
✅ EMAIL_PORT=587
✅ EMAIL_USER=ashenterprises148@gmail.com
✅ EMAIL_PASSWORD=your-16-character-app-password
✅ EMAIL_FROM=ashenterprises148@gmail.com
✅ FRONTEND_URL=https://rental-ac-frontend.vercel.app
✅ MONGODB_URI=your-mongodb-connection-string
✅ JWT_SECRET=your-jwt-secret
✅ PORT=10000 (or whatever Render assigns)
```

---

## Testing After Setup

1. **Check Render Logs:**
   - Go to Render Dashboard → Your Service → Logs
   - Look for email-related errors or success messages

2. **Test Endpoint:**
   ```bash
   curl -X POST https://rental-backend-new.onrender.com/api/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email":"your-test-email@gmail.com"}'
   ```

3. **Check Email Inbox:**
   - Check the recipient's inbox (and spam folder)
   - The email should arrive within a few seconds

---

## Alternative: Use Professional Email Service

For production, consider using a professional email service:

### SendGrid (Recommended)
- Free tier: 100 emails/day
- Better deliverability
- More reliable than Gmail SMTP

### Mailgun
- Free tier: 5,000 emails/month
- Good for production use

### AWS SES
- Very cheap ($0.10 per 1,000 emails)
- Requires AWS account setup

---

## Need Help?

1. Check Render logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test with a simple email first
4. Check Gmail account security settings

---

**Last Updated:** After setting environment variables, Render will automatically redeploy your service.

