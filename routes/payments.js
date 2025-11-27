const express = require('express');
const router = express.Router();
const {
  initiatePayment,
  verifyPayment,
  calculatePayment
} = require('../controllers/paymentController');
const { auth } = require('../middleware/auth');

// All routes require authentication
router.post('/initiate', auth, initiatePayment);
router.post('/verify', auth, verifyPayment);
router.post('/calculate', auth, calculatePayment);

module.exports = router;

