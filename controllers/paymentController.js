const Payment = require('../models/Payment');
const Order = require('../models/Order');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { notifyAdmin } = require('../utils/notifications');
const { roundMoney, validateAndRoundMoney } = require('../utils/money');

// Initialize Razorpay instance
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Helper function to find order by either MongoDB _id or orderId string
const findOrderByIdentifier = async (orderIdentifier, userId) => {
  let order = null;
  
  // Check if orderIdentifier is a valid MongoDB ObjectId
  if (mongoose.Types.ObjectId.isValid(orderIdentifier)) {
    // Try finding by MongoDB _id
    order = await Order.findOne({ _id: orderIdentifier, userId });
  }
  
  // If not found, try finding by orderId string (e.g., "ORD-2025-062")
  if (!order) {
    order = await Order.findOne({ orderId: orderIdentifier, userId });
  }
  
  return order;
};

// Create Razorpay Order (for frontend integration)
exports.createRazorpayOrder = async (req, res, next) => {
  try {
    const { orderId, amount } = req.body;
    const userId = req.user._id || req.user.id;

    // Validate input
    if (!orderId || amount === undefined || amount === null) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and amount are required'
      });
    }

    // Validate and round amount to 2 decimal places
    const roundedAmount = validateAndRoundMoney(amount, 'payment amount');
    
    if (roundedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0',
        error: 'VALIDATION_ERROR'
      });
    }

    // Verify order exists and belongs to user
    // Support both MongoDB _id and orderId string (e.g., "ORD-2025-062")
    const order = await findOrderByIdentifier(orderId, userId);
    
    if (!order) {
      return res.status(400).json({
        success: false,
        message: 'Order not found or does not belong to user',
        error: 'ORDER_NOT_FOUND'
      });
    }

    // Check if order is already fully paid
    // For advance payment orders: Check if remainingAmount is 0 (fully paid) or > 0 (advance paid, remaining pending)
    const isFullyPaid = order.paymentStatus === 'paid' && 
                        (!order.remainingAmount || order.remainingAmount <= 0.01);
    
    if (isFullyPaid) {
      return res.status(400).json({
        success: false,
        message: 'Order payment already completed',
        error: 'ORDER_ALREADY_PAID'
      });
    }

    // ✅ FIX: Determine expected payment amount based on payment option
    let expectedPaymentAmount = order.finalTotal || 0;
    if (order.paymentOption === 'payAdvance' && order.advanceAmount) {
      expectedPaymentAmount = order.advanceAmount;
    }

    // ✅ FIX: Validate against expected amount (not always finalTotal)
    const expectedAmount = parseFloat(expectedPaymentAmount);

    // Round both to 2 decimal places for comparison
    const roundedProvided = Math.round(roundedAmount * 100) / 100;
    const roundedExpected = Math.round(expectedAmount * 100) / 100;

    // Allow tolerance of ±0.01 (1 paise) for floating point precision
    const difference = Math.abs(roundedProvided - roundedExpected);

    if (difference > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount mismatch',
        error: 'AMOUNT_MISMATCH',
        details: {
          providedAmount: roundedProvided,
          orderFinalTotal: order.finalTotal, // Include for reference
          expectedAmount: roundedExpected, // The amount that should be paid
          difference: difference,
          orderId: order.orderId,
          paymentOption: order.paymentOption // Include for debugging
        }
      });
    }

    // Use expected payment amount for Razorpay order creation
    const paymentAmount = roundedExpected;

    // Check if Razorpay credentials are configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Payment gateway not configured. Please contact support.',
        error: 'CONFIGURATION_ERROR'
      });
    }

    // Razorpay minimum amount validation: ₹1.00 (100 paise)
    const MINIMUM_AMOUNT = 1.00; // ₹1.00
    const MINIMUM_AMOUNT_PAISE = 100; // 100 paise
    
    if (paymentAmount < MINIMUM_AMOUNT) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (₹${paymentAmount}) is less than minimum allowed amount (₹${MINIMUM_AMOUNT}). Order cannot be processed.`,
        error: 'AMOUNT_TOO_LOW',
        details: {
          providedAmount: paymentAmount,
          minimumAmount: MINIMUM_AMOUNT,
          orderId: order.orderId,
          paymentOption: order.paymentOption
        }
      });
    }

    // Create payment record first (use paymentAmount which is rounded and validated)
    const payment = await Payment.create({
      orderId: order._id,
      userId,
      amount: paymentAmount, // Use paymentAmount (₹999 for advance, full amount for others)
      paymentMethod: order.paymentOption === 'payAdvance' ? 'advance' : 'razorpay',
      paymentGateway: 'razorpay',
      status: 'Pending'
    });

    try {
      // Create Razorpay order - convert rounded rupees to paise (multiply by 100)
      // Use paymentAmount (₹999 for advance payment, or full amount for others)
      const amountInPaise = Math.round(paymentAmount * 100);
      
      // Ensure it's an integer (no decimals in paise)
      if (!Number.isInteger(amountInPaise)) {
        throw new Error('Invalid amount for payment gateway - must be an integer in paise');
      }

      // Double-check minimum amount in paise
      if (amountInPaise < MINIMUM_AMOUNT_PAISE) {
        throw new Error(`Amount (${amountInPaise} paise) is less than minimum required (${MINIMUM_AMOUNT_PAISE} paise)`);
      }

      const razorpayOrder = await razorpayInstance.orders.create({
        amount: amountInPaise, // Amount in paise (integer)
        currency: 'INR',
        receipt: payment.paymentId,
        notes: {
          orderId: order.orderId,
          paymentId: payment.paymentId,
          userId: userId.toString()
        }
      });

      // Update payment with Razorpay order ID
      payment.gatewayOrderId = razorpayOrder.id;
      await payment.save();

      res.json({
        success: true,
        message: 'Razorpay order created successfully',
        data: {
          paymentId: payment.paymentId,
          orderId: order.orderId,
          amount: paymentAmount, // Return payment amount (₹999 for advance, full amount for others)
          currency: 'INR',
          razorpayOrderId: razorpayOrder.id,
          key: process.env.RAZORPAY_KEY_ID, // Frontend needs this to initialize Razorpay
          paymentLink: process.env.RAZORPAY_PAYMENT_LINK || null // Optional: Payment link as fallback
        }
      });
    } catch (razorpayError) {
      // If Razorpay order creation fails, mark payment as failed
      payment.status = 'Failed';
      await payment.save();

      console.error('Razorpay order creation error:', razorpayError);
      
      // Check if it's a minimum amount error
      const errorDescription = razorpayError.error?.description || '';
      const isMinimumAmountError = errorDescription.toLowerCase().includes('minimum') || 
                                   errorDescription.toLowerCase().includes('less than');
      
      if (isMinimumAmountError) {
        return res.status(400).json({
          success: false,
          message: `Payment amount (₹${paymentAmount}) is less than Razorpay's minimum allowed amount (₹1.00). Please contact support or use a different payment method.`,
          error: 'AMOUNT_TOO_LOW',
          details: {
            providedAmount: paymentAmount,
            minimumAmount: 1.00,
            orderId: order.orderId,
            paymentOption: order.paymentOption,
            razorpayError: razorpayError.error
          }
        });
      }
      
      return res.status(500).json({
        success: false,
        message: razorpayError.error?.description || 'Failed to create payment order. Please try again.',
        error: 'PAYMENT_GATEWAY_ERROR',
        details: razorpayError.error
      });
    }
  } catch (error) {
    next(error);
  }
};

