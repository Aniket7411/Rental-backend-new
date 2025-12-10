const Payment = require('../models/Payment');
const Order = require('../models/Order');

// Initiate Payment
exports.initiatePayment = async (req, res, next) => {
  try {
    const { orderId, amount, paymentMethod, paymentGateway = 'razorpay' } = req.body;
    const userId = req.user._id || req.user.id;

    if (!orderId || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Order ID, amount, and payment method are required',
        error: 'VALIDATION_ERROR'
      });
    }

    // Verify order
    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        error: 'NOT_FOUND'
      });
    }

    // Calculate amounts
    let paymentAmount = amount;
    if (paymentMethod === 'advance') {
      // Calculate advance amount (e.g., 10% or fixed amount)
      paymentAmount = Math.min(amount, order.totalAmount * 0.1); // 10% or specified amount
    }

    // Create payment record
    const payment = await Payment.create({
      orderId: order._id,
      userId,
      amount: paymentAmount,
      paymentMethod,
      paymentGateway,
      status: 'Pending'
    });

    // Generate payment link (integrate with payment gateway)
    // For Razorpay example:
    // const razorpay = require('razorpay');
    // const razorpayInstance = new razorpay({
    //   key_id: process.env.RAZORPAY_KEY_ID,
    //   key_secret: process.env.RAZORPAY_KEY_SECRET
    // });
    // const razorpayOrder = await razorpayInstance.orders.create({
    //   amount: paymentAmount * 100, // in paise
    //   currency: 'INR',
    //   receipt: payment.paymentId
    // });
    // payment.gatewayOrderId = razorpayOrder.id;
    // await payment.save();

    // For now, return mock payment link
    const paymentLink = `${process.env.FRONTEND_URL || 'https://rental-ac-frontend.vercel.app'}/payment/${payment.paymentId}`;

    res.json({
      success: true,
      data: {
        paymentId: payment.paymentId,
        orderId: order.orderId,
        amount: payment.amount,
        currency: payment.currency,
        gatewayOrderId: payment.gatewayOrderId || 'mock_gateway_order_id',
        paymentLink
      }
    });
  } catch (error) {
    next(error);
  }
};

// Verify Payment
exports.verifyPayment = async (req, res, next) => {
  try {
    const { paymentId, transactionId, signature } = req.body;
    const userId = req.user._id || req.user.id;

    if (!paymentId || !transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID and transaction ID are required',
        error: 'VALIDATION_ERROR'
      });
    }

    const payment = await Payment.findOne({ paymentId, userId });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
        error: 'NOT_FOUND'
      });
    }

    // Verify payment with gateway
    // For Razorpay:
    // const crypto = require('crypto');
    // const generatedSignature = crypto
    //   .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    //   .update(`${payment.gatewayOrderId}|${transactionId}`)
    //   .digest('hex');
    // 
    // if (generatedSignature !== signature) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Invalid payment signature',
    //     error: 'VALIDATION_ERROR'
    //   });
    // }

    // Update payment status
    payment.status = 'Completed';
    payment.transactionId = transactionId;
    payment.signature = signature;
    payment.paidAt = new Date();
    await payment.save();

    // Update order payment status
    const order = await Order.findById(payment.orderId);
    if (order) {
      order.paidAmount = (order.paidAmount || 0) + payment.amount;
      order.remainingAmount = order.totalAmount - order.paidAmount;
      order.paymentStatus = order.paidAmount >= order.totalAmount ? 'Completed' : 'Partial';
      order.paymentDetails = {
        paymentId: payment.paymentId,
        transactionId: payment.transactionId,
        gateway: payment.paymentGateway,
        paidAt: payment.paidAt
      };
      await order.save();
    }

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        paymentId: payment.paymentId,
        status: payment.status,
        orderId: order.orderId
      }
    });
  } catch (error) {
    next(error);
  }
};

// Process Payment (Pay Now)
exports.processPayment = async (req, res, next) => {
  try {
    const { orderId, amount, paymentMethod, paymentDetails } = req.body;
    const userId = req.user._id || req.user.id;

    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and amount are required',
        error: 'VALIDATION_ERROR'
      });
    }

    // Verify order
    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        error: 'NOT_FOUND'
      });
    }

    // Verify amount matches order final total
    if (Math.abs(amount - order.finalTotal) > 0.01) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (${amount}) does not match order total (${order.finalTotal})`,
        error: 'VALIDATION_ERROR'
      });
    }

    // Create payment record
    const payment = await Payment.create({
      orderId: order._id,
      userId,
      amount,
      paymentMethod: paymentMethod || 'razorpay',
      paymentGateway: paymentMethod || 'razorpay',
      gatewayOrderId: paymentDetails?.razorpay_order_id || paymentDetails?.order_id,
      transactionId: paymentDetails?.razorpay_payment_id || paymentDetails?.payment_id,
      signature: paymentDetails?.razorpay_signature || paymentDetails?.signature,
      status: 'Completed',
      paidAt: new Date()
    });

    // Update order payment status
    order.paymentStatus = 'paid';
    order.paymentDetails = {
      paymentId: payment.paymentId,
      transactionId: payment.transactionId,
      gateway: payment.paymentGateway,
      paidAt: payment.paidAt
    };
    await order.save();

    res.status(201).json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        paymentId: payment.paymentId,
        orderId: order.orderId,
        amount: payment.amount,
        status: payment.status,
        transactionId: payment.transactionId,
        createdAt: payment.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get Payment Status
exports.getPaymentStatus = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const paymentId = req.params.paymentId;

    const payment = await Payment.findOne({ paymentId, userId })
      .populate('orderId', 'orderId status');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
        error: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        _id: payment._id,
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        amount: payment.amount,
        status: payment.status,
        paymentMethod: payment.paymentGateway,
        transactionId: payment.transactionId,
        createdAt: payment.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Calculate Payment Options
exports.calculatePayment = async (req, res, next) => {
  try {
    const { orderId, paymentMethod } = req.body;
    const userId = req.user._id || req.user.id;

    if (!orderId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and payment method are required',
        error: 'VALIDATION_ERROR'
      });
    }

    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        error: 'NOT_FOUND'
      });
    }

    // Calculate discount
    let discountAmount = 0;
    let finalAmount = order.total;

    // Apply discount if payNow (5%)
    if (paymentMethod === 'payNow') {
      discountAmount = order.total * 0.05;
      finalAmount = order.total - discountAmount;
    }

    res.json({
      success: true,
      data: {
        totalAmount: order.total,
        discount: discountAmount,
        discountAmount,
        finalAmount,
        advanceAmount: finalAmount,
        remainingAmount: 0
      }
    });
  } catch (error) {
    next(error);
  }
};

