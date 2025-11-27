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

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        homeAddress: user.homeAddress,
        interestedIn: user.interestedIn,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update User Profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, homeAddress, interestedIn } = req.body;

    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'NOT_FOUND'
      });
    }

    // Update fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (homeAddress) user.homeAddress = homeAddress;
    if (interestedIn) user.interestedIn = interestedIn;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

