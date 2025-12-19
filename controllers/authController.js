const User = require('../models/User');
const OTP = require('../models/OTP');
const { generateToken } = require('../utils/jwt');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../utils/notifications');
const { sendOTP: sendTwilioOTP, generateOTP, generateSessionId } = require('../utils/twilio');

// Unified Login (Auto-detect Admin/User)
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
        error: 'VALIDATION_ERROR'
      });
    }

    // Normalize email (lowercase and trim)
    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
        error: 'VALIDATION_ERROR'
      });
    }

    // Find user and include password
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        error: 'UNAUTHORIZED'
      });
    }

    // Check if user has a password (required for email/password login)
    if (!user.password) {
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
    // Match exact response format from requirements
    const userResponse = {
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role, // 'admin' or 'user'
      phone: user.phone || null
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
    const resetUrl = `${process.env.FRONTEND_URL || 'https://rental-ac-frontend.vercel.app'}/reset-password?token=${resetToken}`;

    try {
      // Send password reset email
      await sendPasswordResetEmail(user.email, resetUrl, user.name);
      
      res.json({
        success: true,
        message: 'Password reset link sent to your email'
      });
    } catch (emailError) {
      // If email fails, clear the reset token
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      
      // Log detailed error information
      console.error('❌ Error sending password reset email:');
      console.error('Error message:', emailError.message);
      console.error('Error stack:', emailError.stack);
      
      // Return error response
      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset email. Please try again later.',
        error: 'EMAIL_ERROR',
        // Include error details in development mode
        ...(process.env.NODE_ENV === 'development' && {
          details: emailError.message
        })
      });
    }
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

