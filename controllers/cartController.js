const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Service = require('../models/Service');

// Get User Cart (returns rentals and services separately)
exports.getCart = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;

    const cartItems = await Cart.find({ userId })
      .populate('productId')
      .populate('serviceId')
      .sort({ createdAt: -1 });

    // Separate rentals and services
    const rentals = cartItems
      .filter(item => item.type === 'rental')
      .map(item => ({
        id: item._id,
        productId: item.productId?._id || item.productId,
        quantity: item.quantity,
        price: item.productId?.price || {},
        product: item.productId,
        paymentOption: item.paymentOption,
        createdAt: item.createdAt
      }));

    const services = cartItems
      .filter(item => item.type === 'service')
      .map(item => ({
        id: item._id,
        serviceId: item.serviceId?._id || item.serviceId,
        serviceTitle: item.serviceTitle,
        servicePrice: item.servicePrice,
        bookingDetails: item.bookingDetails,
        createdAt: item.createdAt
      }));

    res.json({
      success: true,
      data: {
        rentals,
        services
      }
    });
  } catch (error) {
    next(error);
  }
};

// Add Rental to Cart
exports.addRentalToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1, paymentOption = 'payLater' } = req.body;
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

    // Check if already in cart
    let cartItem = await Cart.findOne({ userId, productId, type: 'rental' });

    if (cartItem) {
      // Update quantity and payment option
      cartItem.quantity = quantity;
      cartItem.paymentOption = paymentOption;
      await cartItem.save();
    } else {
      // Create new cart item
      cartItem = await Cart.create({
        userId,
        type: 'rental',
        productId,
        quantity,
        paymentOption
      });
    }

    await cartItem.populate('productId');

    res.status(201).json({
      success: true,
      message: 'Item added to cart',
      data: {
        id: cartItem._id,
        productId: cartItem.productId._id,
        quantity: cartItem.quantity,
        paymentOption: cartItem.paymentOption,
        createdAt: cartItem.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Add Service to Cart
exports.addServiceToCart = async (req, res, next) => {
  try {
    const { serviceId, bookingDetails } = req.body;
    const userId = req.user._id || req.user.id;

    if (!serviceId || !bookingDetails) {
      return res.status(400).json({
        success: false,
        message: 'Service ID and booking details are required',
        error: 'VALIDATION_ERROR'
      });
    }

    // Validate booking details
    const { date, time, address, addressType, contactName, contactPhone, paymentOption = 'payLater' } = bookingDetails;

    if (!date || !time || !address) {
      return res.status(400).json({
        success: false,
        message: 'Date, time, and address are required in booking details',
        error: 'VALIDATION_ERROR'
      });
    }

    // Validate time slot
    const validTimeSlots = ['10-12', '12-2', '2-4', '4-6', '6-8'];
    if (!validTimeSlots.includes(time)) {
      return res.status(400).json({
        success: false,
        message: `Invalid time slot. Valid slots are: ${validTimeSlots.join(', ')}`,
        error: 'VALIDATION_ERROR'
      });
    }

    // Validate date is in the future
    const bookingDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (bookingDate <= today) {
      return res.status(400).json({
        success: false,
        message: 'Booking date must be in the future',
        error: 'VALIDATION_ERROR'
      });
    }

    // Validate contact info if addressType is other
    if (addressType === 'other') {
      if (!contactName || !contactName.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Contact name is required when address type is "other"',
          error: 'VALIDATION_ERROR'
        });
      }
      if (!contactPhone || !contactPhone.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Contact phone is required when address type is "other"',
          error: 'VALIDATION_ERROR'
        });
      }
    }

    // Check if service exists
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        error: 'NOT_FOUND'
      });
    }

    // Check if already in cart
    let cartItem = await Cart.findOne({ userId, serviceId, type: 'service' });

    if (cartItem) {
      // Update booking details
      cartItem.serviceTitle = service.title;
      cartItem.servicePrice = service.price;
        cartItem.bookingDetails = {
          date,
          time,
          address,
          addressType,
          contactName: addressType === 'other' ? contactName : '',
          contactPhone: addressType === 'other' ? contactPhone : '',
          paymentOption
        };
      await cartItem.save();
    } else {
      // Create new cart item
      cartItem = await Cart.create({
        userId,
        type: 'service',
        serviceId,
        serviceTitle: service.title,
        servicePrice: service.price,
        bookingDetails: {
          date,
          time,
          address,
          addressType,
          contactName: addressType === 'other' ? contactName : '',
          contactPhone: addressType === 'other' ? contactPhone : '',
          paymentOption
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Service added to cart',
      data: {
        id: cartItem._id,
        serviceId: cartItem.serviceId,
        bookingDetails: cartItem.bookingDetails,
        createdAt: cartItem.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update Cart Item
exports.updateCartItem = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const itemId = req.params.itemId;
    const updateData = req.body;

    const cartItem = await Cart.findOne({ _id: itemId, userId });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found',
        error: 'NOT_FOUND'
      });
    }

    // Update based on type
    if (cartItem.type === 'rental') {
      if (updateData.quantity !== undefined) {
        if (updateData.quantity < 1) {
          return res.status(400).json({
            success: false,
            message: 'Quantity must be at least 1',
            error: 'VALIDATION_ERROR'
          });
        }
        cartItem.quantity = updateData.quantity;
      }
      if (updateData.paymentOption) {
        cartItem.paymentOption = updateData.paymentOption;
      }
    } else if (cartItem.type === 'service') {
      if (updateData.bookingDetails) {
        const { date, time, address, addressType, contactName, contactPhone, paymentOption } = updateData.bookingDetails;

        // Validate time slot if provided
        if (time) {
          const validTimeSlots = ['10-12', '12-2', '2-4', '4-6', '6-8'];
          if (!validTimeSlots.includes(time)) {
            return res.status(400).json({
              success: false,
              message: `Invalid time slot. Valid slots are: ${validTimeSlots.join(', ')}`,
              error: 'VALIDATION_ERROR'
            });
          }
        }

        // Validate date if provided
        if (date) {
          const bookingDate = new Date(date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (bookingDate <= today) {
            return res.status(400).json({
              success: false,
              message: 'Booking date must be in the future',
              error: 'VALIDATION_ERROR'
            });
          }
        }

        cartItem.bookingDetails = {
          ...cartItem.bookingDetails,
          ...updateData.bookingDetails
        };
      }
    }

    await cartItem.save();
    await cartItem.populate(cartItem.type === 'rental' ? 'productId' : 'serviceId');

    res.json({
      success: true,
      message: 'Cart item updated',
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
      message: 'Cart cleared'
    });
  } catch (error) {
    next(error);
  }
};
