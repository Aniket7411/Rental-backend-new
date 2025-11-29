const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');

// Get User Wishlist
exports.getWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const wishlistItems = await Wishlist.find({ userId })
      .populate('productId', 'brand model name capacity type category location price images status')
      .sort({ createdAt: -1 });

    // Transform to match frontend expectations and filter out deleted products
    const formattedWishlist = wishlistItems
      .filter(item => item.productId !== null) // Filter out items where product was deleted
      .map(item => ({
        _id: item._id,
        userId: item.userId,
        productId: item.productId._id,
        product: item.productId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }));

    res.json({
      success: true,
      message: 'Wishlist retrieved successfully',
      data: formattedWishlist
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wishlist'
    });
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
        message: 'Product ID is required'
      });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if already in wishlist
    const existing = await Wishlist.findOne({
      userId: userId,
      productId: productId
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }

    // Add to wishlist
    const wishlistItem = new Wishlist({
      userId: userId,
      productId: productId
    });

    await wishlistItem.save();

    // Populate product for response
    await wishlistItem.populate('productId', 'brand model name capacity type category location price images status');

    res.status(201).json({
      success: true,
      message: 'Product added to wishlist',
      data: {
        _id: wishlistItem._id,
        userId: wishlistItem.userId,
        productId: wishlistItem.productId._id,
        product: wishlistItem.productId,
        createdAt: wishlistItem.createdAt,
        updatedAt: wishlistItem.updatedAt
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to add to wishlist'
    });
  }
};

// Remove from Wishlist
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { productId } = req.params;

    const deleted = await Wishlist.findOneAndDelete({
      userId: userId,
      productId: productId
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in wishlist'
      });
    }

    res.json({
      success: true,
      message: 'Product removed from wishlist'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove from wishlist'
    });
  }
};

// Check if Product is in Wishlist
exports.checkWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { productId } = req.params;

    const exists = await Wishlist.findOne({
      userId: userId,
      productId: productId
    });

    res.json({
      success: true,
      isInWishlist: !!exists
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check wishlist status'
    });
  }
};

