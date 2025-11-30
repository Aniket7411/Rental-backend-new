const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

// Authentication middleware for users
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token, authorization denied',
        error: 'UNAUTHORIZED'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token (support both userId and id for backward compatibility)
    const userId = decoded.userId || decoded.id;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid',
        error: 'UNAUTHORIZED'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token is not valid',
      error: 'UNAUTHORIZED'
    });
  }
};

// Admin authentication middleware
const adminAuth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token, authorization denied',
        error: 'UNAUTHORIZED'
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user is admin
    const userId = decoded.userId || decoded.id;
    const user = await User.findById(userId).select('-password');
    
    if (user && user.role === 'admin') {
      req.user = user;
      req.admin = user;
      return next();
    }

    // Fallback to Admin model for backward compatibility
    const admin = await Admin.findById(userId || decoded.id).select('-password');
    if (admin) {
      req.admin = admin;
      req.user = admin; // For consistency
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required',
      error: 'FORBIDDEN'
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token is not valid',
      error: 'UNAUTHORIZED'
    });
  }
};

// Authorization middleware - check user role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'UNAUTHORIZED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${roles.join(' or ')} role required`,
        error: 'FORBIDDEN'
      });
    }

    next();
  };
};

// Combined authentication middleware - allows both users and admins
const userOrAdminAuth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token, authorization denied',
        error: 'UNAUTHORIZED'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token (support both userId and id for backward compatibility)
    const userId = decoded.userId || decoded.id;
    
    // Try User model first
    const user = await User.findById(userId).select('-password');
    
    if (user) {
      // Check if user is admin
      if (user.role === 'admin') {
        req.user = user;
        req.user.role = 'admin'; // Ensure role is set
        return next();
      }
      // Regular user
      req.user = user;
      return next();
    }

    // Fallback to Admin model for backward compatibility
    const admin = await Admin.findById(userId).select('-password');
    if (admin) {
      req.admin = admin;
      req.user = admin; // For consistency
      req.user.role = 'admin'; // Set role for admin
      return next();
    }

    return res.status(401).json({
      success: false,
      message: 'Token is not valid',
      error: 'UNAUTHORIZED'
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token is not valid',
      error: 'UNAUTHORIZED'
    });
  }
};

module.exports = { auth, adminAuth, authorize, userOrAdminAuth };

