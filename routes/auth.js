const express = require('express');
const router = express.Router();
const {
  login,
  signup,
  forgotPassword,
  resetPassword,
  sendOTP,
  verifyOTP,
  sendSignupOTP,
  verifySignupOTP
} = require('../controllers/authController');

// Public auth routes
router.post('/login', login);
router.post('/signup', signup);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// OTP-based authentication routes
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/send-signup-otp', sendSignupOTP);
router.post('/verify-signup-otp', verifySignupOTP);

module.exports = router;

