# Backend Required Changes

## Authentication Endpoints

### 1. Unified Login Endpoint (Auto-detect Admin/User)
```
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "user" | "admin",
    "phone": "1234567890",
    "homeAddress": "address (optional)",
    "interestedIn": ["AC", "Refrigerator", "Washing Machine"]
  }
}
```

**Backend Logic:**
- Check if email exists in users collection
- If user.role === 'admin', return admin user
- If user.role === 'user', return regular user
- Return appropriate role in response

---

### 2. User Signup
```
POST /api/auth/signup
```

**Request Body:**
```json
{
  "name": "string (required)",
  "email": "string (required, unique)",
  "password": "string (required, min 6 characters)",
  "phone": "string (required, min 10 digits)",
  "homeAddress": "string (optional)",
  "interestedIn": ["AC", "Refrigerator", "Washing Machine"] // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "user",
    "phone": "1234567890",
    "homeAddress": "",
    "interestedIn": []
  }
}
```

---

### 3. Forgot Password
```
POST /api/auth/forgot-password
```

**Request Body:**
```json
{
  "email": "string (required)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset link sent to your email"
}
```

---

## Database Schema Updates

### Users Collection
```javascript
{
  _id: ObjectId,
  name: String (required),
  email: String (required, unique, indexed),
  password: String (hashed, required),
  phone: String (required),
  homeAddress: String (optional), // Can be updated later
  interestedIn: [String], // ["AC", "Refrigerator", "Washing Machine"] - optional
  role: String (enum: ["user", "admin"], default: "user", indexed),
  createdAt: Date,
  updatedAt: Date
}
```

**Important Notes:**
- `homeAddress` is optional (can be empty string or null)
- `interestedIn` is optional (can be empty array)
- Default role is "user"
- Admin users should have `role: "admin"` in database

---

## Implementation Steps

### Step 1: Update Login Endpoint
```javascript
// Instead of separate /admin/login and /users/login
// Use single endpoint: /api/auth/login

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email (check both admin and user)
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Return user with role (admin or user)
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role, // 'admin' or 'user'
        phone: user.phone,
        homeAddress: user.homeAddress || '',
        interestedIn: user.interestedIn || []
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
```

### Step 2: Update Signup Endpoint
```javascript
router.post('/auth/signup', async (req, res) => {
  try {
    const { name, email, password, phone, homeAddress, interestedIn } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user (default role is 'user')
    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      homeAddress: homeAddress || '', // Optional
      interestedIn: interestedIn || [], // Optional
      role: 'user' // Default role
    });
    
    await user.save();
    
    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        homeAddress: user.homeAddress || '',
        interestedIn: user.interestedIn || []
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
```

---

## Key Changes Summary

1. **Single Login Endpoint**: `/api/auth/login` instead of separate admin/user endpoints
2. **Auto-detect Role**: Backend checks user.role and returns it in response
3. **Optional Fields**: `homeAddress` and `interestedIn` are optional in signup
4. **Unified Auth Routes**: All auth endpoints under `/api/auth/*`

---

## Testing

### Test Login as User
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}
```

### Test Login as Admin
```bash
POST /api/auth/login
{
  "email": "admin@example.com",
  "password": "password"
}
```

### Test Signup
```bash
POST /api/auth/signup
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "password123",
  "phone": "1234567890"
}
```

---

**Note**: Frontend will automatically redirect based on `user.role` returned from login response.

