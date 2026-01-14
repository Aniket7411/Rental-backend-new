const User = require('../models/User');
const OTP = require('../models/OTP');
const { generateToken } = require('../utils/jwt');
const { sendOTP, verifyOTP } = require('../utils/twilio');

// Login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
        error: 'VALIDATION_ERROR'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        error: 'UNAUTHORIZED'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        error: 'UNAUTHORIZED'
      });
    }

    // Generate token
    const token = generateToken(user._id, user.email, user.role);

    // Return user data (without password)
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
      alternateNumber: user.alternateNumber || ''
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

// Signup
exports.signup = async (req, res, next) => {
  try {
    const { name, email, password, phone, homeAddress, interestedIn } = req.body;

    // Validation
    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, password, and phone',
        error: 'VALIDATION_ERROR'
      });
    }

    // Normalize phone number
    let phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.startsWith('91') && phoneDigits.length === 12) {
      phoneDigits = phoneDigits.slice(2);
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phoneDigits,
      homeAddress: homeAddress || '',
      interestedIn: interestedIn || []
    });

    // Generate token
    const token = generateToken(user._id, user.email, user.role);

    // Return user data (without password)
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
      alternateNumber: user.alternateNumber || ''
    };

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: userResponse
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
        error: 'DUPLICATE_ENTRY'
      });
    }
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

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      // Don't reveal if user exists or not (security best practice)
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent'
      });
    }

    // Generate reset token (simplified - in production, use crypto.randomBytes)
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // In production, send email with reset link
    // For now, just return success
    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent',
      resetToken // Remove this in production
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

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
        error: 'INVALID_TOKEN'
      });
    }

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

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number',
        error: 'VALIDATION_ERROR'
      });
    }

    // Normalize phone number
    let phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.startsWith('91') && phoneDigits.length === 12) {
      phoneDigits = phoneDigits.slice(2);
    }

    if (phoneDigits.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number. Please provide a valid 10-digit phone number.',
        error: 'VALIDATION_ERROR'
      });
    }

    // Check if user exists
    const user = await User.findOne({ phone: phoneDigits });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please sign up first.',
        error: 'USER_NOT_FOUND'
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const sessionId = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to database
    await OTP.create({
      phone: phoneDigits,
      otp,
      sessionId,
      purpose: 'login',
      expiresAt,
      verified: false
    });

    // Send OTP via Twilio
    try {
      await sendOTP(phoneDigits, otp);
    } catch (twilioError) {
      console.error('Twilio error:', twilioError);

      // For development, you might want to return the OTP
      if (process.env.NODE_ENV === 'development') {
        return res.json({
          success: true,
          message: 'OTP sent successfully (development mode)',
          sessionId,
          otp // Remove this in production
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.',
        error: 'OTP_SEND_ERROR'
      });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully',
      sessionId
    });
  } catch (error) {
    next(error);
  }
};

