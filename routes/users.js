const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile
} = require('../controllers/userController');
const { getUserOrders } = require('../controllers/orderController');
const { auth } = require('../middleware/auth');

// Protected routes only (auth endpoints moved to /api/auth/*)
router.get('/profile', auth, getProfile);
router.patch('/profile', auth, updateProfile);

// User orders route - /api/users/:userId/orders
// Note: /api/users/orders is handled by orderRoutes in server.js
router.get('/:userId/orders', auth, getUserOrders);

module.exports = router;

