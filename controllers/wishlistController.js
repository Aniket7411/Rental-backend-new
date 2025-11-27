const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');

// Get User Wishlist
exports.getWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const wishlistItems = await Wishlist.find({ userId })
      .populate('productId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: wishlistItems
    });
  } catch (error) {
    next(error);
  }
};

// Add to Wishlist
exports.addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;
    const userId = req.user._id || req.user.id;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
        error: 'VALIDATION_ERROR'
      });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        error: 'NOT_FOUND'
      });
    }

    // Check if already in wishlist
    let wishlistItem = await Wishlist.findOne({ userId, productId });

    if (wishlistItem) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist',
        error: 'DUPLICATE_ENTRY'
      });
    }

    wishlistItem = await Wishlist.create({
      userId,
      productId
    });

    await wishlistItem.populate('productId');

    res.status(201).json({
      success: true,
      message: 'Item added to wishlist',
      data: wishlistItem
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist',
        error: 'DUPLICATE_ENTRY'
      });
    }
    next(error);
  }
};

// Remove from Wishlist
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const itemId = req.params.itemId;

    const wishlistItem = await Wishlist.findOne({ _id: itemId, userId });

    if (!wishlistItem) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist item not found',
        error: 'NOT_FOUND'
      });
    }

    await wishlistItem.deleteOne();

    res.json({
      success: true,
      message: 'Item removed from wishlist'
    });
  } catch (error) {
    next(error);
  }
};

