const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');

// Get User Orders
exports.getUserOrders = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(query)
      .populate('items.productId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      total
    });
  } catch (error) {
    next(error);
  }
};

// Get Order by ID
exports.getOrderById = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const order = await Order.findOne({
      _id: req.params.orderId,
      userId
    }).populate('items.productId');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        error: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// Create Order
exports.createOrder = async (req, res, next) => {
  try {
    const { items, paymentMethod, shippingAddress, paymentDetails } = req.body;
    const userId = req.user._id || req.user.id;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order items are required',
        error: 'VALIDATION_ERROR'
      });
    }

    if (!paymentMethod || !shippingAddress) {
      return res.status(400).json({
        success: false,
        message: 'Payment method and shipping address are required',
        error: 'VALIDATION_ERROR'
      });
    }

    // Process items and calculate total
    let totalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.productId} not found`,
          error: 'NOT_FOUND'
        });
      }

      if (product.status !== 'Available') {
        return res.status(400).json({
          success: false,
          message: `Product ${product.name} is not available`,
          error: 'VALIDATION_ERROR'
        });
      }

      // Get price based on tenure
      const priceField = item.tenure === 'monthly' ? 'monthly' : item.tenure;
      const basePrice = product.price[priceField];
      if (!basePrice) {
        return res.status(400).json({
          success: false,
          message: `Price not available for tenure ${item.tenure}`,
          error: 'VALIDATION_ERROR'
        });
      }

      // Calculate price with discount
      const discountAmount = (basePrice * product.discount) / 100;
      const finalPrice = (basePrice - discountAmount) * item.quantity;

      // Calculate rental end date
      const startDate = new Date(item.rentalStartDate);
      let endDate = new Date(startDate);
      
      if (item.tenure === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + parseInt(item.tenure));
      }

      // Create product snapshot
      const productSnapshot = {
        id: product._id,
        category: product.category,
        name: product.name,
        brand: product.brand,
        model: product.model,
        type: product.type,
        capacity: product.capacity,
        images: product.images,
        price: product.price,
        discount: product.discount
      };

      processedItems.push({
        productId: product._id,
        productSnapshot,
        quantity: item.quantity,
        price: finalPrice,
        tenure: item.tenure,
        rentalStartDate: startDate,
        rentalEndDate: endDate
      });

      totalAmount += finalPrice;
    }

    // Calculate payment amounts
    let paidAmount = 0;
    let remainingAmount = totalAmount;
    let paymentStatus = 'Pending';

    if (paymentDetails && paymentDetails.amount) {
      paidAmount = paymentDetails.amount;
      remainingAmount = totalAmount - paidAmount;
      paymentStatus = paidAmount >= totalAmount ? 'Completed' : 'Partial';
    }

    // Create order
    const order = await Order.create({
      userId,
      items: processedItems,
      totalAmount,
      paymentMethod,
      paymentStatus,
      paidAmount,
      remainingAmount,
      shippingAddress,
      paymentDetails: paymentDetails || {}
    });

    // Update product status to Rented Out
    for (const item of items) {
      await Product.findByIdAndUpdate(item.productId, { status: 'Rented Out' });
    }

    // Clear cart if order is created from cart
    // You can add a flag in request to indicate if cart should be cleared
    // await Cart.deleteMany({ userId });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        id: order._id,
        orderId: order.orderId,
        totalAmount: order.totalAmount,
        status: order.status
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update Order Status (Admin)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        error: 'NOT_FOUND'
      });
    }

    if (status) {
      order.status = status;
    }

    await order.save();

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

