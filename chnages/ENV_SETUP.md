# Environment Variables Setup

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=5000
BASE_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/coolrentals

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRE=24h

# Email Configuration (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-email-password
EMAIL_FROM=your-email@gmail.com
ADMIN_EMAIL=admin@coolrentals.com

# Cloudinary Configuration (optional - for image uploads)
# CLOUDINARY_CLOUD_NAME=your-cloud-name
# CLOUDINARY_API_KEY=your-api-key
# CLOUDINARY_API_SECRET=your-api-secret

# Twilio Configuration (optional - for SMS notifications)
# TWILIO_ACCOUNT_SID=your-account-sid
# TWILIO_AUTH_TOKEN=your-auth-token
# TWILIO_PHONE_NUMBER=your-phone-number
```

## Important Notes

1. **JWT_SECRET**: Change this to a strong, random string in production
2. **MONGODB_URI**: Update this to your MongoDB connection string (local or cloud)
3. **EMAIL_***: Configure these if you want email notifications. For Gmail, you may need to use an App Password.
4. **CLOUDINARY_***: Optional - only needed if using Cloudinary for image storage
5. **TWILIO_***: Optional - only needed if using Twilio for SMS notifications

## Creating Admin User

After setting up the environment, create an admin user using the script:

```bash
node scripts/createAdmin.js "Admin Name" "admin@example.com" "password123"
```

Or manually create one in MongoDB or through the application.

