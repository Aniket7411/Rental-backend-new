const express = require('express');
const router = express.Router();
const {
  getUserOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  cancelOrder
} = require('../controllers/orderController');
const { auth, adminAuth, userOrAdminAuth } = require('../middleware/auth');

// User routes
router.get('/:orderId', auth, getOrderById);
router.post('/', auth, createOrder);
router.patch('/:orderId/cancel', userOrAdminAuth, cancelOrder);

// Admin routes
router.patch('/:orderId/status', adminAuth, updateOrderStatus);

module.exports = router;

