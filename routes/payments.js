const express = require('express');
const router = express.Router();
const {
  initiatePayment,
  verifyPayment,
  calculatePayment,
  processPayment,
  getPaymentStatus,
  createRazorpayOrder,
  razorpayWebhook,
  getPaymentLink
} = require('../controllers/paymentController');
const { auth } = require('../middleware/auth');

// Webhook endpoint (no auth required - uses signature verification)
// Note: Webhook body must be raw JSON for signature verification
router.post('/webhook/razorpay', razorpayWebhook);

// All other routes require authentication
// IMPORTANT: Specific routes must come before parameterized routes (/:paymentId)
router.get('/link', auth, getPaymentLink); // Get payment link (before /:paymentId)
router.post('/create-order', auth, createRazorpayOrder); // New endpoint for creating Razorpay order
router.post('/process', auth, processPayment);
router.post('/initiate', auth, initiatePayment);
router.post('/verify', auth, verifyPayment);
router.post('/calculate', auth, calculatePayment);
router.get('/:paymentId', auth, getPaymentStatus); // Parameterized route must be last

module.exports = router;

