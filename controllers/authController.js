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

    // Validate and normalize phone number format
    // Accept formats: "+911234567890" or "1234567890" (10 digits)
    let phoneDigits = phone.replace(/\D/g, '');
    
    // If phone starts with +91 or 91, extract last 10 digits
    if (phoneDigits.startsWith('91') && phoneDigits.length === 12) {
      phoneDigits = phoneDigits.slice(2); // Remove "91" prefix
    }
    
    // Validate: must be exactly 10 digits
    if (phoneDigits.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be 10 digits (e.g., +911234567890 or 1234567890)',
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

    // Normalize phone number (handle +91 format)
    let phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.startsWith('91') && phoneDigits.length === 12) {
      phoneDigits = phoneDigits.slice(2); // Remove "91" prefix
    }

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

    // Return user data with all fields
    const userResponse = {
      id: user._id,
      _id: user._id,
      name: user.name || 'Guest User',
      email: user.email || null, // Can be null for OTP-based auth
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

// Send OTP for Signup (Guest Checkout)
exports.sendSignupOTP = async (req, res, next) => {
  try {
    const { phone, name, email } = req.body;

    // Validation - phone is required, name and email are optional
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number',
        error: 'VALIDATION_ERROR'
      });
    }

    // Validate and normalize phone number format
    // Accept formats: "+911234567890" or "1234567890" (10 digits)
    let phoneDigits = phone.replace(/\D/g, '');
    
    // If phone starts with +91 or 91, extract last 10 digits
    if (phoneDigits.startsWith('91') && phoneDigits.length === 12) {
      phoneDigits = phoneDigits.slice(2); // Remove "91" prefix
    }
    
    // Validate: must be exactly 10 digits
    if (phoneDigits.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be 10 digits (e.g., +911234567890 or 1234567890)',
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

    // ✅ SEAMLESS CHECKOUT: Always send signup OTP (don't differentiate between new/existing users)
    // Whether user is new or existing will be handled during OTP verification
    // This allows seamless checkout for all users without blocking them
    
    // ✅ DO NOT check if user exists here - send OTP anyway
    // ✅ DO NOT check if email exists here - send OTP anyway
    // All checks will be handled gracefully during verification

    // Rate limiting: 3 requests per 15 minutes (per requirements)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentOTPs = await OTP.countDocuments({
      phone: phoneDigits,
      purpose: 'signup',
      createdAt: { $gte: fifteenMinutesAgo }
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

    // Store OTP with user data (name and email are optional)
    await OTP.create({
      phone: phoneDigits,
      otp,
      sessionId,
      purpose: 'signup',
      userData: {
        name: name ? name.trim() : undefined,
        email: email ? email.toLowerCase().trim() : undefined
      },
      expiresAt
    });

    // Send OTP via Twilio
    try {
      await sendTwilioOTP(phoneDigits, otp);
      
      res.json({
        success: true,
        message: 'OTP sent successfully',
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

// Verify OTP for Signup (Guest Checkout)
exports.verifySignupOTP = async (req, res, next) => {
  // Extract phoneDigits early so it's available in catch blocks
  let phoneDigits = null;
  
  try {
    const { phone, otp, sessionId, name, email, homeAddress, userData } = req.body;
    
    // Extract address from userData if provided (for guest checkout)
    const providedAddress = userData?.homeAddress || homeAddress;

    // Validation - phone, otp, and sessionId are required; name, email, homeAddress are optional
    if (!phone || !otp || !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number, OTP, and session ID',
        error: 'VALIDATION_ERROR'
      });
    }

    // Normalize phone number (handle +91 format)
    // Extract phone digits (remove +91 or other country codes)
    phoneDigits = phone.replace(/\D/g, ''); // Remove all non-digit characters first
    if (phoneDigits.startsWith('91') && phoneDigits.length === 12) {
      phoneDigits = phoneDigits.slice(2); // Remove "91" prefix to get 10-digit number
    }
    
    // Validate phone number length (should be 10 digits)
    if (phoneDigits.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number. Please provide a valid 10-digit phone number.',
        error: 'VALIDATION_ERROR'
      });
    }

    // Try to find OTP record for signup first
    let otpRecord = await OTP.findOne({
      phone: phoneDigits,
      sessionId,
      purpose: 'signup',
      verified: false
    });

    // If not found, try login OTP (for existing users)
    if (!otpRecord) {
      otpRecord = await OTP.findOne({
        phone: phoneDigits,
        sessionId,
        purpose: 'login',
        verified: false
      });
    }

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

    // Check if user already exists (by phone)
    let user = await User.findOne({ phone: phoneDigits });

    if (user) {
      // User exists - log them in (for guest checkout)
      // Update user data if provided
      let updated = false;
      // Update name if provided (update even if user already has name - allows name changes)
      if (name && name.trim()) {
        user.name = name.trim();
        updated = true;
      }
      // Handle email gracefully - never block checkout for email conflicts
      if (email && email.trim()) {
        const normalizedEmail = email.toLowerCase().trim();
        // Validate email format
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (emailRegex.test(normalizedEmail)) {
          // Check if email is already used by this user
          if (user.email === normalizedEmail) {
            // Same email - no change needed
          } else {
            // Different email provided - check if it's available
            const emailExists = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
            if (!emailExists) {
              // Email is available - update user's email
              user.email = normalizedEmail;
              updated = true;
            } else {
              // Email exists in another account - keep existing email (don't update)
              // This is NOT an error - checkout should proceed smoothly
              console.log(`[INFO] Email ${normalizedEmail} already exists in another account. Keeping existing email for user ${user._id}`);
            }
          }
        }
      }
      // Update address if provided (mandatory for guest checkout)
      const addressToUpdate = providedAddress || homeAddress;
      if (addressToUpdate && addressToUpdate.trim()) {
        user.homeAddress = addressToUpdate.trim();
        // Also update address fields if provided in userData
        if (userData?.pincode) {
          user.pincode = userData.pincode.trim();
        }
        if (userData?.nearLandmark) {
          user.nearLandmark = userData.nearLandmark.trim();
        }
        if (userData?.alternateNumber) {
          user.alternateNumber = userData.alternateNumber.trim();
        }
        updated = true;
      } else {
        // For guest checkout, address should be mandatory
        // But we'll allow existing users without address update (backward compatibility)
        console.log(`[INFO] No address provided for existing user ${user._id} during guest checkout`);
      }
      if (updated) {
        await user.save();
      }

      // Generate token
      const token = generateToken(user._id, user.email || user.phone, user.role);

      // Return user data with all fields per requirements
      const userResponse = {
        id: user._id,
        _id: user._id,
        name: user.name || 'Guest User',
        email: user.email || null, // Can be null for guest checkout
        role: user.role,
        phone: user.phone,
        homeAddress: user.homeAddress || '',
        nearLandmark: user.nearLandmark || '',
        pincode: user.pincode || '',
        alternateNumber: user.alternateNumber || '',
        address: {
          homeAddress: user.homeAddress || '',
          nearLandmark: user.nearLandmark || '',
          pincode: user.pincode || '',
          alternateNumber: user.alternateNumber || ''
        }
      };

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: userResponse
      });
    }

    // User doesn't exist - create new user
    // Use name from request or from OTP record, or default
    const userName = name ? name.trim() : (otpRecord.userData?.name || 'Guest User');
    let userEmail = email ? email.toLowerCase().trim() : (otpRecord.userData?.email || undefined);
    
    // Extract address - prioritize userData.homeAddress, then homeAddress parameter, then from OTP record
    const finalAddress = providedAddress || (homeAddress ? homeAddress.trim() : '');
    
    // For guest checkout, address should be mandatory for new users
    // But we'll allow creation without address for backward compatibility (log warning)
    if (!finalAddress || !finalAddress.trim()) {
      console.log(`[WARN] Guest checkout user creation without address for phone ${phoneDigits}`);
    }
    
    // If email is provided, check if it exists in another account
    // Handle email conflicts gracefully
    if (userEmail) {
      const emailExists = await User.findOne({ email: userEmail });
      if (emailExists) {
        // Email exists in another account - create account without email
        // This allows guest checkout to proceed even if email is already registered
        console.log(`[INFO] Email ${userEmail} already exists. Creating account without email for phone ${phoneDigits}`);
        userEmail = undefined; // Don't use the email - create account without it
      }
    }

    // Create new user - email is optional, address should be provided
    // Note: Don't include email field if undefined (for sparse index compatibility)
    try {
      const userDataToCreate = {
        name: userName || 'Guest User', // Default name if not provided
        phone: phoneDigits,
        homeAddress: finalAddress || '',
        pincode: userData?.pincode ? userData.pincode.trim() : '',
        nearLandmark: userData?.nearLandmark ? userData.nearLandmark.trim() : '',
        alternateNumber: userData?.alternateNumber ? userData.alternateNumber.trim() : '',
        role: 'user',
        isGuestCheckout: true, // Track guest checkout users
        guestCheckoutDate: new Date() // Record when user was created via guest checkout
        // Password is optional - not required for OTP-based auth
      };
      
      // Only add email if it's provided (don't set to null/undefined - omit the field)
      // This ensures the sparse index works correctly even if database index isn't sparse yet
      if (userEmail) {
        userDataToCreate.email = userEmail;
      }
      // If email is not provided, don't include it in the create object
      // This prevents "email: null" from being stored, which causes duplicate errors
      
      user = await User.create(userDataToCreate);
    } catch (createError) {
      // Handle duplicate key errors gracefully
      if (createError.code === 11000) {
        const field = Object.keys(createError.keyPattern)[0];
        if (field === 'phone') {
          // Phone already exists - try to find and login instead
          user = await User.findOne({ phone: phoneDigits });
          if (user) {
            // Generate token for existing user
            const token = generateToken(user._id, user.email || user.phone, user.role);
            const userResponse = {
              id: user._id,
              _id: user._id,
              name: user.name || 'Guest User',
              email: user.email || null, // Can be null for guest checkout
              role: user.role,
              phone: user.phone,
              homeAddress: user.homeAddress || '',
              nearLandmark: user.nearLandmark || '',
              pincode: user.pincode || '',
              alternateNumber: user.alternateNumber || '',
              address: {
                homeAddress: user.homeAddress || '',
                nearLandmark: user.nearLandmark || '',
                pincode: user.pincode || '',
                alternateNumber: user.alternateNumber || ''
              }
            };
            return res.json({
              success: true,
              message: 'Login successful',
              token,
              user: userResponse
            });
          }
        }
        // ✅ SEAMLESS CHECKOUT: Never return error for duplicates - handle gracefully
        // If it's a phone duplicate (shouldn't happen due to check above), find and login
        // If it's an email duplicate, retry without email
        if (field === 'email' && userEmail) {
          // Retry creating user without email
          console.log(`[INFO] Email duplicate error. Retrying without email for phone ${phoneDigits}`);
          try {
            user = await User.create({
              name: userName || 'Guest User',
              email: undefined, // Create without email
              phone: phoneDigits,
              homeAddress: finalAddress || '',
              pincode: userData?.pincode ? userData.pincode.trim() : '',
              nearLandmark: userData?.nearLandmark ? userData.nearLandmark.trim() : '',
              alternateNumber: userData?.alternateNumber ? userData.alternateNumber.trim() : '',
              role: 'user',
              isGuestCheckout: true,
              guestCheckoutDate: new Date()
            });
          } catch (retryError) {
            // If retry fails, try to find existing user
            if (retryError.code === 11000 && retryError.keyPattern?.phone) {
              user = await User.findOne({ phone: phoneDigits });
              if (user) {
                const token = generateToken(user._id, user.email || user.phone, user.role);
                const userResponse = {
                  id: user._id,
                  _id: user._id,
                  name: user.name || 'Guest User',
                  email: user.email || null,
                  role: user.role,
                  phone: user.phone,
                  homeAddress: user.homeAddress || '',
                  nearLandmark: user.nearLandmark || '',
                  pincode: user.pincode || '',
                  alternateNumber: user.alternateNumber || '',
                  address: {
                    homeAddress: user.homeAddress || '',
                    nearLandmark: user.nearLandmark || '',
                    pincode: user.pincode || '',
                    alternateNumber: user.alternateNumber || ''
                  }
                };
                return res.json({
                  success: true,
                  message: 'Account created successfully',
                  token,
                  user: userResponse
                });
              }
            }
            throw retryError; // Re-throw if we can't handle it
          }
        } else {
          // Phone duplicate or other error - should not happen, but handle gracefully
          // Try to find existing user
          if (field === 'phone') {
            user = await User.findOne({ phone: phoneDigits });
            if (user) {
              const token = generateToken(user._id, user.email || user.phone, user.role);
              const userResponse = {
                id: user._id,
                _id: user._id,
                name: user.name || 'Guest User',
                email: user.email || null,
                role: user.role,
                phone: user.phone,
                homeAddress: user.homeAddress || '',
                nearLandmark: user.nearLandmark || '',
                pincode: user.pincode || '',
                alternateNumber: user.alternateNumber || '',
                address: {
                  homeAddress: user.homeAddress || '',
                  nearLandmark: user.nearLandmark || '',
                  pincode: user.pincode || '',
                  alternateNumber: user.alternateNumber || ''
                }
              };
              return res.json({
                success: true,
                message: 'Account created successfully',
                token,
                user: userResponse
              });
            }
          }
          throw createError; // Re-throw if we can't handle it
        }
      }
      throw createError; // Re-throw other errors
    }

    // Generate token
    const token = generateToken(user._id, user.email || user.phone, user.role);

    // Return user data with all fields per requirements
    const userResponse = {
      id: user._id,
      _id: user._id,
      name: user.name || 'Guest User',
      email: user.email || null, // Can be null for guest checkout
      role: user.role,
      phone: user.phone,
      homeAddress: user.homeAddress || '',
      nearLandmark: user.nearLandmark || '',
      pincode: user.pincode || '',
      alternateNumber: user.alternateNumber || '',
      address: {
        homeAddress: user.homeAddress || '',
        nearLandmark: user.nearLandmark || '',
        pincode: user.pincode || '',
        alternateNumber: user.alternateNumber || ''
      },
      createdAt: user.createdAt
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
      
      // Extract phoneDigits from request if not already defined
      if (!phoneDigits && req.body?.phone) {
        phoneDigits = req.body.phone.replace(/\D/g, ''); // Handles spaces: "+91 8318825828" → "918318825828"
        if (phoneDigits.startsWith('91') && phoneDigits.length === 12) {
          phoneDigits = phoneDigits.slice(2); // → "8318825828"
        }
      }
      
      // ✅ CRITICAL FIX: Handle email:null duplicate error (database index not sparse)
      // This happens when multiple users try to create accounts without email
      // The database index on email might not be sparse, causing duplicate key errors for null values
      if (field === 'email' && error.keyValue?.email === null && phoneDigits) {
        // Try to find existing user by phone (most likely scenario)
        const existingUser = await User.findOne({ phone: phoneDigits });
        if (existingUser) {
          // Update user profile if data provided
          let updated = false;
          if (name && name.trim()) {
            existingUser.name = name.trim();
            updated = true;
          }
          if (homeAddress && homeAddress.trim()) {
            existingUser.homeAddress = homeAddress.trim();
            updated = true;
          }
          if (userData?.pincode) {
            existingUser.pincode = userData.pincode.trim();
            updated = true;
          }
          if (userData?.nearLandmark) {
            existingUser.nearLandmark = userData.nearLandmark.trim();
            updated = true;
          }
          if (updated) {
            await existingUser.save();
          }
          
          const token = generateToken(existingUser._id, existingUser.email || existingUser.phone, existingUser.role);
          const userResponse = {
            id: existingUser._id,
            _id: existingUser._id,
            name: existingUser.name || 'Guest User',
            email: existingUser.email || null,
            role: existingUser.role,
            phone: existingUser.phone,
            homeAddress: existingUser.homeAddress || '',
            nearLandmark: existingUser.nearLandmark || '',
            pincode: existingUser.pincode || '',
            alternateNumber: existingUser.alternateNumber || '',
            address: {
              homeAddress: existingUser.homeAddress || '',
              nearLandmark: existingUser.nearLandmark || '',
              pincode: existingUser.pincode || '',
              alternateNumber: existingUser.alternateNumber || ''
            }
          };
          return res.json({
            success: true,
            message: 'Login successful',
            token,
            user: userResponse
          });
        }
        
        // If user not found by phone, try to create without email (retry with different approach)
        // This handles the case where the database index is not sparse
        console.log(`[WARN] Email null duplicate error for phone ${phoneDigits}. Attempting to find or create user.`);
        try {
          // Try to find user by phone one more time
          const userByPhone = await User.findOne({ phone: phoneDigits });
          if (userByPhone) {
            const token = generateToken(userByPhone._id, userByPhone.email || userByPhone.phone, userByPhone.role);
            const userResponse = {
              id: userByPhone._id,
              _id: userByPhone._id,
              name: userByPhone.name || 'Guest User',
              email: userByPhone.email || null,
              role: userByPhone.role,
              phone: userByPhone.phone,
              homeAddress: userByPhone.homeAddress || '',
              nearLandmark: userByPhone.nearLandmark || '',
              pincode: userByPhone.pincode || '',
              alternateNumber: userByPhone.alternateNumber || '',
              address: {
                homeAddress: userByPhone.homeAddress || '',
                nearLandmark: userByPhone.nearLandmark || '',
                pincode: userByPhone.pincode || '',
                alternateNumber: userByPhone.alternateNumber || ''
              }
            };
            return res.json({
              success: true,
              message: 'Login successful',
              token,
              user: userResponse
            });
          }
        } catch (findError) {
          console.error('Error finding user by phone:', findError);
        }
      }
      
      if (field === 'phone' && phoneDigits) {
        // Phone already exists - try to find and login instead
        const existingUser = await User.findOne({ phone: phoneDigits });
        if (existingUser) {
          // Update user profile if data provided
          let updated = false;
          if (name && name.trim()) {
            existingUser.name = name.trim();
            updated = true;
          }
          if (homeAddress && homeAddress.trim()) {
            existingUser.homeAddress = homeAddress.trim();
            updated = true;
          }
          if (userData?.pincode) {
            existingUser.pincode = userData.pincode.trim();
            updated = true;
          }
          if (userData?.nearLandmark) {
            existingUser.nearLandmark = userData.nearLandmark.trim();
            updated = true;
          }
          if (updated) {
            await existingUser.save();
          }
          
          const token = generateToken(existingUser._id, existingUser.email || existingUser.phone, existingUser.role);
          const userResponse = {
            id: existingUser._id,
            _id: existingUser._id,
            name: existingUser.name || 'Guest User',
            email: existingUser.email || null,
            role: existingUser.role,
            phone: existingUser.phone,
            homeAddress: existingUser.homeAddress || '',
            nearLandmark: existingUser.nearLandmark || '',
            pincode: existingUser.pincode || '',
            alternateNumber: existingUser.alternateNumber || '',
            address: {
              homeAddress: existingUser.homeAddress || '',
              nearLandmark: existingUser.nearLandmark || '',
              pincode: existingUser.pincode || '',
              alternateNumber: existingUser.alternateNumber || ''
            }
          };
          return res.json({
            success: true,
            message: 'Login successful',
            token,
            user: userResponse
          });
        }
      }
      
      // ✅ SEAMLESS CHECKOUT: Handle email duplicate (non-null email)
      if (field === 'email' && error.keyValue?.email !== null && phoneDigits) {
        // Try to find existing user by phone
        const existingUser = await User.findOne({ phone: phoneDigits });
        if (existingUser) {
          const token = generateToken(existingUser._id, existingUser.email || existingUser.phone, existingUser.role);
          const userResponse = {
            id: existingUser._id,
            _id: existingUser._id,
            name: existingUser.name || 'Guest User',
            email: existingUser.email || null,
            role: existingUser.role,
            phone: existingUser.phone,
            homeAddress: existingUser.homeAddress || '',
            nearLandmark: existingUser.nearLandmark || '',
            pincode: existingUser.pincode || '',
            alternateNumber: existingUser.alternateNumber || '',
            address: {
              homeAddress: existingUser.homeAddress || '',
              nearLandmark: existingUser.nearLandmark || '',
              pincode: existingUser.pincode || '',
              alternateNumber: existingUser.alternateNumber || ''
            }
          };
          return res.json({
            success: true,
            message: 'Account created successfully',
            token,
            user: userResponse
          });
        }
      }
      
      // ✅ SEAMLESS CHECKOUT: For any duplicate error, try to find existing user by phone
      // This handles edge cases where phoneDigits might not be set or field is unknown
      if (phoneDigits) {
        const existingUser = await User.findOne({ phone: phoneDigits });
        if (existingUser) {
          // Update user profile if data provided
          let updated = false;
          if (name && name.trim()) {
            existingUser.name = name.trim();
            updated = true;
          }
          if (homeAddress && homeAddress.trim()) {
            existingUser.homeAddress = homeAddress.trim();
            updated = true;
          }
          if (userData?.pincode) {
            existingUser.pincode = userData.pincode.trim();
            updated = true;
          }
          if (userData?.nearLandmark) {
            existingUser.nearLandmark = userData.nearLandmark.trim();
            updated = true;
          }
          if (updated) {
            await existingUser.save();
          }
          
          const token = generateToken(existingUser._id, existingUser.email || existingUser.phone, existingUser.role);
          const userResponse = {
            id: existingUser._id,
            _id: existingUser._id,
            name: existingUser.name || 'Guest User',
            email: existingUser.email || null,
            role: existingUser.role,
            phone: existingUser.phone,
            homeAddress: existingUser.homeAddress || '',
            nearLandmark: existingUser.nearLandmark || '',
            pincode: existingUser.pincode || '',
            alternateNumber: existingUser.alternateNumber || '',
            address: {
              homeAddress: existingUser.homeAddress || '',
              nearLandmark: existingUser.nearLandmark || '',
              pincode: existingUser.pincode || '',
              alternateNumber: existingUser.alternateNumber || ''
            }
          };
          return res.json({
            success: true,
            message: 'Login successful',
            token,
            user: userResponse
          });
        }
      }
      
      // If we can't handle the duplicate error gracefully, log it and return a user-friendly message
      console.error('Duplicate key error that could not be handled gracefully:', error);
      return res.status(400).json({
        success: false,
        message: 'An account with this information already exists. Please try logging in.',
        error: 'DUPLICATE_ENTRY'
      });
    }
    // For non-duplicate errors, pass to error handler
    next(error);
  }
};

