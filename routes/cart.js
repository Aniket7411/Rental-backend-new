const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require('../controllers/cartController');
const { auth } = require('../middleware/auth');

// All routes require authentication
router.get('/', auth, getCart);
router.post('/', auth, addToCart);
router.patch('/:itemId', auth, updateCartItem);
router.delete('/:itemId', auth, removeFromCart);
router.delete('/', auth, clearCart);

module.exports = router;

