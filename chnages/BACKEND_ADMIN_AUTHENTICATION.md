# Backend Admin Authentication Requirements

## Overview
This document outlines the backend authentication setup required for admin login functionality. The frontend expects a unified login endpoint that automatically detects whether the user is an admin or regular user based on their credentials.

## Admin Login Credentials

### Default Admin Account
- **Email:** `admin@example.com`
- **Password:** `password123`
- **Role:** `admin`

**Note:** These credentials should be created in the database during initial setup or seed data. For production, these should be changed immediately after first login.

---

## API Endpoint Requirements

### POST `/api/auth/login`
Unified login endpoint that auto-detects admin or user based on credentials.

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response (200 - Success):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "admin_id",
    "_id": "admin_id",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin",
    "phone": "optional_phone_number"
  }
}
```

**Response (401 - Invalid Credentials):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

**Response (400 - Validation Error):**
```json
{
  "success": false,
  "message": "Email and password are required"
}
```

---

## Backend Implementation Requirements

### 1. User/Admin Model Schema

The user/admin model should include the following fields:

```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique, required, indexed),
  password: String (hashed, required),
  role: String (enum: ['admin', 'user'], default: 'user', indexed),
  phone: String (optional),
  createdAt: Date,
  updatedAt: Date
}
```

**Role Field:**
- Must be either `'admin'` or `'user'` (case-sensitive)
- Default value: `'user'`
- Should be indexed for efficient queries
- Required field

### 2. Password Hashing

- Passwords must be hashed using bcrypt or similar secure hashing algorithm
- Recommended bcrypt salt rounds: 10-12
- Never store plain text passwords
- Example hash for `password123`: Use bcrypt to generate (e.g., `$2b$10$...`)

### 3. JWT Token Generation

- Token should include user ID and role in payload
- Token expiration: Recommended 24 hours (86400 seconds) or configurable
- Token secret: Use environment variable (e.g., `JWT_SECRET`)
- Example token payload:
  ```json
  {
    "userId": "admin_id",
    "email": "admin@example.com",
    "role": "admin"
  }
  ```

### 4. Login Logic

The login endpoint should:

1. **Validate Input:**
   - Check if email and password are provided
   - Validate email format

2. **Find User:**
   ```javascript
   const user = await User.findOne({ email: email.toLowerCase().trim() });
   ```

3. **Verify Credentials:**
   ```javascript
   if (!user) {
     return res.status(401).json({ 
       success: false, 
       message: 'Invalid email or password' 
     });
   }

   const isPasswordValid = await bcrypt.compare(password, user.password);
   if (!isPasswordValid) {
     return res.status(401).json({ 
       success: false, 
       message: 'Invalid email or password' 
     });
   }
   ```

4. **Generate Token:**
   ```javascript
   const token = jwt.sign(
     { 
       userId: user._id, 
       email: user.email, 
       role: user.role 
     },
     process.env.JWT_SECRET,
     { expiresIn: '24h' }
   );
   ```

5. **Return Response:**
   ```javascript
   res.json({
     success: true,
     token,
     user: {
       id: user._id,
       _id: user._id,
       name: user.name,
       email: user.email,
       role: user.role,
       phone: user.phone || null
     }
   });
   ```

### 5. Middleware for Protected Routes

Create authentication middleware to verify tokens:

```javascript
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    req.user = user;
    req.userId = user._id;
    req.userRole = user.role;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

// Admin-only middleware
const requireAdmin = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin privileges required.' 
    });
  }
  next();
};
```

---

## Database Setup

### 1. Create Admin User

You need to create the admin user in your database. Options:

#### Option A: Seed Script

Create a seed script to initialize the admin user:

```javascript
// scripts/seedAdmin.js
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('./models/User'); // Adjust path as needed

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create admin user
    const admin = new User({
      name: 'Admin User',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin'
    });

    await admin.save();
    console.log('Admin user created successfully');
    console.log('Email: admin@example.com');
    console.log('Password: password123');
  } catch (error) {
    console.error('Error seeding admin:', error);
  } finally {
    mongoose.connection.close();
  }
}

