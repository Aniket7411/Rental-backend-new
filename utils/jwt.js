const jwt = require('jsonwebtoken');

// Generate JWT token
exports.generateToken = (id, email, role = 'user') => {
  return jwt.sign(
    { 
      userId: id,
      email: email,
      role: role
    },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRE || '7d'
    }
  );
};

