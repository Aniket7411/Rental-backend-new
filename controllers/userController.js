const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const crypto = require('crypto');
const { notifyAdmin } = require('../utils/notifications');

// Note: Login, Signup, Forgot Password, and Reset Password have been moved to authController
// These endpoints are now available at /api/auth/*

// Get User Profile
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'NOT_FOUND'
      });
    }

    // Support both nested and top-level address formats per USER.md
    res.json({
      success: true,
      data: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        homeAddress: user.homeAddress || '',
        nearLandmark: user.nearLandmark || '',
        pincode: user.pincode || '',
        alternateNumber: user.alternateNumber || '',
        interestedIn: user.interestedIn || [],
        role: user.role,
        // Nested address format for backward compatibility
        address: {
          homeAddress: user.homeAddress || '',
          nearLandmark: user.nearLandmark || '',
          pincode: user.pincode || '',
          alternateNumber: user.alternateNumber || ''
        },
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update User Profile
// Supports both nested (address.homeAddress) and top-level (homeAddress) formats per USER.md
exports.updateProfile = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      homeAddress,
      pincode,
      nearLandmark,
      alternateNumber,
      interestedIn,
      address // Nested address format
    } = req.body;

    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'NOT_FOUND'
      });
    }

    // Update fields - support both nested and top-level formats
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;

    // Handle address fields - prefer nested format, fallback to top-level
    if (address) {
      // Nested format: { address: { homeAddress, nearLandmark, pincode, alternateNumber } }
      if (address.homeAddress !== undefined) user.homeAddress = address.homeAddress;
      if (address.nearLandmark !== undefined) user.nearLandmark = address.nearLandmark;
      if (address.pincode !== undefined) user.pincode = address.pincode;
      if (address.alternateNumber !== undefined) user.alternateNumber = address.alternateNumber;
    } else {
      // Top-level format: { homeAddress, nearLandmark, pincode, alternateNumber }
      if (homeAddress !== undefined) user.homeAddress = homeAddress;
      if (nearLandmark !== undefined) user.nearLandmark = nearLandmark;
      if (pincode !== undefined) user.pincode = pincode;
      if (alternateNumber !== undefined) user.alternateNumber = alternateNumber;
    }

    if (interestedIn !== undefined) user.interestedIn = interestedIn;

    await user.save();

    // Return response with both nested and top-level formats per USER.md
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        homeAddress: user.homeAddress || '',
        nearLandmark: user.nearLandmark || '',
        pincode: user.pincode || '',
        alternateNumber: user.alternateNumber || '',
        // Nested address format for backward compatibility
        address: {
          homeAddress: user.homeAddress || '',
          nearLandmark: user.nearLandmark || '',
          pincode: user.pincode || '',
          alternateNumber: user.alternateNumber || ''
        },
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