seedAdmin();
```

Run with:
```bash
node scripts/seedAdmin.js
```

#### Option B: Manual Database Insertion

Using MongoDB shell or MongoDB Compass:

```javascript
// Connect to your database
use rental_service_db;

// Insert admin user (replace PASSWORD_HASH with bcrypt hash of 'password123')
db.users.insertOne({
  name: "Admin User",
  email: "admin@example.com",
  password: "$2b$10$YOUR_HASHED_PASSWORD_HERE", // Generate using bcrypt
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date()
});
```

To generate the password hash:
```javascript
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('password123', 10);
console.log(hash);
```

#### Option C: Migration Script

If using migrations:

```javascript
// migrations/createAdminUser.js
exports.up = async function(db) {
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  await db.collection('users').insertOne({
    name: 'Admin User',
    email: 'admin@example.com',
    password: hashedPassword,
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date()
  });
};

exports.down = async function(db) {
  await db.collection('users').deleteOne({ email: 'admin@example.com' });
};
```

---

## Testing

### Test Admin Login

Use Postman, curl, or similar tool to test:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "_id": "...",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### Test Protected Admin Route

```bash
curl -X GET http://localhost:5000/api/admin/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Security Considerations

1. **Change Default Password:**
   - The default password `password123` should be changed immediately after first login in production
   - Implement password change functionality

2. **Environment Variables:**
   - Store JWT_SECRET in environment variables
   - Never commit secrets to version control
   - Use different secrets for development and production

3. **Password Policy:**
   - Implement password strength requirements (minimum length, complexity)
   - Consider password expiration policies for admin accounts

4. **Rate Limiting:**
   - Implement rate limiting on login endpoint to prevent brute force attacks
   - Lock account after multiple failed login attempts

5. **HTTPS:**
   - Always use HTTPS in production
   - Never send credentials over unencrypted connections

6. **Token Security:**
   - Use secure, random JWT secrets
   - Consider implementing token refresh mechanism
   - Implement token blacklisting for logout

---

## Error Handling

### Common Error Scenarios

1. **Invalid Credentials:**
   ```json
   {
     "success": false,
     "message": "Invalid email or password"
   }
   ```
   Status: 401

2. **Missing Fields:**
   ```json
   {
     "success": false,
     "message": "Email and password are required"
   }
   ```
   Status: 400

3. **Invalid Email Format:**
   ```json
   {
     "success": false,
     "message": "Please provide a valid email address"
   }
   ```
   Status: 400

4. **Server Error:**
   ```json
   {
     "success": false,
     "message": "Internal server error. Please try again later."
   }
   ```
   Status: 500

---

## Frontend Integration

The frontend admin login page is located at:
- **Route:** `/admin/login`
- **Component:** `src/pages/admin/AdminLogin.js`

The frontend will:
1. Send POST request to `/api/auth/login` with email and password
2. Store the returned token in localStorage
3. Store user data in localStorage
4. Redirect to `/admin/dashboard` on successful login
5. Display error message on failed login

---

## Example Implementation (Node.js/Express)

```javascript
// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return response
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || null
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
});

module.exports = router;
```

---

## Checklist

- [ ] Admin user created in database with email `admin@example.com`
- [ ] Password hashed using bcrypt (for `password123`)
- [ ] User model includes `role` field (enum: ['admin', 'user'])
- [ ] Login endpoint `/api/auth/login` implemented
- [ ] JWT token generation working
- [ ] Token includes user ID, email, and role
- [ ] Authentication middleware created
- [ ] Admin-only middleware created
- [ ] Error handling implemented
- [ ] Default admin credentials work for login
- [ ] Token can be used to access protected admin routes
- [ ] Frontend can successfully login and receive token
- [ ] Production: Default password changed

---

## Support

If you encounter issues:

1. Verify the admin user exists in the database
2. Check that the password is correctly hashed
3. Ensure JWT_SECRET is set in environment variables
4. Verify the email is stored in lowercase (or comparison is case-insensitive)
5. Check database indexes on email and role fields
6. Review server logs for detailed error messages

---

**Document Version:** 1.0  
**Created:** [Current Date]  
**Status:** Ready for Implementation

