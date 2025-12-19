# Quick Setup: Create .env File for Password Reset

## The Error You're Seeing

```
Error: Email service not configured
```

This means your `.env` file is missing or doesn't have the email credentials.

## Quick Fix

### Step 1: Create `.env` File

Create a file named `.env` in the root directory (`c:\Users\Naman\Desktop\rnt\acb\.env`)

### Step 2: Add These Lines

Copy and paste this into your `.env` file:

```env
# Server Configuration
PORT=5000
BASE_URL=http://localhost:5000
FRONTEND_URL=https://rental-ac-frontend.vercel.app

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/coolrentals

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRE=24h

# Email Configuration (for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=ashenterprises148@gmail.com
EMAIL_PASSWORD=PASTE_YOUR_APP_PASSWORD_HERE
EMAIL_FROM=ashenterprises148@gmail.com
ADMIN_EMAIL=admin@coolrentals.com

# CORS Configuration (optional - for multiple frontend origins)
# CORS_ORIGINS=https://rental-ac-frontend.vercel.app,http://localhost:3000
```

### Step 3: Get Gmail App Password

1. Go to: https://myaccount.google.com/security
2. Enable **2-Step Verification** (if not already enabled)
3. Go to **App passwords**: https://myaccount.google.com/apppasswords
4. Select:
   - **App**: Mail
   - **Device**: Other (Custom name)
   - **Name**: CoolRentals Backend
5. Click **Generate**
6. Copy the **16-character password** (looks like: `abcd efgh ijkl mnop`)
7. Paste it in your `.env` file replacing `PASTE_YOUR_APP_PASSWORD_HERE`

**Important:** Remove spaces from the app password when pasting (e.g., `abcdefghijklmnop`)

### Step 4: Restart Your Server

After updating `.env`, restart your Node.js server:

```bash
# Stop the server (Ctrl+C)
# Then start again:
npm start
# or
npm run dev
```

### Step 5: Test

Try the forgot password endpoint again. The email should now send successfully!

---

## Example .env File

Here's what your `.env` should look like (with your actual values):

```env
PORT=5000
FRONTEND_URL=https://rental-ac-frontend.vercel.app
MONGODB_URI=mongodb://localhost:27017/coolrentals
JWT_SECRET=your-secret-key-here
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=ashenterprises148@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
EMAIL_FROM=ashenterprises148@gmail.com
```

---

## Troubleshooting

### Still getting "Email service not configured"?
- ✅ Make sure `.env` file is in the root directory (same folder as `server.js`)
- ✅ Make sure there are no spaces around the `=` sign
- ✅ Make sure EMAIL_PASSWORD has no spaces (remove spaces from Gmail app password)
- ✅ Restart your server after creating/updating `.env`
- ✅ Check that `dotenv.config()` is called in `server.js` (it is!)

### Gmail App Password not working?
- ✅ Make sure 2-Step Verification is enabled
- ✅ Make sure you're using App Password, not your regular Gmail password
- ✅ Try generating a new App Password

---

## Need Help?

See `chnages/ENV_SETUP.md` for detailed instructions.

