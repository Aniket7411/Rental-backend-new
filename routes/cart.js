const express = require('express');
const router = express.Router();
const {
  getCart,
  addRentalToCart,
  addServiceToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require('../controllers/cartController');
const { auth } = require('../middleware/auth');

// All routes require authentication
router.get('/', auth, getCart);
router.post('/rentals', auth, addRentalToCart);
router.post('/services', auth, addServiceToCart);
router.patch('/:itemId', auth, updateCartItem);
router.delete('/:itemId', auth, removeFromCart);
router.delete('/', auth, clearCart);

module.exports = router;

