const Order = require('../models/Order');
const Product = require('../models/Product');
const Service = require('../models/Service');
const ServiceBooking = require('../models/ServiceBooking');
const Cart = require('../models/Cart');
const { notifyAdmin } = require('../utils/notifications');

// Get User Orders
exports.getUserOrders = async (req, res, next) => {
  try {
    // Support both /api/users/orders and /api/users/:userId/orders
    let userId;
    if (req.params.userId) {
      // Verify authorization - users can only access their own orders (unless admin)
      const authenticatedUserId = req.user._id || req.user.id;
      if (req.params.userId !== authenticatedUserId.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access these orders',
          error: 'FORBIDDEN'
        });
      }
      userId = req.params.userId;
    } else {
      userId = req.user._id || req.user.id;
    }

    const { status, type, page = 1, limit = 10 } = req.query;

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let orders = await Order.find(query)
      .populate('items.productId')
      .populate('items.serviceId')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Filter by type if specified
    if (type && type !== 'all') {
      orders = orders.map(order => {
        const filteredItems = order.items.filter(item => item.type === type);
        return { ...order.toObject(), items: filteredItems };
      }).filter(order => order.items.length > 0);
    }

    const total = await Order.countDocuments(query);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: totalPages
      }
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
    })
      .populate('items.productId')
      .populate('items.serviceId')
      .populate('userId', 'name email phone');

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

// Create Order (supports both rentals and services)
exports.createOrder = async (req, res, next) => {
  try {
    const {
      items,
      paymentOption,
      paymentStatus,
      total,
      discount,
      finalTotal,
      shippingAddress,
      billingAddress
    } = req.body;
    const userId = req.user._id || req.user.id;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order items are required',
        error: 'VALIDATION_ERROR'
      });
    }

    if (!paymentOption || !['payNow', 'payLater'].includes(paymentOption)) {
      return res.status(400).json({
        success: false,
        message: 'Payment option must be "payNow" or "payLater"',
        error: 'VALIDATION_ERROR'
      });
    }

    // Process items and calculate total
    let calculatedTotal = 0;
    const processedItems = [];
    const serviceBookingsToCreate = [];

    for (const item of items) {
      if (!item.type || !['rental', 'service'].includes(item.type)) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have a type of "rental" or "service"',
          error: 'VALIDATION_ERROR'
        });
      }

      if (item.type === 'rental') {
        // Process rental item
        if (!item.productId || !item.quantity || !item.price) {
          return res.status(400).json({
            success: false,
            message: 'Rental items require productId, quantity, and price',
            error: 'VALIDATION_ERROR'
          });
        }

        // Validate duration (default to 3 if not provided)
        const duration = item.duration || 3;
        if (![3, 6, 9, 11].includes(duration)) {
          return res.status(400).json({
            success: false,
            message: 'Duration must be 3, 6, 9, or 11 months',
            error: 'VALIDATION_ERROR'
          });
        }

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
            message: `Product ${product.brand} ${product.model} is not available`,
            error: 'VALIDATION_ERROR'
          });
        }

        // Create product snapshot
        const productSnapshot = {
          _id: product._id,
          category: product.category,
          brand: product.brand,
          model: product.model,
          type: product.type,
          capacity: product.capacity,
          location: product.location,
          images: product.images,
          price: product.price
        };

        processedItems.push({
          type: 'rental',
          productId: product._id,
          product: productSnapshot,
          quantity: item.quantity,
          price: item.price,
          duration: duration
        });

        calculatedTotal += item.price;
      } else if (item.type === 'service') {
        // Process service item
        if (!item.serviceId || !item.price || !item.bookingDetails) {
          return res.status(400).json({
            success: false,
            message: 'Service items require serviceId, price, and bookingDetails',
            error: 'VALIDATION_ERROR'
          });
        }

        const service = await Service.findById(item.serviceId);
        if (!service) {
          return res.status(404).json({
            success: false,
            message: `Service ${item.serviceId} not found`,
            error: 'NOT_FOUND'
          });
        }

        // Create service snapshot
        const serviceSnapshot = {
          _id: service._id,
          title: service.title,
          description: service.description,
          price: service.price,
          image: service.image
        };

        processedItems.push({
          type: 'service',
          serviceId: service._id,
          service: serviceSnapshot,
          quantity: item.quantity || 1, // Default to 1 if not provided
          bookingDetails: item.bookingDetails,
          price: item.price
        });

        calculatedTotal += item.price;

        // Store service booking details to create after order
        serviceBookingsToCreate.push({
          serviceId: service._id,
          serviceTitle: service.title,
          servicePrice: service.price,
          bookingDetails: item.bookingDetails
        });
      }
    }

    // Calculate discount (5% if payNow)
    const calculatedDiscount = paymentOption === 'payNow' ? calculatedTotal * 0.05 : 0;
    const calculatedFinalTotal = calculatedTotal - calculatedDiscount;

    // Use provided values or calculated values
    const orderTotal = total || calculatedTotal;
    const orderDiscount = discount !== undefined ? discount : calculatedDiscount;
    const orderFinalTotal = finalTotal || calculatedFinalTotal;

    // Validate totals match
    if (Math.abs(orderFinalTotal - (orderTotal - orderDiscount)) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Final total must equal total minus discount',
        error: 'VALIDATION_ERROR'
      });
    }

    // Set payment status based on payment option
    const finalPaymentStatus = paymentStatus || (paymentOption === 'payNow' ? 'paid' : 'pending');
    
    // Set order status based on payment status
    // If payNow and payment is successful, status should be "confirmed", otherwise "pending"
    const orderStatus = (paymentOption === 'payNow' && finalPaymentStatus === 'paid') ? 'confirmed' : 'pending';

    // Create order
    const order = await Order.create({
      userId,
      items: processedItems,
      total: orderTotal,
      discount: orderDiscount,
      finalTotal: orderFinalTotal,
      paymentOption,
      paymentStatus: finalPaymentStatus,
      status: orderStatus,
      shippingAddress: shippingAddress || '',
      billingAddress: billingAddress || ''
    });

    // Create service bookings for service items
    const user = req.user;
    for (const bookingData of serviceBookingsToCreate) {
      const { serviceId, serviceTitle, servicePrice, bookingDetails } = bookingData;
      
      // Set payment status for service booking
      const bookingPaymentOption = bookingDetails.paymentOption || paymentOption;
      const bookingPaymentStatus = bookingPaymentOption === 'payNow' ? 'paid' : 'pending';
      
      await ServiceBooking.create({
        serviceId,
        userId,
        serviceTitle,
        servicePrice,
        name: user.name,
        phone: user.phone,
        email: user.email,
        date: bookingDetails.date,
        time: bookingDetails.time,
        address: bookingDetails.address,
        addressType: bookingDetails.addressType,
        contactName: bookingDetails.contactName || '',
        contactPhone: bookingDetails.contactPhone || '',
        paymentOption: bookingPaymentOption,
        paymentStatus: bookingPaymentStatus,
        status: 'New',
        orderId: order._id
      });
    }

    // Update product status to Rented Out for rental items
    for (const item of items) {
      if (item.type === 'rental' && item.productId) {
        await Product.findByIdAndUpdate(item.productId, { status: 'Rented Out' });
      }
    }

    // Populate order for response
    await order.populate([
      { path: 'items.productId' },
      { path: 'items.serviceId' },
      { path: 'userId', select: 'name email phone' }
    ]);

    // Notify admin about new order
    const orderUser = order.userId || req.user;
    const subject = `New Order ${order.orderId} - ${orderStatus === 'confirmed' ? 'Confirmed' : 'Pending'}`;
    const messageText = `
      A new order has been placed:
      
      Order ID: ${order.orderId}
      User: ${orderUser.name || 'N/A'} (${orderUser.email || 'N/A'})
      Total: ₹${order.total}
      Discount: ₹${order.discount}
      Final Total: ₹${order.finalTotal}
      Payment Option: ${paymentOption === 'payNow' ? 'Pay Now' : 'Pay Later'}
      Payment Status: ${finalPaymentStatus === 'paid' ? 'Paid' : 'Pending'}
      Order Status: ${orderStatus}
      Items: ${processedItems.length} item(s)
      ${processedItems.filter(i => i.type === 'rental').length > 0 ? `Rentals: ${processedItems.filter(i => i.type === 'rental').length}` : ''}
      ${processedItems.filter(i => i.type === 'service').length > 0 ? `Services: ${processedItems.filter(i => i.type === 'service').length}` : ''}
      
      Please check the admin panel for details.
    `;

    await notifyAdmin(subject, messageText);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// Get All Orders (Admin)