// Initiate Payment (Legacy endpoint - kept for backward compatibility)
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

    // Verify order - support both MongoDB _id and orderId string
    const order = await findOrderByIdentifier(orderId, userId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        error: 'NOT_FOUND'
      });
    }

    // Validate and round amount to 2 decimal places
    const roundedAmount = validateAndRoundMoney(amount, 'payment amount');
    
    // Calculate amounts
    let paymentAmount = roundedAmount;
    if (paymentMethod === 'advance') {
      // Get settings for advance payment amount
      const Settings = require('../models/Settings');
      const settings = await Settings.getSettings();
      const expectedAdvanceAmount = settings.advancePaymentAmount || 500;
      
      // For advance payment, use advancePaymentAmount from settings
      // The discount is applied to the total order amount, not the advance
      paymentAmount = roundMoney(Math.min(roundedAmount, expectedAdvanceAmount));
    }

    // Create payment record (use rounded amount)
    const payment = await Payment.create({
      orderId: order._id,
      userId,
      amount: paymentAmount,
      paymentMethod,
      paymentGateway,
      status: 'Pending'
    });

    // Create Razorpay order
    try {
      // Convert rounded rupees to paise (multiply by 100)
      const amountInPaise = Math.round(paymentAmount * 100);
      
      // Ensure it's an integer (no decimals in paise)
      if (!Number.isInteger(amountInPaise)) {
        throw new Error('Invalid amount for payment gateway - must be an integer in paise');
      }

      const razorpayOrder = await razorpayInstance.orders.create({
        amount: amountInPaise, // Amount in paise (integer)
        currency: 'INR',
        receipt: payment.paymentId,
        notes: {
          orderId: order.orderId,
          paymentId: payment.paymentId,
          userId: userId.toString()
        }
      });

      payment.gatewayOrderId = razorpayOrder.id;
      await payment.save();

      res.json({
        success: true,
        data: {
          paymentId: payment.paymentId,
          orderId: order.orderId,
          amount: payment.amount,
          currency: payment.currency || 'INR',
          gatewayOrderId: razorpayOrder.id,
          key: process.env.RAZORPAY_KEY_ID
        }
      });
    } catch (razorpayError) {
      payment.status = 'Failed';
      await payment.save();

      console.error('Razorpay order creation error:', razorpayError);
      
      return res.status(500).json({
        success: false,
        message: razorpayError.error?.description || 'Failed to create payment order',
        error: 'PAYMENT_GATEWAY_ERROR'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Verify Payment (Razorpay signature verification)
exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentId } = req.body;
    const userId = req.user._id || req.user.id;

    // Support both formats
    const orderId = razorpay_order_id || req.body.order_id;
    const transactionId = razorpay_payment_id || req.body.payment_id;
    const signature = razorpay_signature || req.body.signature;

    if (!orderId || !transactionId || !signature) {
      return res.status(400).json({
        success: false,
        message: 'Razorpay order ID, payment ID, and signature are required',
        error: 'VALIDATION_ERROR'
      });
    }

    // Find payment by paymentId or gatewayOrderId
    let payment;
    if (paymentId) {
      payment = await Payment.findOne({ paymentId, userId });
    } else {
      payment = await Payment.findOne({ gatewayOrderId: orderId, userId });
    }

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
        error: 'NOT_FOUND'
      });
    }

    // Check if payment is already completed
    if (payment.status === 'Completed') {
      return res.json({
        success: true,
        message: 'Payment already verified',
        data: {
          paymentId: payment.paymentId,
          status: payment.status,
          orderId: payment.orderId
        }
      });
    }

    // Verify Razorpay signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${transactionId}`)
      .digest('hex');

    if (generatedSignature !== signature) {
      // Mark payment as failed
      payment.status = 'Failed';
      await payment.save();

      // Notify admin about failed payment
      const order = await Order.findById(payment.orderId);
      await notifyAdmin(
        `Payment Verification Failed - Order ${order?.orderId || 'N/A'}`,
        `Payment verification failed due to invalid signature.\n\nPayment ID: ${payment.paymentId}\nOrder ID: ${order?.orderId || 'N/A'}\nTransaction ID: ${transactionId}\nUser ID: ${userId}`
      );

      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature. Payment verification failed.',
        error: 'SIGNATURE_MISMATCH'
      });
    }

    // Verify payment with Razorpay API (optional but recommended)
    try {
      const razorpayPayment = await razorpayInstance.payments.fetch(transactionId);
      
      if (razorpayPayment.status !== 'captured' && razorpayPayment.status !== 'authorized') {
        payment.status = 'Failed';
        await payment.save();

        return res.status(400).json({
          success: false,
          message: `Payment not captured. Status: ${razorpayPayment.status}`,
          error: 'PAYMENT_NOT_CAPTURED'
        });
      }

      // Update payment status
      payment.status = 'Completed';
      payment.transactionId = transactionId;
      payment.signature = signature;
      payment.paidAt = new Date();
      await payment.save();

      // Update order payment status and order status
      // Per requirements: After successful payment verification, order status should be "confirmed" and payment status to "paid"
      const order = await Order.findById(payment.orderId);
      if (order) {
        // For advance payment orders: If remainingAmount > 0, payment is partial (advance paid, remaining pending)
        // For other orders: Payment is complete
        // Update payment status to "paid" (even for advance payments - remaining amount is tracked separately)
        order.paymentStatus = 'paid';
        if (order.status === 'pending') {
          order.status = 'confirmed';
        }
        order.paymentDetails = {
          paymentId: payment.paymentId,
          transactionId: payment.transactionId,
          gateway: payment.paymentGateway,
          paidAt: payment.paidAt
        };
        await order.save();

        // Update product status to Rented Out for rental items
        const Product = require('../models/Product');
        for (const item of order.items) {
          if (item.type === 'rental' && item.productId) {
            await Product.findByIdAndUpdate(item.productId, { status: 'Rented Out' });
          }
        }
      }

      // Notify admin about successful payment
      await notifyAdmin(
        `Payment Successful - Order ${order?.orderId || 'N/A'}`,
        `Payment of ₹${payment.amount} has been successfully processed.\n\nPayment ID: ${payment.paymentId}\nOrder ID: ${order?.orderId || 'N/A'}\nTransaction ID: ${transactionId}\nUser ID: ${userId}`
      );

      // Return updated order data in response per requirements
      const updatedOrder = await Order.findById(payment.orderId);

      res.json({
        success: true,
        message: 'Payment verified successfully',
        data: {
          order: updatedOrder,
          payment: payment,
          orderId: updatedOrder?.orderId,
          paymentId: payment.paymentId,
          paymentStatus: updatedOrder?.paymentStatus || 'paid',
          verifiedAt: payment.paidAt
        }
      });
    } catch (razorpayError) {
      console.error('Razorpay payment fetch error:', razorpayError);
      
      // Even if API verification fails, if signature is valid, we can still mark as completed
      // But log the error for investigation
      payment.status = 'Completed';
      payment.transactionId = transactionId;
      payment.signature = signature;
      payment.paidAt = new Date();
      await payment.save();

      // Update order
      const order = await Order.findById(payment.orderId);
      if (order) {
        order.paymentStatus = 'paid';
        order.status = 'confirmed';
        order.paymentDetails = {
          paymentId: payment.paymentId,
          transactionId: payment.transactionId,
          gateway: payment.paymentGateway,
          paidAt: payment.paidAt
        };
        await order.save();
      }

      // Return updated order data in response for consistency
      const updatedOrder = await Order.findById(payment.orderId);

      res.json({
        success: true,
        message: 'Payment verified successfully (signature verified, API verification skipped)',
        data: {
          order: updatedOrder,  // ✅ Include full order object for consistency
          payment: payment,
          orderId: updatedOrder?.orderId,
          paymentId: payment.paymentId,
          paymentStatus: updatedOrder?.paymentStatus || 'paid',
          verifiedAt: payment.paidAt
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

// Process Payment (Pay Now) - Verifies and processes payment
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

    // Verify order - support both MongoDB _id and orderId string
    const order = await findOrderByIdentifier(orderId, userId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        error: 'NOT_FOUND'
      });
    }

    // Check if order is already paid
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Order is already paid',
        error: 'VALIDATION_ERROR'
      });
    }

    // Validate and round amount to 2 decimal places
    const roundedAmount = validateAndRoundMoney(amount, 'payment amount');
    
    // Handle advance payment orders
    if (order.paymentOption === 'payAdvance') {
      // Check if this is a payment for remaining amount after advance payment
      // For advance payment orders, if paymentStatus is 'paid' and remainingAmount > 0, this is remaining payment
      if (order.paymentStatus === 'paid' && order.remainingAmount > 0 && order.remainingAmount > 0.01) {
        // This is a payment for the remaining amount after advance payment
        const roundedRemaining = roundMoney(order.remainingAmount);
        if (Math.abs(roundedAmount - roundedRemaining) > 0.01) {
          return res.status(400).json({
            success: false,
            message: `Payment amount (₹${roundedAmount}) does not match remaining amount (₹${roundedRemaining})`,
            error: 'VALIDATION_ERROR'
          });
        }
      } else {
        // Get settings for advance payment amount
        const Settings = require('../models/Settings');
        const settings = await Settings.getSettings();
        const expectedAdvanceAmount = settings.advancePaymentAmount || 500;
        
        // First payment for advance payment order should match advancePaymentAmount from settings
        if (Math.abs(roundedAmount - expectedAdvanceAmount) > 0.01) {
          return res.status(400).json({
            success: false,
            message: `For advance payment orders, amount must be ₹${expectedAdvanceAmount} (current advance payment amount setting)`,
            error: 'VALIDATION_ERROR'
          });
        }
      }
    } else {
      // For other payment options, verify amount matches order final total
      const roundedOrderTotal = roundMoney(order.finalTotal);
      if (Math.abs(roundedAmount - roundedOrderTotal) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `Payment amount (₹${roundedAmount}) does not match order total (₹${roundedOrderTotal})`,
          error: 'VALIDATION_ERROR'
        });
      }
    }

    // Extract Razorpay payment details
    const razorpayOrderId = paymentDetails?.razorpay_order_id || paymentDetails?.order_id;
    const razorpayPaymentId = paymentDetails?.razorpay_payment_id || paymentDetails?.payment_id;
    const razorpaySignature = paymentDetails?.razorpay_signature || paymentDetails?.signature;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Razorpay payment details are required',
        error: 'VALIDATION_ERROR'
      });
    }

    // Verify Razorpay signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature. Payment verification failed.',
        error: 'SIGNATURE_MISMATCH'
      });
    }

    // Verify payment with Razorpay API
    try {
      const razorpayPayment = await razorpayInstance.payments.fetch(razorpayPaymentId);
      
      if (razorpayPayment.status !== 'captured' && razorpayPayment.status !== 'authorized') {
        return res.status(400).json({
          success: false,
          message: `Payment not captured. Status: ${razorpayPayment.status}`,
          error: 'PAYMENT_NOT_CAPTURED'
        });
      }

      // Check if payment already exists
      let payment = await Payment.findOne({ 
        gatewayOrderId: razorpayOrderId,
        transactionId: razorpayPaymentId
      });

      if (payment) {
        // Payment already processed
        if (payment.status === 'Completed') {
          return res.json({
            success: true,
            message: 'Payment already processed',
            data: {
              paymentId: payment.paymentId,
              orderId: order.orderId,
              amount: payment.amount,
              status: payment.status,
              transactionId: payment.transactionId
            }
          });
        }
      } else {
        // Create new payment record (use rounded amount)
        payment = await Payment.create({
          orderId: order._id,
          userId,
          amount: roundedAmount, // Use rounded amount
          paymentMethod: paymentMethod || 'razorpay',
          paymentGateway: 'razorpay',
          gatewayOrderId: razorpayOrderId,
          transactionId: razorpayPaymentId,
          razorpayPaymentId: razorpayPaymentId, // Store for refund processing
          signature: razorpaySignature,
          status: 'Completed',
          paidAt: new Date()
        });
      }

      // Update order payment status and order status
      // Per requirements: After successful payment verification, order status should be "confirmed" and payment status to "paid"
      // For advance payment orders: If this is remaining payment, update remainingAmount to 0
      if (order.paymentOption === 'payAdvance' && order.remainingAmount > 0) {
        // This is payment for remaining amount after advance payment
        // Check if payment amount matches remaining amount
        const roundedRemaining = roundMoney(order.remainingAmount);
        if (Math.abs(roundedAmount - roundedRemaining) <= 0.01) {
          // Remaining amount paid - update remainingAmount to 0
          order.remainingAmount = 0;
        }
      }
      
      order.paymentStatus = 'paid';
      if (order.status === 'pending') {
        order.status = 'confirmed';
      }
      order.paymentDetails = {
        paymentId: payment.paymentId,
        transactionId: payment.transactionId,
        gateway: payment.paymentGateway,
        paidAt: payment.paidAt
      };
      await order.save();

      // Update product status to Rented Out for rental items
      const Product = require('../models/Product');
      for (const item of order.items) {
        if (item.type === 'rental' && item.productId) {
          await Product.findByIdAndUpdate(item.productId, { status: 'Rented Out' });
        }
      }

      // Notify admin about successful payment
      await notifyAdmin(
        `Payment Successful - Order ${order.orderId}`,
        `Payment of ₹${amount} has been successfully processed.\n\nPayment ID: ${payment.paymentId}\nOrder ID: ${order.orderId}\nTransaction ID: ${razorpayPaymentId}\nUser ID: ${userId}`
      );

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
    } catch (razorpayError) {
      console.error('Razorpay payment verification error:', razorpayError);
      
      return res.status(500).json({
        success: false,
        message: razorpayError.error?.description || 'Failed to verify payment with Razorpay',
        error: 'PAYMENT_VERIFICATION_ERROR'
      });
    }
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

