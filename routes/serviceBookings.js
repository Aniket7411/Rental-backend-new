const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { 
  createServiceBooking, 
  updateServiceBooking,
  getMyServiceBookings
} = require('../controllers/serviceBookingController');
const { validateServiceBooking } = require('../middleware/validation');

// Public route
router.post('/', validateServiceBooking, createServiceBooking);

// User routes - get own bookings
router.get('/my-bookings', auth, getMyServiceBookings);

// Update service booking (time, date) - requires auth
router.patch('/:id', auth, updateServiceBooking);

module.exports = router;