exports.getAllOrders = async (req, res, next) => {
  try {
    const { status, paymentStatus, page = 1, limit = 10 } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(query)
      .populate('userId', 'name email phone')
      .populate('items.productId')
      .populate('items.serviceId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    next(error);
  }
};

// Update Order Status (Admin)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const orderId = req.params.orderId || req.params.id;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        error: 'VALIDATION_ERROR'
      });
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true, runValidators: true }
    )
      .populate('userId', 'name email phone')
      .populate('items.productId')
      .populate('items.serviceId');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        error: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// Cancel Order
exports.cancelOrder = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const orderId = req.params.orderId;

    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        error: 'NOT_FOUND'
      });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Order is already cancelled',
        error: 'VALIDATION_ERROR'
      });
    }

    if (order.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed order',
        error: 'VALIDATION_ERROR'
      });
    }

    // Update order status
    order.status = 'cancelled';
    await order.save();

    // Update product status back to Available for rental items
    for (const item of order.items) {
      if (item.type === 'rental' && item.productId) {
        await Product.findByIdAndUpdate(item.productId, { status: 'Available' });
      }
    }

    // Cancel related service bookings
    await ServiceBooking.updateMany(
      { orderId: order._id },
      { status: 'Cancelled' }
    );

    res.json({
      success: true,
      message: 'Order cancelled',
      data: order
    });
  } catch (error) {
    next(error);
  }
};
