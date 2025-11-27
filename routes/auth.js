const express = require('express');
const router = express.Router();
const {
  login,
  signup,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

// Public auth routes
router.post('/login', login);
router.post('/signup', signup);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;