// Razorpay Webhook Handler
exports.razorpayWebhook = async (req, res, next) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    
    if (!webhookSignature) {
      return res.status(400).json({
        success: false,
        message: 'Webhook signature missing'
      });
    }

    // Verify webhook signature
    // For webhooks, we need the raw body (not parsed JSON)
    const body = req.body;
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    const generatedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(bodyString)
      .digest('hex');

    if (generatedSignature !== webhookSignature) {
      console.error('Invalid webhook signature');
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload?.payment?.entity;
    const orderEntity = req.body.payload?.order?.entity;

    if (!paymentEntity || !orderEntity) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook payload'
      });
    }

    const razorpayOrderId = orderEntity.id;
    const razorpayPaymentId = paymentEntity.id;
    const paymentStatus = paymentEntity.status;

    // Find payment by Razorpay order ID
    const payment = await Payment.findOne({ gatewayOrderId: razorpayOrderId });
    
    if (!payment) {
      console.error(`Payment not found for Razorpay order: ${razorpayOrderId}`);
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Handle different payment events
    if (event === 'payment.captured' || event === 'payment.authorized') {
      if (payment.status !== 'Completed') {
        payment.status = 'Completed';
        payment.transactionId = razorpayPaymentId;
        payment.razorpayPaymentId = razorpayPaymentId; // Store for refund processing
        payment.paidAt = new Date();
        await payment.save();

        // Update order
        // Per requirements: After successful payment verification, order status should be "confirmed" and payment status to "paid"
        const order = await Order.findById(payment.orderId);
        if (order && order.paymentStatus !== 'paid') {
          order.paymentStatus = 'paid';
          if (order.status === 'pending') {
            order.status = 'confirmed';
          }
          order.paymentDetails = {
            paymentId: payment.paymentId,
            transactionId: payment.transactionId,
            gateway: payment.paymentGateway,
            paidAt: payment.paidAt
          };
          await order.save();

          // Update product status
          const Product = require('../models/Product');
          for (const item of order.items) {
            if (item.type === 'rental' && item.productId) {
              await Product.findByIdAndUpdate(item.productId, { status: 'Rented Out' });
            }
          }

          // Notify admin
          await notifyAdmin(
            `Payment Successful (Webhook) - Order ${order.orderId}`,
            `Payment of ₹${payment.amount} has been successfully processed via webhook.\n\nPayment ID: ${payment.paymentId}\nOrder ID: ${order.orderId}\nTransaction ID: ${razorpayPaymentId}`
          );
        }
      }
    } else if (event === 'payment.failed') {
      if (payment.status !== 'Failed') {
        payment.status = 'Failed';
        await payment.save();

        // Notify admin about failed payment
        const order = await Order.findById(payment.orderId);
        await notifyAdmin(
          `Payment Failed (Webhook) - Order ${order?.orderId || 'N/A'}`,
          `Payment failed for order.\n\nPayment ID: ${payment.paymentId}\nOrder ID: ${order?.orderId || 'N/A'}\nRazorpay Payment ID: ${razorpayPaymentId}\nFailure Reason: ${paymentEntity.error_description || 'Unknown'}`
        );
      }
    }

    res.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    next(error);
  }
};

