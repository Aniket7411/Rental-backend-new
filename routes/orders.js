const express = require('express');
const router = express.Router();
const {
  getUserOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  updatePaymentStatus,
  cancelOrder,
  getRefundStatus
} = require('../controllers/orderController');
const { auth, adminAuth, userOrAdminAuth } = require('../middleware/auth');

// User routes
router.get('/:orderId', auth, getOrderById);
router.post('/', auth, createOrder);
router.patch('/:orderId/cancel', userOrAdminAuth, cancelOrder);
router.get('/:orderId/refund-status', userOrAdminAuth, getRefundStatus);

// Admin routes
router.patch('/:orderId/status', adminAuth, updateOrderStatus);

module.exports = router;

