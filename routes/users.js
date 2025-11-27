const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile
} = require('../controllers/userController');
const { auth } = require('../middleware/auth');

// Protected routes only (auth endpoints moved to /api/auth/*)
router.get('/profile', auth, getProfile);
router.patch('/profile', auth, updateProfile);

module.exports = router;

