const express = require('express');
const router = express.Router();
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist
} = require('../controllers/wishlistController');
const { auth } = require('../middleware/auth');

// All routes require authentication
router.get('/', auth, getWishlist);
router.post('/', auth, addToWishlist);
router.delete('/:itemId', auth, removeFromWishlist);

module.exports = router;