// Send OTP for Login
exports.sendOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;

    // Validation
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number',
        error: 'VALIDATION_ERROR'
      });
    }

    // Validate phone number format (10 digits)
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be 10 digits',
        error: 'VALIDATION_ERROR'
      });
    }

    // Check if user exists
    const user = await User.findOne({ phone: phoneDigits });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this phone number. Please sign up first.',
        error: 'USER_NOT_FOUND'
      });
    }

    // Rate limiting: Check for recent OTP requests (max 3 per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOTPs = await OTP.countDocuments({
      phone: phoneDigits,
      purpose: 'login',
      createdAt: { $gte: oneHourAgo }
    });

    if (recentOTPs >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please try again after some time.',
        error: 'RATE_LIMIT_EXCEEDED'
      });
    }

    // Generate OTP and session ID
    const otp = generateOTP();
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    await OTP.create({
      phone: phoneDigits,
      otp,
      sessionId,
      purpose: 'login',
      expiresAt
    });

    // Send OTP via Twilio
    try {
      await sendTwilioOTP(phoneDigits, otp);
      
      res.json({
        success: true,
        message: 'OTP sent successfully to your phone number',
        sessionId
      });
    } catch (twilioError) {
      // If Twilio fails, still return success but log the error
      // In production, you might want to handle this differently
      console.error('Twilio error:', twilioError);
      
      // For development, you might want to return the OTP
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔐 Development OTP for ${phoneDigits}: ${otp}`);
        return res.json({
          success: true,
          message: 'OTP sent successfully (development mode)',
          sessionId,
          // Only in development
          ...(process.env.NODE_ENV === 'development' && { otp })
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again later.',
        error: 'OTP_SEND_FAILED'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Verify OTP for Login
exports.verifyOTP = async (req, res, next) => {
  try {
    const { phone, otp, sessionId } = req.body;

    // Validation
    if (!phone || !otp || !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number, OTP, and session ID',
        error: 'VALIDATION_ERROR'
      });
    }

    const phoneDigits = phone.replace(/\D/g, '');

    // Find OTP record
    const otpRecord = await OTP.findOne({
      phone: phoneDigits,
      sessionId,
      purpose: 'login',
      verified: false
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session or OTP already used',
        error: 'INVALID_SESSION'
      });
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
        error: 'OTP_EXPIRED'
      });
    }

    // Check verification attempts
    if (otpRecord.attempts >= 5) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: 'Too many verification attempts. Please request a new OTP.',
        error: 'MAX_ATTEMPTS_EXCEEDED'
      });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
        error: 'INVALID_OTP',
        attemptsRemaining: 5 - otpRecord.attempts
      });
    }

    // OTP is valid - mark as verified and delete
    await OTP.deleteOne({ _id: otpRecord._id });

    // Find user
    const user = await User.findOne({ phone: phoneDigits });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    // Generate token (use phone as identifier if email is not available)
    const token = generateToken(user._id, user.email || user.phone, user.role);

    // Return user data
    const userResponse = {
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email || '',
      role: user.role,
      phone: user.phone,
      homeAddress: user.homeAddress || '',
      nearLandmark: user.nearLandmark || '',
      pincode: user.pincode || '',
      alternateNumber: user.alternateNumber || '',
      interestedIn: user.interestedIn || [],
      address: {
        homeAddress: user.homeAddress || '',
        nearLandmark: user.nearLandmark || '',
        pincode: user.pincode || '',
        alternateNumber: user.alternateNumber || ''
      }
    };

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    next(error);
  }
};

// Send OTP for Signup
exports.sendSignupOTP = async (req, res, next) => {
  try {
    const { phone, name, email } = req.body;

    // Validation
    if (!phone || !name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number and name',
        error: 'VALIDATION_ERROR'
      });
    }

    // Validate phone number format
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be 10 digits',
        error: 'VALIDATION_ERROR'
      });
    }

    // Validate email format if provided
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
        error: 'VALIDATION_ERROR'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ phone: phoneDigits });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this phone number. Please login instead.',
        error: 'USER_EXISTS'
      });
    }

    // Check if email is already taken (if provided)
    if (email) {
      const emailExists = await User.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered. Please use a different email or login.',
          error: 'EMAIL_EXISTS'
        });
      }
    }

    // Rate limiting
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOTPs = await OTP.countDocuments({
      phone: phoneDigits,
      purpose: 'signup',
      createdAt: { $gte: oneHourAgo }
    });

    if (recentOTPs >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please try again after some time.',
        error: 'RATE_LIMIT_EXCEEDED'
      });
    }

    // Generate OTP and session ID
    const otp = generateOTP();
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP with user data
    await OTP.create({
      phone: phoneDigits,
      otp,
      sessionId,
      purpose: 'signup',
      userData: {
        name: name.trim(),
        email: email ? email.toLowerCase().trim() : undefined
      },
      expiresAt
    });

    // Send OTP via Twilio
    try {
      await sendTwilioOTP(phoneDigits, otp);
      
      res.json({
        success: true,
        message: 'OTP sent successfully to your phone number',
        sessionId
      });
    } catch (twilioError) {
      console.error('Twilio error:', twilioError);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔐 Development OTP for ${phoneDigits}: ${otp}`);
        return res.json({
          success: true,
          message: 'OTP sent successfully (development mode)',
          sessionId,
          ...(process.env.NODE_ENV === 'development' && { otp })
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again later.',
        error: 'OTP_SEND_FAILED'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Verify OTP for Signup
exports.verifySignupOTP = async (req, res, next) => {
  try {
    const { phone, otp, sessionId, name, email } = req.body;

    // Validation
    if (!phone || !otp || !sessionId || !name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number, OTP, session ID, and name',
        error: 'VALIDATION_ERROR'
      });
    }

    const phoneDigits = phone.replace(/\D/g, '');

    // Find OTP record
    const otpRecord = await OTP.findOne({
      phone: phoneDigits,
      sessionId,
      purpose: 'signup',
      verified: false
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session or OTP already used',
        error: 'INVALID_SESSION'
      });
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
        error: 'OTP_EXPIRED'
      });
    }

    // Check verification attempts
    if (otpRecord.attempts >= 5) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: 'Too many verification attempts. Please request a new OTP.',
        error: 'MAX_ATTEMPTS_EXCEEDED'
      });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
        error: 'INVALID_OTP',
        attemptsRemaining: 5 - otpRecord.attempts
      });
    }

    // Verify user data matches
    if (otpRecord.userData.name !== name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name does not match. Please use the same name used during signup.',
        error: 'DATA_MISMATCH'
      });
    }

    if (email && otpRecord.userData.email && otpRecord.userData.email !== email.toLowerCase().trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email does not match. Please use the same email used during signup.',
        error: 'DATA_MISMATCH'
      });
    }

    // OTP is valid - mark as verified and delete
    await OTP.deleteOne({ _id: otpRecord._id });

    // Check if user already exists (double check)
    const existingUser = await User.findOne({ phone: phoneDigits });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this phone number',
        error: 'USER_EXISTS'
      });
    }

    // Create new user
    const user = await User.create({
      name: otpRecord.userData.name,
      email: otpRecord.userData.email || undefined,
      phone: phoneDigits,
      role: 'user'
      // Password is optional - not required for OTP-based auth
    });

    // Generate token
    const token = generateToken(user._id, user.email || user.phone, user.role);

    // Return user data
    const userResponse = {
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email || '',
      role: user.role,
      phone: user.phone,
      homeAddress: user.homeAddress || '',
      nearLandmark: user.nearLandmark || '',
      pincode: user.pincode || '',
      alternateNumber: user.alternateNumber || '',
      interestedIn: user.interestedIn || [],
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
    // Handle duplicate key error (phone or email)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field === 'phone' ? 'Phone number' : 'Email'} already exists`,
        error: 'DUPLICATE_ENTRY'
      });
    }
    next(error);
  }
};

