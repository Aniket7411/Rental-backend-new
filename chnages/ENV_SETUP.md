# Environment Variables Setup

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=5000
BASE_URL=http://localhost:5000
FRONTEND_URL=https://rental-ac-frontend.vercel.app

# CORS Configuration (optional - comma-separated list of allowed origins)
# If not set, will use FRONTEND_URL. In development, localhost is automatically allowed.
# CORS_ORIGINS=https://rental-ac-frontend.vercel.app,http://localhost:3000

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/coolrentals

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRE=24h

# Email Configuration (for notifications and password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=ashenterprises148@gmail.com
EMAIL_PASSWORD=your-app-password-here
EMAIL_FROM=ashenterprises148@gmail.com
ADMIN_EMAIL=admin@coolrentals.com

# Cloudinary Configuration (optional - for image uploads)
# CLOUDINARY_CLOUD_NAME=your-cloud-name
# CLOUDINARY_API_KEY=your-api-key
# CLOUDINARY_API_SECRET=your-api-secret

# Twilio Configuration (REQUIRED - for OTP-based authentication)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=your-phone-number

# Razorpay Configuration (REQUIRED - for payment processing)
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret (optional, falls back to key_secret)
RAZORPAY_PAYMENT_LINK=https://razorpay.me/@ashenterprises7526 (optional - personalized payment link)
```

## Important Notes

1. **JWT_SECRET**: Change this to a strong, random string in production
2. **MONGODB_URI**: Update this to your MongoDB connection string (local or cloud)
3. **CORS_ORIGINS**: Optional - comma-separated list of allowed frontend origins. If not set, uses FRONTEND_URL. In development mode, localhost is automatically allowed.
3. **EMAIL_***: 
   - **EMAIL_USER**: Your Gmail address (ashenterprises148@gmail.com)
   - **EMAIL_PASSWORD**: Your Gmail App Password (NOT your regular Gmail password)
   - **How to get Gmail App Password:**
     1. Go to your Google Account settings
     2. Enable 2-Step Verification (if not already enabled)
     3. Go to Security → 2-Step Verification → App passwords
     4. Generate a new app password for "Mail" and "Other (Custom name)" - name it "CoolRentals Backend"
     5. Copy the 16-character password and paste it in EMAIL_PASSWORD
   - **EMAIL_FROM**: The email address that will appear as the sender (usually same as EMAIL_USER)
4. **CLOUDINARY_***: Optional - only needed if using Cloudinary for image storage
5. **TWILIO_***: **REQUIRED** - Needed for OTP-based phone authentication
   - **TWILIO_ACCOUNT_SID**: Your Twilio Account SID (found in Twilio Console)
   - **TWILIO_AUTH_TOKEN**: Your Twilio Auth Token (found in Twilio Console)
   - **TWILIO_PHONE_NUMBER**: Your Twilio phone number (format: +1234567890)
   - **How to get Twilio credentials:**
     1. Sign up for a Twilio account at https://www.twilio.com
     2. Go to the Twilio Console Dashboard
     3. Find your Account SID and Auth Token
     4. Get a phone number from Twilio (or use your existing one)
     5. Add these credentials to your `.env` file
   - **Note**: In development mode, if Twilio is not configured, OTPs will be logged to console
6. **RAZORPAY_***: **REQUIRED** - Needed for payment processing
   - **RAZORPAY_KEY_ID**: Your Razorpay Key ID (found in Razorpay Dashboard → Settings → API Keys)
   - **RAZORPAY_KEY_SECRET**: Your Razorpay Key Secret (found in Razorpay Dashboard → Settings → API Keys)
   - **RAZORPAY_WEBHOOK_SECRET**: Optional - Webhook secret for payment verification (found in Razorpay Dashboard → Settings → Webhooks)
   - **RAZORPAY_PAYMENT_LINK**: Optional - Your personalized Razorpay payment link (e.g., `https://razorpay.me/@ashenterprises7526`)
   - **How to get Razorpay credentials:**
     1. Sign up/login to Razorpay Dashboard at https://dashboard.razorpay.com
     2. Go to Settings → API Keys
     3. Generate new API keys (or use existing ones)
     4. Copy the Key ID and Key Secret
     5. Add these to your `.env` file
   - **How to get Payment Link:**
     1. Go to Razorpay Dashboard → Payment Links
     2. Create a new payment link or use your personalized link
     3. Copy the link (format: `https://razorpay.me/@yourusername`)
     4. Add to `.env` as `RAZORPAY_PAYMENT_LINK`
   - **Note**: Make sure you're using **Live Mode** keys for production, and **Test Mode** keys for development

## Creating Admin User

After setting up the environment, create an admin user using the script:

```bash
node scripts/createAdmin.js "Admin Name" "admin@example.com" "password123"
```

Or manually create one in MongoDB or through the application.

