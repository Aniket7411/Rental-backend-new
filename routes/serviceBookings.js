const express = require('express');
const router = express.Router();
const { createServiceBooking } = require('../controllers/serviceBookingController');
const { validateServiceBooking } = require('../middleware/validation');

// Public route
router.post('/', validateServiceBooking, createServiceBooking);

module.exports = router;

