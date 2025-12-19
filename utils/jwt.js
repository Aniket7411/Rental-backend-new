const jwt = require('jsonwebtoken');

// Generate JWT token
exports.generateToken = (id, email, role = 'user') => {
  const payload = { 
    userId: id,
    role: role
  };
  
  // Only include email if it exists (for phone-based auth, email may be null)
  if (email) {
    payload.email = email;
  }
  
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRE || '7d'
    }
  );
};

