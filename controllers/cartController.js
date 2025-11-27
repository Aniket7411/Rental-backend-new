const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Get User Cart
exports.getCart = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const cartItems = await Cart.find({ userId })
      .populate('productId');

    res.json({
      success: true,
      data: cartItems
    });
  } catch (error) {
    next(error);
  }
};

// Add to Cart
exports.addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1, selectedTenure } = req.body;
    const userId = req.user._id || req.user.id;

    if (!productId || !selectedTenure) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and tenure are required',
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

    // Check if already in cart
    let cartItem = await Cart.findOne({ userId, productId });

    if (cartItem) {
      // Update quantity and tenure
      cartItem.quantity = quantity;
      cartItem.selectedTenure = selectedTenure;
      await cartItem.save();
    } else {
      // Create new cart item
      cartItem = await Cart.create({
        userId,
        productId,
        quantity,
        selectedTenure
      });
    }

    await cartItem.populate('productId');

    res.status(201).json({
      success: true,
      message: 'Item added to cart',
      data: cartItem
    });
  } catch (error) {
    next(error);
  }
};

// Update Cart Item
exports.updateCartItem = async (req, res, next) => {
  try {
    const { quantity, selectedTenure } = req.body;
    const userId = req.user._id || req.user.id;
    const itemId = req.params.itemId;

    const cartItem = await Cart.findOne({ _id: itemId, userId });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found',
        error: 'NOT_FOUND'
      });
    }

    if (quantity !== undefined) cartItem.quantity = quantity;
    if (selectedTenure) cartItem.selectedTenure = selectedTenure;

    await cartItem.save();
    await cartItem.populate('productId');

    res.json({
      success: true,
      message: 'Cart item updated successfully',
      data: cartItem
    });
  } catch (error) {
    next(error);
  }
};

// Remove from Cart
exports.removeFromCart = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const itemId = req.params.itemId;

    const cartItem = await Cart.findOne({ _id: itemId, userId });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found',
        error: 'NOT_FOUND'
      });
    }

    await cartItem.deleteOne();

    res.json({
      success: true,
      message: 'Item removed from cart'
    });
  } catch (error) {
    next(error);
  }
};

// Clear Cart
exports.clearCart = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;

    await Cart.deleteMany({ userId });

    res.json({
      success: true,
      message: 'Cart cleared successfully'
    });
  } catch (error) {
    next(error);
  }
};

