const express = require('express');
const router = express.Router();
const {
  getUserOrders,
  getOrderById,
  createOrder
} = require('../controllers/orderController');
const { auth } = require('../middleware/auth');

// User routes only
router.get('/', auth, getUserOrders);
router.get('/:orderId', auth, getOrderById);
router.post('/', auth, createOrder);

module.exports = router;