// Verify OTP for Login
exports.verifyOTP = async (req, res, next) => {
  try {
    const { phone, otp, sessionId } = req.body;

    if (!phone || !otp || !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number, OTP, and session ID',
        error: 'VALIDATION_ERROR'
      });
    }

    // Normalize phone number
    let phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.startsWith('91') && phoneDigits.length === 12) {
      phoneDigits = phoneDigits.slice(2);
    }

    if (phoneDigits.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number. Please provide a valid 10-digit phone number.',
        error: 'VALIDATION_ERROR'
      });
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

    // Generate token
    const token = generateToken(user._id, user.email || user.phone, user.role);

    // Return user data
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
      alternateNumber: user.alternateNumber || ''
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

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number',
        error: 'VALIDATION_ERROR'
      });
    }

    // Normalize phone number
    let phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.startsWith('91') && phoneDigits.length === 12) {
      phoneDigits = phoneDigits.slice(2);
    }

    if (phoneDigits.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number. Please provide a valid 10-digit phone number.',
        error: 'VALIDATION_ERROR'
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const sessionId = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to database with optional user data
    await OTP.create({
      phone: phoneDigits,
      otp,
      sessionId,
      purpose: 'signup',
      expiresAt,
      verified: false,
      userData: {
        name: name || undefined,
        email: email || undefined
      }
    });

    // Send OTP via Twilio
    try {
      await sendOTP(phoneDigits, otp);
    } catch (twilioError) {
      console.error('Twilio error:', twilioError);

      if (process.env.NODE_ENV === 'development') {
        console.log(`🔐 Development OTP for ${phoneDigits}: ${otp}`);
        return res.json({
          success: true,
          message: 'OTP sent successfully (development mode)',
          sessionId,
          otp // Remove this in production
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.',
        error: 'OTP_SEND_ERROR'
      });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully',
      sessionId
    });
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
        message: 'Wow! You already have an account with us. Welcome back!',
        existingUser: true, // Flag to indicate user already existed
        token,
        user: userResponse
      });
    }

    // User doesn't exist - create new user
    // Use name from request or from OTP record, or default
    const userName = name ? name.trim() : (otpRecord.userData?.name || 'Guest User');
    const finalAddress = providedAddress || (homeAddress ? homeAddress.trim() : '');

    // ✅ CRITICAL FIX: Use findOneAndUpdate with upsert and $unset email to avoid email:null duplicate errors
    // This works around the database index not being sparse
    try {
      // First, check if user exists
      user = await User.findOne({ phone: phoneDigits });

      if (user) {
        // User exists - update their info
        if (name && name.trim()) {
          user.name = name.trim();
        }
        if (finalAddress && finalAddress.trim()) {
          user.homeAddress = finalAddress.trim();
        }
        if (userData?.pincode) {
          user.pincode = userData.pincode.trim();
        }
        if (userData?.nearLandmark) {
          user.nearLandmark = userData.nearLandmark.trim();
        }
        if (userData?.alternateNumber) {
          user.alternateNumber = userData.alternateNumber.trim();
        }
        await user.save();
      } else {
        // User doesn't exist - create with temporary unique email, then remove it
        // This avoids email:null duplicate error when database index is not sparse
        const tempEmail = `temp_${phoneDigits}_${Date.now()}_${Math.random().toString(36).substring(7)}@temp.local`;
        user = await User.create({
          name: userName,
          phone: phoneDigits,
          email: tempEmail, // Temporary unique email to avoid null duplicate
          homeAddress: finalAddress || '',
          pincode: userData?.pincode ? userData.pincode.trim() : '',
          nearLandmark: userData?.nearLandmark ? userData.nearLandmark.trim() : '',
          alternateNumber: userData?.alternateNumber ? userData.alternateNumber.trim() : '',
          role: 'user',
          isGuestCheckout: true,
          guestCheckoutDate: new Date()
        });
        // Remove the temporary email (set to undefined, not null)
        user.email = undefined;
        await user.save();
      }
    } catch (createError) {
      // ✅ CRITICAL FIX: Handle email:null duplicate error (database index not sparse)
      if (createError.code === 11000 && createError.keyPattern?.email && createError.keyValue?.email === null) {
        // Email:null duplicate error - database index is not sparse
        // Find user by phone (phone is unique, so this should work)
        console.log(`[INFO] Email:null duplicate error for phone ${phoneDigits}, finding user by phone...`);
        user = await User.findOne({ phone: phoneDigits });

        if (user) {
          // User exists - update their info and log them in
          let updated = false;
          if (name && name.trim()) {
            user.name = name.trim();
            updated = true;
          }
          if (finalAddress && finalAddress.trim()) {
            user.homeAddress = finalAddress.trim();
            updated = true;
          }
          if (userData?.pincode) {
            user.pincode = userData.pincode.trim();
            updated = true;
          }
          if (userData?.nearLandmark) {
            user.nearLandmark = userData.nearLandmark.trim();
            updated = true;
          }
          if (userData?.alternateNumber) {
            user.alternateNumber = userData.alternateNumber.trim();
            updated = true;
          }
          if (updated) {
            await user.save();
          }

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
            message: 'Wow! You already have an account with us. Welcome back!',
            existingUser: true,
            token,
            user: userResponse
          });
        }

        // User doesn't exist but email:null duplicate error occurred
        // Try one more time to find user (race condition)
        console.log(`[WARN] Email:null duplicate but user not found. Retrying find for phone ${phoneDigits}`);
        user = await User.findOne({ phone: phoneDigits });

        if (!user) {
          // User truly doesn't exist - this is a database index issue
          // Try to create with a workaround: use a temporary unique email, then remove it
          console.log(`[INFO] Attempting workaround: creating user with temporary email for phone ${phoneDigits}`);
          try {
            // Create with temporary unique email to avoid null duplicate
            const tempEmail = `temp_${phoneDigits}_${Date.now()}@temp.com`;
            user = await User.create({
              name: userName,
              phone: phoneDigits,
              email: tempEmail,
              homeAddress: finalAddress || '',
              pincode: userData?.pincode ? userData.pincode.trim() : '',
              nearLandmark: userData?.nearLandmark ? userData.nearLandmark.trim() : '',
              alternateNumber: userData?.alternateNumber ? userData.alternateNumber.trim() : '',
              role: 'user',
              isGuestCheckout: true,
              guestCheckoutDate: new Date()
            });
            // Remove the temporary email
            user.email = undefined;
            await user.save();
          } catch (tempEmailError) {
            // If that also fails, just find user one more time (might have been created)
            user = await User.findOne({ phone: phoneDigits });
            if (!user) {
              console.error('All creation attempts failed:', tempEmailError);
              throw createError; // Re-throw original error
            }
          }
        }
      } else {
        // Other duplicate errors (phone duplicate) - find user and log in
        console.log(`[INFO] User creation failed for phone ${phoneDigits}, checking if user exists...`);
        user = await User.findOne({ phone: phoneDigits });

        if (user) {
          // User exists - update their info and log them in
          let updated = false;
          if (name && name.trim()) {
            user.name = name.trim();
            updated = true;
          }
          if (finalAddress && finalAddress.trim()) {
            user.homeAddress = finalAddress.trim();
            updated = true;
          }
          if (userData?.pincode) {
            user.pincode = userData.pincode.trim();
            updated = true;
          }
          if (userData?.nearLandmark) {
            user.nearLandmark = userData.nearLandmark.trim();
            updated = true;
          }
          if (userData?.alternateNumber) {
            user.alternateNumber = userData.alternateNumber.trim();
            updated = true;
          }
          if (updated) {
            await user.save();
          }

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
            message: 'Wow! You already have an account with us. Welcome back!',
            existingUser: true,
            token,
            user: userResponse
          });
        }

        // User doesn't exist and creation failed - re-throw error
        console.error('User creation failed and user does not exist:', createError);
        throw createError;
      }
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
    // ✅ SIMPLIFIED: Just check if user exists by phone and log them in
    // Extract phoneDigits from request if not already defined
    if (!phoneDigits && req.body?.phone) {
      phoneDigits = req.body.phone.replace(/\D/g, '');
      if (phoneDigits.startsWith('91') && phoneDigits.length === 12) {
        phoneDigits = phoneDigits.slice(2);
      }
    }

    // If we have phoneDigits, check if user exists
    if (phoneDigits) {
      const existingUser = await User.findOne({ phone: phoneDigits });
      if (existingUser) {
        // User exists - update and log them in
        let updated = false;
        if (req.body?.name && req.body.name.trim()) {
          existingUser.name = req.body.name.trim();
          updated = true;
        }
        if (req.body?.homeAddress && req.body.homeAddress.trim()) {
          existingUser.homeAddress = req.body.homeAddress.trim();
          updated = true;
        }
        if (req.body?.userData?.pincode) {
          existingUser.pincode = req.body.userData.pincode.trim();
          updated = true;
        }
        if (req.body?.userData?.nearLandmark) {
          existingUser.nearLandmark = req.body.userData.nearLandmark.trim();
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
          message: 'Wow! You already have an account with us. Welcome back!',
          existingUser: true,
          token,
          user: userResponse
        });
      }

      // User doesn't exist - try to create with minimal data using temporary email
      console.log(`[INFO] User not found, creating with minimal data for phone ${phoneDigits}`);
      try {
        // Use temporary email approach to avoid email:null duplicate errors
        const tempEmail = `temp_${phoneDigits}_${Date.now()}_${Math.random().toString(36).substring(7)}@temp.local`;
        const minimalUser = await User.create({
          name: req.body?.name ? req.body.name.trim() : 'Guest User',
          phone: phoneDigits,
          email: tempEmail, // Temporary unique email
          homeAddress: req.body?.homeAddress || '',
          role: 'user',
          isGuestCheckout: true,
          guestCheckoutDate: new Date()
        });
        // Remove the temporary email
        minimalUser.email = undefined;
        await minimalUser.save();

        const token = generateToken(minimalUser._id, minimalUser.email || minimalUser.phone, minimalUser.role);
        const userResponse = {
          id: minimalUser._id,
          _id: minimalUser._id,
          name: minimalUser.name || 'Guest User',
          email: minimalUser.email || null,
          role: minimalUser.role,
          phone: minimalUser.phone,
          homeAddress: minimalUser.homeAddress || '',
          nearLandmark: minimalUser.nearLandmark || '',
          pincode: minimalUser.pincode || '',
          alternateNumber: minimalUser.alternateNumber || '',
          address: {
            homeAddress: minimalUser.homeAddress || '',
            nearLandmark: minimalUser.nearLandmark || '',
            pincode: minimalUser.pincode || '',
            alternateNumber: minimalUser.alternateNumber || ''
          },
          createdAt: minimalUser.createdAt
        };

        return res.status(201).json({
          success: true,
          message: 'Account created successfully',
          existingUser: false,
          token,
          user: userResponse
        });
      } catch (createError) {
        // If minimal create also fails, check one more time if user exists (race condition)
        const raceUser = await User.findOne({ phone: phoneDigits });
        if (raceUser) {
          const token = generateToken(raceUser._id, raceUser.email || raceUser.phone, raceUser.role);
          const userResponse = {
            id: raceUser._id,
            _id: raceUser._id,
            name: raceUser.name || 'Guest User',
            email: raceUser.email || null,
            role: raceUser.role,
            phone: raceUser.phone,
            homeAddress: raceUser.homeAddress || '',
            nearLandmark: raceUser.nearLandmark || '',
            pincode: raceUser.pincode || '',
            alternateNumber: raceUser.alternateNumber || '',
            address: {
              homeAddress: raceUser.homeAddress || '',
              nearLandmark: raceUser.nearLandmark || '',
              pincode: raceUser.pincode || '',
              alternateNumber: raceUser.alternateNumber || ''
            }
          };
          return res.json({
            success: true,
            message: 'Wow! You already have an account with us. Welcome back!',
            existingUser: true,
            token,
            user: userResponse
          });
        }
        // Log the error
        console.error('All user creation attempts failed:', createError);
      }
    }

    // If we reach here, something went wrong - log it
    console.error('Error in verifySignupOTP:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      phoneDigits: phoneDigits,
      phone: req.body?.phone
    });

    // Return generic error
    return res.status(500).json({
      success: false,
      message: 'Unable to complete registration. Please try again or contact support.',
      error: 'REGISTRATION_ERROR'
    });
  }
};
