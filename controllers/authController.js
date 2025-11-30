const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const crypto = require('crypto');

// Unified Login (Auto-detect Admin/User)
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
        error: 'VALIDATION_ERROR'
      });
    }

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        error: 'UNAUTHORIZED'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        error: 'UNAUTHORIZED'
      });
    }

    // Generate token
    const token = generateToken(user._id, user.email, user.role);

    // Return user with role (admin or user)
    // Support both nested and top-level address formats per USER.md
    const userResponse = {
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role, // 'admin' or 'user'
      phone: user.phone,
      homeAddress: user.homeAddress || '',
      nearLandmark: user.nearLandmark || '',
      pincode: user.pincode || '',
      alternateNumber: user.alternateNumber || '',
      interestedIn: user.interestedIn || [],
      // Nested address format for backward compatibility
      address: {
        homeAddress: user.homeAddress || '',
        nearLandmark: user.nearLandmark || '',
        pincode: user.pincode || '',
        alternateNumber: user.alternateNumber || ''
      }
    };

    res.json({
      success: true,
      token,
      user: userResponse
    });
  } catch (error) {
    next(error);
  }
};

// User Signup
exports.signup = async (req, res, next) => {
  try {
    const { name, email, password, phone, homeAddress, interestedIn } = req.body;

    // Validation
    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (name, email, password, phone)',
        error: 'VALIDATION_ERROR'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
        error: 'VALIDATION_ERROR'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
        error: 'DUPLICATE_ENTRY'
      });
    }

    // Create user (default role is 'user', homeAddress and interestedIn are optional)
    const user = await User.create({
      name,
      email,
      password,
      phone,
      homeAddress: homeAddress || '', // Optional
      interestedIn: interestedIn || [], // Optional
      role: 'user' // Default role
    });

    // Generate token
    const token = generateToken(user._id, user.email, user.role);

    // Support both nested and top-level address formats per USER.md
    const userResponse = {
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      homeAddress: user.homeAddress || '',
      nearLandmark: user.nearLandmark || '',
      pincode: user.pincode || '',
      alternateNumber: user.alternateNumber || '',
      interestedIn: user.interestedIn || [],
      // Nested address format for backward compatibility
      address: {
        homeAddress: user.homeAddress || '',
        nearLandmark: user.nearLandmark || '',
        pincode: user.pincode || '',
        alternateNumber: user.alternateNumber || ''
      }
    };

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: userResponse
    });
  } catch (error) {
    next(error);
  }
};

// Forgot Password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email',
        error: 'VALIDATION_ERROR'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        message: 'Password reset link sent to your email'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false });

    // Send email with reset link
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    // In production, send email here
    // For now, we'll just log it
    console.log('Password reset link:', resetUrl);

    // TODO: Send email using nodemailer
    // await sendPasswordResetEmail(user.email, resetUrl);

    res.json({
      success: true,
      message: 'Password reset link sent to your email'
    });
  } catch (error) {
    next(error);
  }
};

// Reset Password
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide token and new password',
        error: 'VALIDATION_ERROR'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
        error: 'VALIDATION_ERROR'
      });
    }

    // Hash token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
        error: 'UNAUTHORIZED'
      });
    }

    // Set new password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    next(error);
  }
};

