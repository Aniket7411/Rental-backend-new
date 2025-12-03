const express = require('express');
const router = express.Router();
const {
  validateCoupon,
  getAvailableCoupons
} = require('../controllers/couponController');

// Public routes
router.post('/validate', validateCoupon);
router.get('/available', getAvailableCoupons);

module.exports = router;

