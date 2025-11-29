const express = require('express');
const router = express.Router();
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist
} = require('../controllers/wishlistController');
const { auth } = require('../middleware/auth');

// All routes require authentication
router.get('/', auth, getWishlist);
router.post('/', auth, addToWishlist);
router.get('/check/:productId', auth, checkWishlist); // More specific route before generic one
router.delete('/:productId', auth, removeFromWishlist);

module.exports = router;