// Get Payment Link (Returns the personalized Razorpay payment link)
exports.getPaymentLink = async (req, res, next) => {
  try {
    const paymentLink = process.env.RAZORPAY_PAYMENT_LINK;
    
    if (!paymentLink) {
      return res.status(404).json({
        success: false,
        message: 'Payment link not configured',
        error: 'NOT_CONFIGURED'
      });
    }

    res.json({
      success: true,
      data: {
        paymentLink: paymentLink,
        message: 'Use this link for manual payments or as a fallback option'
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

    // Find order - support both MongoDB _id and orderId string
    const order = await findOrderByIdentifier(orderId, userId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        error: 'NOT_FOUND'
      });
    }

    // Calculate discount using dynamic settings
    // Order: Product Discount (already in order.total) → Payment Discount → Coupon Discount
    // order.total is subtotal after product discounts
    // Round order total first
    const roundedOrderTotal = roundMoney(order.total);
    let discountAmount = 0;
    let finalAmount = roundedOrderTotal;

    if (paymentMethod === 'payNow' || paymentMethod === 'full') {
      // Pay Now (full payment) - use instantPaymentDiscount
      const Settings = require('../models/Settings');
      const settings = await Settings.getSettings();
      const discountPercentage = settings.instantPaymentDiscount / 100;
      discountAmount = roundMoney(roundedOrderTotal * discountPercentage);
      finalAmount = roundMoney(roundedOrderTotal - discountAmount);
    } else if (paymentMethod === 'advance') {
      // Pay Advance - use advancePaymentDiscount
      const Settings = require('../models/Settings');
      const settings = await Settings.getSettings();
      const discountPercentage = settings.advancePaymentDiscount / 100;
      discountAmount = roundMoney(roundedOrderTotal * discountPercentage);
      finalAmount = roundMoney(roundedOrderTotal - discountAmount);
    }

    res.json({
      success: true,
      data: {
        totalAmount: roundedOrderTotal, // Return rounded values
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

// Manual Refund (For Admin)
exports.createRefund = async (req, res, next) => {
  try {
    const { paymentId, amount, notes } = req.body;

    // Validate input
    if (!paymentId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID and amount are required',
        error: 'VALIDATION_ERROR'
      });
    }

    // Validate and round amount
    const roundedAmount = validateAndRoundMoney(amount, 'refund amount');
    
    if (roundedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount must be greater than 0',
        error: 'VALIDATION_ERROR'
      });
    }

    // Find payment - support both MongoDB _id and paymentId string
    let payment;
    if (mongoose.Types.ObjectId.isValid(paymentId)) {
      payment = await Payment.findById(paymentId);
    } else {
      payment = await Payment.findOne({ paymentId: paymentId });
    }

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
        error: 'NOT_FOUND'
      });
    }

    if (payment.status !== 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment is not in completed status. Only completed payments can be refunded.',
        error: 'VALIDATION_ERROR',
        details: {
          paymentStatus: payment.status,
          paymentId: payment.paymentId
        }
      });
    }

    if (payment.refundStatus === 'processed') {
      return res.status(400).json({
        success: false,
        message: 'Refund already processed for this payment',
        error: 'VALIDATION_ERROR',
        details: {
          refundId: payment.refundId,
          refundAmount: payment.refundAmount,
          refundedAt: payment.refundedAt
        }
      });
    }

    // Validate refund amount doesn't exceed payment amount
    const paymentAmount = roundMoney(payment.amount);
    if (roundedAmount > paymentAmount) {
      return res.status(400).json({
        success: false,
        message: `Refund amount (₹${roundedAmount}) cannot exceed payment amount (₹${paymentAmount})`,
        error: 'VALIDATION_ERROR',
        details: {
          refundAmount: roundedAmount,
          paymentAmount: paymentAmount,
          difference: roundedAmount - paymentAmount
        }
      });
    }

    // Check if partial refund is already processed
    if (payment.refundAmount && payment.refundAmount > 0) {
      const remainingRefundable = roundMoney(paymentAmount - payment.refundAmount);
      if (roundedAmount > remainingRefundable) {
        return res.status(400).json({
          success: false,
          message: `Refund amount (₹${roundedAmount}) exceeds remaining refundable amount (₹${remainingRefundable})`,
          error: 'VALIDATION_ERROR',
          details: {
            refundAmount: roundedAmount,
            alreadyRefunded: payment.refundAmount,
            remainingRefundable: remainingRefundable
          }
        });
      }
    }

    // Convert amount to paise
    const refundAmountInPaise = Math.round(roundedAmount * 100);

    // Razorpay minimum refund amount: ₹1.00 (100 paise)
    const MINIMUM_REFUND_AMOUNT_PAISE = 100;
    if (refundAmountInPaise < MINIMUM_REFUND_AMOUNT_PAISE) {
      return res.status(400).json({
        success: false,
        message: `Refund amount (₹${roundedAmount}) is less than minimum allowed amount (₹1.00)`,
        error: 'VALIDATION_ERROR'
      });
    }

    // Get Razorpay payment ID
    const razorpayPaymentId = payment.razorpayPaymentId || payment.transactionId;
    if (!razorpayPaymentId) {
      return res.status(400).json({
        success: false,
        message: 'Razorpay payment ID not found. Cannot process refund without Razorpay payment ID.',
        error: 'VALIDATION_ERROR'
      });
    }

    // Process refund through Razorpay
    let refund;
    try {
      refund = await razorpayInstance.payments.refund(
        razorpayPaymentId,
        {
          amount: refundAmountInPaise,
          notes: notes || {}
        }
      );
    } catch (razorpayError) {
      console.error('Razorpay refund error:', razorpayError);
      return res.status(500).json({
        success: false,
        message: razorpayError.error?.description || 'Failed to process refund with Razorpay',
        error: 'RAZORPAY_REFUND_ERROR',
        details: razorpayError.error
      });
    }

    // Create refund record
    const Refund = require('../models/Refund');
    let refundRecord;
    try {
      refundRecord = await Refund.create({
        refundId: refund.id,
        razorpayRefundId: refund.id,
        paymentId: payment._id,
        orderId: payment.orderId,
        amount: roundedAmount, // Use rounded amount
        amountInPaise: refundAmountInPaise,
        status: refund.status === 'processed' ? 'processed' : 'pending',
        reason: notes?.reason || 'Manual refund',
        processedAt: new Date(),
        razorpayRefundData: refund
      });
    } catch (dbError) {
      console.error('Error creating refund record:', dbError);
      // Refund was processed in Razorpay but failed to save in DB
      // This is a critical error - log it and notify admin
      await notifyAdmin(
        `Refund Processed but Database Save Failed - Payment ${payment.paymentId}`,
        `Refund of ₹${roundedAmount} was processed in Razorpay (ID: ${refund.id}) but failed to save in database.\n\nPayment ID: ${payment.paymentId}\nRazorpay Refund ID: ${refund.id}\nError: ${dbError.message}`
      );
      
      return res.status(500).json({
        success: false,
        message: 'Refund processed in Razorpay but failed to save refund record. Please contact support.',
        error: 'DATABASE_ERROR',
        details: {
          razorpayRefundId: refund.id,
          error: dbError.message
        }
      });
    }

    // Update payment record
    // For partial refunds, accumulate the refund amount
    const currentRefundAmount = payment.refundAmount || 0;
    const totalRefunded = roundMoney(currentRefundAmount + roundedAmount);
    
    payment.refundId = refund.id;
    payment.refundStatus = refund.status === 'processed' ? 'processed' : 'pending';
    payment.refundAmount = totalRefunded; // Accumulate refund amount
    payment.refundedAt = new Date();
    
    // If full refund, update payment status
    if (totalRefunded >= paymentAmount) {
      payment.status = 'Refunded';
    }
    
    await payment.save();

    // Update order payment status
    const order = await Order.findById(payment.orderId);
    if (order) {
      // If full refund, mark order as refunded
      if (totalRefunded >= paymentAmount) {
        order.paymentStatus = 'refunded';
      }
      // For partial refunds, keep paymentStatus as 'paid' since order is still valid
      // The refund information is tracked in the Payment model
      await order.save();

      // Update product status if full refund
      if (totalRefunded >= paymentAmount) {
        const Product = require('../models/Product');
        for (const item of order.items) {
          if (item.type === 'rental' && item.productId) {
            await Product.findByIdAndUpdate(item.productId, { status: 'Available' });
          }
        }
      }
    }

    // Notify admin about refund
    await notifyAdmin(
      `Refund Processed - Payment ${payment.paymentId}`,
      `Refund of ₹${roundedAmount} has been processed.\n\nPayment ID: ${payment.paymentId}\nOrder ID: ${order?.orderId || 'N/A'}\nRazorpay Refund ID: ${refund.id}\nTotal Refunded: ₹${totalRefunded} / ₹${paymentAmount}\nReason: ${notes?.reason || 'Manual refund'}`
    );

    return res.json({
      success: true,
      message: refund.status === 'processed' ? 'Refund processed successfully' : 'Refund initiated successfully',
      data: {
        refund: refundRecord,
        payment: {
          paymentId: payment.paymentId,
          refundAmount: totalRefunded,
          refundStatus: payment.refundStatus,
          paymentAmount: paymentAmount
        },
        order: order ? {
          orderId: order.orderId,
          paymentStatus: order.paymentStatus
        } : null
      }
    });
  } catch (error) {
    console.error('Manual refund error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: error.error?.description || error.message || 'Unknown error'
    });
  }
};

