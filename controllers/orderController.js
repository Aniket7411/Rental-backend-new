const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Service = require('../models/Service');
const ServiceBooking = require('../models/ServiceBooking');
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');
const CouponUsage = require('../models/CouponUsage');
const { notifyAdmin } = require('../utils/notifications');
const { roundMoney, validateAndRoundMoney } = require('../utils/money');
const { formatOrderResponse, formatOrdersResponse } = require('../utils/orderFormatter');

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

    // Format orders to ensure all monetary values are rounded
    const formattedOrders = formatOrdersResponse(orders);

    res.json({
      success: true,
      data: formattedOrders,
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
    const userRole = req.user.role;
    const orderIdentifier = req.params.orderId;

    // Build base query - admins can view any order, users can only view their own
    const userQuery = userRole !== 'admin' ? { userId } : {};

    // Check if orderIdentifier is a valid MongoDB ObjectId
    let order = null;

    if (mongoose.Types.ObjectId.isValid(orderIdentifier)) {
      // Try finding by MongoDB _id
      order = await Order.findOne({
        _id: orderIdentifier,
        ...userQuery
      })
        .populate('items.productId')
        .populate('items.serviceId')
        .populate('userId', 'name email phone');
    }

    // If not found, try finding by orderId string (e.g., "ORD-2025-295")
    if (!order) {
      order = await Order.findOne({
        orderId: orderIdentifier,
        ...userQuery
      })
        .populate('items.productId')
        .populate('items.serviceId')
        .populate('userId', 'name email phone');
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        error: 'NOT_FOUND'
      });
    }

    // Format order to ensure all monetary values are rounded
    const formattedOrder = formatOrderResponse(order);

    res.json({
      success: true,
      data: formattedOrder
    });
  } catch (error) {
    next(error);
  }
};

// Create Order (supports both rentals and services)
exports.createOrder = async (req, res, next) => {
  try {
    const {
      orderId,
      items,
      paymentOption,
      paymentStatus,
      total,
      productDiscount, // Total product discount amount (from handoff doc)
      discount, // Total discount (product + payment + coupon)
      couponCode,
      couponDiscount,
      paymentDiscount, // Payment option discount (Pay Now or Pay Advance discount)
      finalTotal,
      customerInfo,
      deliveryAddresses,
      notes,
      orderDate,
      shippingAddress,
      billingAddress,
      priorityServiceScheduling,
      advanceAmount,
      remainingAmount
    } = req.body;

    // Use customerInfo.userId if provided, otherwise use authenticated user
    let userId;
    if (customerInfo && customerInfo.userId) {
      // Validate that the customerInfo.userId matches the authenticated user
      const authenticatedUserId = (req.user._id || req.user.id).toString();
      if (customerInfo.userId !== authenticatedUserId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Customer info userId must match authenticated user',
          error: 'FORBIDDEN'
        });
      }
      userId = customerInfo.userId;
    } else {
      userId = req.user._id || req.user.id;
    }

    // Validate orderId if provided (frontend should provide it)
    // If not provided, it will be auto-generated (backward compatibility)
    if (orderId && typeof orderId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'orderId must be a string',
        error: 'VALIDATION_ERROR'
      });
    }

    // Check orderId uniqueness if provided (per handoff doc requirement)
    if (orderId) {
      const existingOrder = await Order.findOne({ orderId: orderId.trim() });
      if (existingOrder) {
        return res.status(400).json({
          success: false,
          message: `Order ID ${orderId} already exists`,
          error: 'ORDER_ID_DUPLICATE'
        });
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order items are required',
        error: 'VALIDATION_ERROR'
      });
    }

    if (!paymentOption || !['payNow', 'payAdvance'].includes(paymentOption)) {
      return res.status(400).json({
        success: false,
        message: 'Payment option must be "payNow" or "payAdvance"',
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
        if (!item.productId || !item.quantity) {
          return res.status(400).json({
            success: false,
            message: 'Rental items require productId and quantity',
            error: 'VALIDATION_ERROR'
          });
        }

        const product = await Product.findById(item.productId);
        if (!product) {
          return res.status(400).json({
            success: false,
            message: `Item ${processedItems.length + 1}: Product not found`,
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

        // Handle monthly payment vs regular payment
        const isMonthlyPayment = item.isMonthlyPayment === true;
        let duration;
        let itemPrice;

        if (isMonthlyPayment) {
          // Validate monthly payment fields
          if (!item.monthlyPrice || item.monthlyPrice <= 0) {
            return res.status(400).json({
              success: false,
              message: `Item ${processedItems.length + 1}: Monthly price is required and must be greater than 0`,
              error: 'VALIDATION_ERROR'
            });
          }

          if (!item.monthlyTenure || item.monthlyTenure < 3) {
            return res.status(400).json({
              success: false,
              message: `Item ${processedItems.length + 1}: Monthly tenure must be at least 3 months`,
              error: 'VALIDATION_ERROR'
            });
          }

          // Validate monthlyTenure is one of the allowed values
          const allowedMonthlyTenures = [3, 6, 9, 11, 12, 24];
          if (!allowedMonthlyTenures.includes(item.monthlyTenure)) {
            return res.status(400).json({
              success: false,
              message: `Item ${processedItems.length + 1}: Monthly tenure must be one of: ${allowedMonthlyTenures.join(', ')} months`,
              error: 'VALIDATION_ERROR'
            });
          }

          // Validate security deposit is provided and > 0
          if (!item.securityDeposit || item.securityDeposit <= 0) {
            return res.status(400).json({
              success: false,
              message: `Item ${processedItems.length + 1}: Security deposit is required and must be greater than 0 for monthly payment`,
              error: 'VALIDATION_ERROR'
            });
          }

          // Validate that product supports monthly payment
          if (!product.monthlyPaymentEnabled) {
            return res.status(400).json({
              success: false,
              message: `Item ${processedItems.length + 1}: This product does not support monthly payment`,
              error: 'VALIDATION_ERROR'
            });
          }

          // Validate monthly price matches product monthly price
          if (product.monthlyPrice !== item.monthlyPrice) {
            return res.status(400).json({
              success: false,
              message: `Item ${processedItems.length + 1}: Monthly price mismatch with product. Expected ₹${product.monthlyPrice}, got ₹${item.monthlyPrice}`,
              error: 'VALIDATION_ERROR'
            });
          }

          // Validate security deposit matches product security deposit
          if (product.securityDeposit !== item.securityDeposit) {
            return res.status(400).json({
              success: false,
              message: `Item ${processedItems.length + 1}: Security deposit mismatch with product. Expected ₹${product.securityDeposit}, got ₹${item.securityDeposit}`,
              error: 'VALIDATION_ERROR'
            });
          }

          // Set duration to monthlyTenure for consistency
          duration = item.monthlyTenure;
          // Calculate upfront payment: monthlyPrice + securityDeposit (NOT monthlyPrice * monthlyTenure)
          itemPrice = item.monthlyPrice + item.securityDeposit;
        } else {
          // For regular payment, ensure monthly fields are null
          item.isMonthlyPayment = false;
          item.monthlyPrice = null;
          item.monthlyTenure = null;
          item.securityDeposit = null;

          // Regular payment validation
          if (!item.price) {
            return res.status(400).json({
              success: false,
              message: 'Rental items require price for regular payment',
              error: 'VALIDATION_ERROR'
            });
          }

          // Validate duration - MUST be a number (3, 6, 9, 11, 12, or 24)
          duration = item.duration;
          if (duration === undefined || duration === null) {
            duration = 3; // Default to 3 months
          } else {
            // Convert to number if string is provided
            duration = typeof duration === 'string' ? parseInt(duration, 10) : duration;
            if (isNaN(duration) || ![3, 6, 9, 11, 12, 24].includes(duration)) {
              return res.status(400).json({
                success: false,
                message: `Item ${processedItems.length + 1}: Invalid duration. Must be 3, 6, 9, 11, 12, or 24 months`,
                error: 'VALIDATION_ERROR'
              });
            }
          }

          // Validate that the product has a price for the selected duration
          if (!product.price || !product.price[duration]) {
            return res.status(400).json({
              success: false,
              message: `Price for selected duration (${duration} months) is not available for this product`,
              error: 'PRICE_NOT_AVAILABLE'
            });
          }

          itemPrice = item.price;
        }

        // Create product snapshot (for backward compatibility)
        const productSnapshot = {
          _id: product._id,
          category: product.category,
          brand: product.brand,
          model: product.model,
          type: product.type,
          capacity: product.capacity,
          location: product.location,
          images: product.images,
          price: product.price,
          installationCharges: product.installationCharges || null,
          monthlyPaymentEnabled: product.monthlyPaymentEnabled || false,
          monthlyPrice: product.monthlyPrice || null,
          securityDeposit: product.securityDeposit || 0
        };

        // Use productDetails from frontend if provided, otherwise use snapshot
        const productDetails = item.productDetails || productSnapshot;
        const deliveryInfo = item.deliveryInfo || {};

        // Calculate installation charges for AC products
        let installationChargesAmount = 0;
        if (product.category === 'AC' && product.installationCharges && product.installationCharges.amount) {
          installationChargesAmount = product.installationCharges.amount;
        }

        // If frontend provides installationCharges in item, use that (for flexibility)
        if (item.installationCharges !== undefined && item.installationCharges !== null) {
          installationChargesAmount = typeof item.installationCharges === 'number'
            ? item.installationCharges
            : (item.installationCharges.amount || 0);
        }

        // Round monetary values before adding to items
        const roundedItemPrice = roundMoney(itemPrice);
        const roundedInstallationCharges = installationChargesAmount > 0 ? roundMoney(installationChargesAmount) : 0;
        const roundedMonthlyPrice = isMonthlyPayment ? roundMoney(item.monthlyPrice) : null;
        const roundedSecurityDeposit = isMonthlyPayment ? roundMoney(item.securityDeposit) : null;

        processedItems.push({
          type: 'rental',
          productId: product._id,
          product: productSnapshot, // Keep for backward compatibility
          productDetails: productDetails,
          deliveryInfo: deliveryInfo,
          quantity: item.quantity,
          price: roundedItemPrice,
          duration: duration,
          isMonthlyPayment: isMonthlyPayment,
          monthlyPrice: roundedMonthlyPrice,
          monthlyTenure: isMonthlyPayment ? item.monthlyTenure : null,
          securityDeposit: roundedSecurityDeposit,
          installationCharges: roundedInstallationCharges > 0 ? {
            amount: roundedInstallationCharges,
            includedItems: product.installationCharges?.includedItems || [],
            extraMaterialRates: product.installationCharges?.extraMaterialRates || {
              copperPipe: 0,
              drainPipe: 0,
              electricWire: 0
            }
          } : null
        });

        // Add rental price and installation charges to total (already rounded)
        calculatedTotal += roundedItemPrice;
        if (roundedInstallationCharges > 0) {
          calculatedTotal += roundedInstallationCharges;
        }
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

        // Create service snapshot (for backward compatibility)
        const serviceSnapshot = {
          _id: service._id,
          title: service.title,
          description: service.description,
          price: service.price,
          image: service.image
        };

        // Use serviceDetails from frontend if provided, otherwise use snapshot
        const serviceDetails = item.serviceDetails || serviceSnapshot;

        // Round service price before adding to items
        const roundedServicePrice = roundMoney(item.price);

        processedItems.push({
          type: 'service',
          serviceId: service._id,
          service: serviceSnapshot, // Keep for backward compatibility
          serviceDetails: serviceDetails,
          quantity: item.quantity || 1, // Default to 1 if not provided
          bookingDetails: item.bookingDetails,
          price: roundedServicePrice
        });

        calculatedTotal += roundedServicePrice;

        // Store service booking details to create after order
        serviceBookingsToCreate.push({
          serviceId: service._id,
          service: service, // Store full service object for reference
          serviceTitle: service.title,
          servicePrice: service.price,
          bookingDetails: item.bookingDetails
        });
      }
    }

    // Round calculated total to 2 decimal places
    calculatedTotal = roundMoney(calculatedTotal);

    // Calculate payment discount using dynamic settings
    // Order: Product Discount (already in itemPrice) → Payment Discount → Coupon Discount
    // calculatedTotal is subtotal after product discounts
    let calculatedPaymentDiscount = 0;
    if (paymentOption === 'payNow') {
      // Pay Now - use instantPaymentDiscount
      const Settings = require('../models/Settings');
      const settings = await Settings.getSettings();
      const discountPercentage = settings.instantPaymentDiscount / 100;
      calculatedPaymentDiscount = roundMoney(calculatedTotal * discountPercentage);
    } else if (paymentOption === 'payAdvance') {
      // Pay Advance - use advancePaymentDiscount
      const Settings = require('../models/Settings');
      const settings = await Settings.getSettings();
      const discountPercentage = settings.advancePaymentDiscount / 100;
      calculatedPaymentDiscount = roundMoney(calculatedTotal * discountPercentage);
    }

    // Validate and apply coupon discount if provided
    let calculatedCouponDiscount = 0;
    let coupon = null;
    if (couponCode && couponCode.trim()) {
      // Find and validate coupon
      coupon = await Coupon.findOne({
        code: couponCode.trim().toUpperCase(),
        isActive: true
      });

      if (!coupon) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coupon code',
          error: 'COUPON_NOT_FOUND'
        });
      }

      // Check validity dates
      const now = new Date();
      if (now < coupon.validFrom || now > coupon.validUntil) {
        return res.status(400).json({
          success: false,
          message: 'Coupon has expired or is not yet valid',
          error: 'COUPON_EXPIRED'
        });
      }

      // Check usage limit
      if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
        return res.status(400).json({
          success: false,
          message: 'Coupon usage limit reached',
          error: 'COUPON_USAGE_LIMIT_REACHED'
        });
      }

      // Check minimum amount
      if (coupon.minAmount && calculatedTotal < coupon.minAmount) {
        return res.status(400).json({
          success: false,
          message: `Minimum order amount of ₹${coupon.minAmount} required`,
          error: 'COUPON_MIN_AMOUNT_NOT_MET'
        });
      }

      // Check user limit
      if (coupon.userLimit !== null) {
        const userUsageCount = await CouponUsage.countDocuments({
          couponId: coupon._id,
          userId: userId
        });

        if (userUsageCount >= coupon.userLimit) {
          return res.status(400).json({
            success: false,
            message: 'You have already used this coupon',
            error: 'COUPON_USER_LIMIT_REACHED'
          });
        }
      }

      // Check category restrictions
      if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
        const orderCategories = processedItems
          .filter(item => item.type === 'rental' && item.productDetails?.category)
          .map(item => item.productDetails.category);

        const hasMatchingCategory = coupon.applicableCategories.some(category =>
          orderCategories.includes(category)
        );

        if (!hasMatchingCategory) {
          return res.status(400).json({
            success: false,
            message: 'Coupon not applicable for selected category',
            error: 'COUPON_CATEGORY_NOT_APPLICABLE'
          });
        }
      }

      // Check duration restrictions
      if (coupon.applicableDurations && coupon.applicableDurations.length > 0) {
        const orderDurations = processedItems
          .filter(item => item.type === 'rental' && item.duration)
          .map(item => item.duration);

        const hasMatchingDuration = coupon.applicableDurations.some(duration =>
          orderDurations.includes(duration)
        );

        if (!hasMatchingDuration) {
          return res.status(400).json({
            success: false,
            message: 'Coupon not applicable for selected duration',
            error: 'COUPON_DURATION_NOT_APPLICABLE'
          });
        }
      }

      // Calculate coupon discount
      if (coupon.type === 'percentage') {
        calculatedCouponDiscount = calculatedTotal * (coupon.value / 100);
        // Apply max discount if specified
        if (coupon.maxDiscount && calculatedCouponDiscount > coupon.maxDiscount) {
          calculatedCouponDiscount = coupon.maxDiscount;
        }
      } else if (coupon.type === 'fixed') {
        calculatedCouponDiscount = coupon.value;
        // Ensure discount doesn't exceed order total
        if (calculatedCouponDiscount > calculatedTotal) {
          calculatedCouponDiscount = calculatedTotal;
        }
      }

      // Round to 2 decimal places using roundMoney utility
      calculatedCouponDiscount = roundMoney(calculatedCouponDiscount);
    }

    // Validate and round provided values, or use calculated values
    // Round all monetary values to 2 decimal places
    const roundedTotal = total !== undefined ? validateAndRoundMoney(total, 'total') : calculatedTotal;
    const roundedPaymentDiscount = validateAndRoundMoney(calculatedPaymentDiscount, 'paymentDiscount');
    const roundedCouponDiscount = couponDiscount !== undefined ? validateAndRoundMoney(couponDiscount, 'couponDiscount') : calculatedCouponDiscount;
    
    // Calculate final total using rounded values: total - paymentDiscount - couponDiscount
    const calculatedFinalTotal = roundMoney(roundedTotal - roundedPaymentDiscount - roundedCouponDiscount);

    // Use provided finalTotal if provided (rounded), otherwise use calculated
    const providedFinalTotal = finalTotal !== undefined ? validateAndRoundMoney(finalTotal, 'finalTotal') : null;
    
    // Validate final total calculation
    // If provided value differs significantly (> 0.01), recalculate and use calculated value
    let orderFinalTotal;
    if (providedFinalTotal !== null && Math.abs(providedFinalTotal - calculatedFinalTotal) > 0.01) {
      console.warn(`Final total mismatch, using calculated value. Provided: ${providedFinalTotal}, Calculated: ${calculatedFinalTotal}`);
      orderFinalTotal = calculatedFinalTotal;
    } else {
      orderFinalTotal = providedFinalTotal !== null ? providedFinalTotal : calculatedFinalTotal;
    }

    // Round all monetary values for order
    const orderTotal = roundMoney(roundedTotal);
    const orderProductDiscount = productDiscount !== undefined ? validateAndRoundMoney(productDiscount, 'productDiscount') : 0;
    const orderPaymentDiscount = roundMoney(roundedPaymentDiscount);
    const orderCouponDiscount = roundMoney(roundedCouponDiscount);
    const orderDiscount = discount !== undefined ? validateAndRoundMoney(discount, 'discount') : roundMoney(orderPaymentDiscount + orderCouponDiscount);
    const finalOrderFinalTotal = roundMoney(orderFinalTotal);

    // Verify calculation one more time
    const verificationTotal = roundMoney(orderTotal - orderPaymentDiscount - orderCouponDiscount);
    let finalCorrectedFinalTotal = finalOrderFinalTotal;
    if (Math.abs(finalOrderFinalTotal - verificationTotal) > 0.01) {
      console.warn(`Final total verification failed. Expected: ${verificationTotal}, Got: ${finalOrderFinalTotal}. Using calculated value.`);
      // Use recalculated value as source of truth
      finalCorrectedFinalTotal = verificationTotal;
    }

    // Handle advance payment validation and logic
    let orderPriorityServiceScheduling = false;
    let orderAdvanceAmount = null;
    let orderRemainingAmount = null;

    if (paymentOption === 'payAdvance') {
      // Get settings for advance payment amount
      const Settings = require('../models/Settings');
      const settings = await Settings.getSettings();
      const expectedAdvanceAmount = settings.advancePaymentAmount || 500;

      // Validate priorityServiceScheduling - must be true for advance payment
      if (priorityServiceScheduling !== undefined && priorityServiceScheduling !== true) {
        return res.status(400).json({
          success: false,
          message: 'priorityServiceScheduling must be true when paymentOption is payAdvance',
          error: 'VALIDATION_ERROR'
        });
      }
      orderPriorityServiceScheduling = true;

      // Validate advanceAmount - should match advancePaymentAmount from settings
      if (advanceAmount !== undefined) {
        const roundedAdvance = validateAndRoundMoney(advanceAmount, 'advanceAmount');
        if (Math.abs(roundedAdvance - expectedAdvanceAmount) > 0.01) {
          return res.status(400).json({
            success: false,
            message: `advanceAmount must be exactly ₹${expectedAdvanceAmount} (current advance payment amount setting)`,
            error: 'VALIDATION_ERROR'
          });
        }
        orderAdvanceAmount = roundMoney(expectedAdvanceAmount);
      } else {
        orderAdvanceAmount = roundMoney(expectedAdvanceAmount);
      }

      // Calculate remaining amount
      // If finalTotal < 999, set remainingAmount to 0 (advance covers full amount)
      if (finalCorrectedFinalTotal < orderAdvanceAmount) {
        orderRemainingAmount = 0;
        // Note: In this case, the advance amount exceeds the final total
        // Consider adjusting the advance amount or refunding excess
      } else {
        orderRemainingAmount = roundMoney(finalCorrectedFinalTotal - orderAdvanceAmount);
      }

      // Validate remainingAmount if provided
      if (remainingAmount !== undefined) {
        const roundedRemaining = validateAndRoundMoney(remainingAmount, 'remainingAmount');
        const calculatedRemaining = roundMoney(finalCorrectedFinalTotal - orderAdvanceAmount);
        if (Math.abs(roundedRemaining - calculatedRemaining) > 0.01) {
          console.warn(`Remaining amount mismatch. Provided: ${roundedRemaining}, Calculated: ${calculatedRemaining}. Using calculated value.`);
          // Use calculated value as source of truth
          orderRemainingAmount = calculatedRemaining >= 0 ? calculatedRemaining : 0;
        } else {
          orderRemainingAmount = roundedRemaining >= 0 ? roundedRemaining : 0;
        }
      }
    } else {
      // For non-advance payment options, validate that advance payment fields are not set
      if (priorityServiceScheduling !== undefined && priorityServiceScheduling !== false) {
        return res.status(400).json({
          success: false,
          message: 'priorityServiceScheduling must be false for non-advance payment options',
          error: 'VALIDATION_ERROR'
        });
      }
      if (advanceAmount !== undefined && advanceAmount !== null) {
        return res.status(400).json({
          success: false,
          message: 'advanceAmount must be null for non-advance payment options',
          error: 'VALIDATION_ERROR'
        });
      }
      if (remainingAmount !== undefined && remainingAmount !== null) {
        return res.status(400).json({
          success: false,
          message: 'remainingAmount must be null for non-advance payment options',
          error: 'VALIDATION_ERROR'
        });
      }
    }

    // Set payment status based on payment option
    let finalPaymentStatus;
    if (paymentStatus) {
      finalPaymentStatus = paymentStatus;
    } else if (paymentOption === 'payNow') {
      finalPaymentStatus = 'paid';
    } else if (paymentOption === 'payAdvance') {
      finalPaymentStatus = 'pending'; // Advance payment not yet received
    } else {
      finalPaymentStatus = 'pending';
    }

    // Set order status based on payment status
    // If payNow and payment is successful, status should be "confirmed", otherwise "pending"
    const orderStatus = (paymentOption === 'payNow' && finalPaymentStatus === 'paid') ? 'confirmed' : 'pending';

    // Validate customerInfo if provided
    if (customerInfo) {
      if (!customerInfo.userId || !customerInfo.name || !customerInfo.email || !customerInfo.phone) {
        return res.status(400).json({
          success: false,
          message: 'customerInfo must include userId, name, email, and phone',
          error: 'VALIDATION_ERROR'
        });
      }
    }

    // Create order with new structure
    // All monetary values are already rounded to 2 decimal places
    const orderData = {
      orderId: orderId, // Frontend provides orderId
      userId,
      items: processedItems,
      total: orderTotal,
      productDiscount: orderProductDiscount, // Total product discount amount (rounded)
      discount: orderDiscount, // Total discount (rounded)
      paymentDiscount: orderPaymentDiscount, // Payment discount (rounded)
      couponCode: couponCode ? couponCode.trim().toUpperCase() : null,
      couponDiscount: orderCouponDiscount, // Coupon discount (rounded)
      finalTotal: finalCorrectedFinalTotal, // Final total (rounded and verified)
      paymentOption,
      paymentStatus: finalPaymentStatus,
      status: orderStatus,
      priorityServiceScheduling: orderPriorityServiceScheduling,
      advanceAmount: orderAdvanceAmount,
      remainingAmount: orderRemainingAmount,
      customerInfo: customerInfo || null,
      deliveryAddresses: deliveryAddresses || [],
      notes: notes || '',
      orderDate: orderDate ? new Date(orderDate) : new Date(),
      shippingAddress: shippingAddress || '',
      billingAddress: billingAddress || ''
    };

    const order = await Order.create(orderData);

    // ============================================
    // SERVICE REQUEST FLOW: Auto-create Service Bookings
    // ============================================
    // According to SERVICE_REQUEST_FLOW.md:
    // When an order contains service items, automatically create ServiceBooking documents
    // for each service item. Service bookings are created from item.bookingDetails.
    // This ensures service bookings go through the proper checkout process.
    // ============================================

    // Use customerInfo if available, otherwise use req.user
    const customerName = customerInfo?.name || req.user?.name;
    const customerPhone = customerInfo?.phone || req.user?.phone;
    const customerEmail = customerInfo?.email || req.user?.email;

    for (const bookingData of serviceBookingsToCreate) {
      const { serviceId, service, serviceTitle, servicePrice, bookingDetails } = bookingData;

      // Validate bookingDetails has required fields
      if (!bookingDetails) {
        console.warn(`Skipping service booking creation for service ${serviceId}: missing bookingDetails`);
        continue;
      }

      // Set payment status for service booking
      const bookingPaymentOption = bookingDetails.paymentOption || paymentOption;
      const bookingPaymentStatus = bookingPaymentOption === 'payNow' ? 'paid' : 'pending';

      // Extract booking details according to SERVICE_REQUEST_FLOW.md
      // Map preferredDate/preferredTime to date/time (model uses date/time internally)
      const bookingDate = bookingDetails.preferredDate || bookingDetails.date;
      const bookingTime = bookingDetails.preferredTime || bookingDetails.time;

      // Use notes from bookingDetails (API uses notes, model uses description)
      const bookingNotes = bookingDetails.notes || bookingDetails.description || '';

      // Determine name and phone - prefer bookingDetails, fallback to customerInfo/user
      const bookingName = bookingDetails.name || bookingDetails.contactName || customerName;
      const bookingPhone = bookingDetails.phone || bookingDetails.contactPhone || customerPhone;

      // Create service booking document as per SERVICE_REQUEST_FLOW.md
      // Structure matches the flow document requirements:
      // - orderId: Links booking to order (required)
      // - userId: From customerInfo.userId
      // - All booking details from item.bookingDetails
      // - preferredDate/preferredTime mapped to date/time
      // - notes mapped to description
      // - Include address fields: nearLandmark, pincode, alternateNumber per USER.md
      const serviceBooking = await ServiceBooking.create({
        serviceId,
        orderId: order._id, // Link to order (required per SERVICE_REQUEST_FLOW.md)
        userId: userId, // From customerInfo.userId
        serviceTitle: serviceTitle || (service ? service.title : ''),
        servicePrice: servicePrice || (service ? service.price : 0),
        name: bookingName,
        phone: bookingPhone,
        email: customerEmail || bookingDetails.email || '',
        date: bookingDate, // Map from preferredDate (API uses preferredDate, model uses date)
        time: bookingTime, // Map from preferredTime (API uses preferredTime, model uses time)
        address: bookingDetails.address,
        nearLandmark: bookingDetails.nearLandmark || '',
        pincode: bookingDetails.pincode || '',
        alternateNumber: bookingDetails.alternateNumber || '',
        addressType: bookingDetails.addressType || 'myself',
        contactName: bookingDetails.contactName || (bookingDetails.addressType === 'other' ? bookingName : ''),
        contactPhone: bookingDetails.contactPhone || (bookingDetails.addressType === 'other' ? bookingPhone : ''),
        description: bookingNotes, // Map from notes (API uses notes, model uses description)
        paymentOption: bookingPaymentOption,
        paymentStatus: bookingPaymentStatus,
        status: 'New', // Default status per SERVICE_REQUEST_FLOW.md
        images: bookingDetails.images || [] // Optional images
      });

      // Log service booking creation for debugging
      console.log(`Service booking created: ${serviceBooking._id} for order ${order.orderId}`);
    }

    // Update product status to Rented Out for rental items ONLY if order is confirmed (payment successful)
    // For Pay Later orders, product remains Available until payment is confirmed
    if (orderStatus === 'confirmed' && finalPaymentStatus === 'paid') {
      for (const item of items) {
        if (item.type === 'rental' && item.productId) {
          await Product.findByIdAndUpdate(item.productId, { status: 'Rented Out' });
        }
      }
    }

    // Populate order for response
    await order.populate([
      { path: 'items.productId' },
      { path: 'items.serviceId' },
      { path: 'userId', select: 'name email phone' }
    ]);

    // Notify admin about new order (non-blocking - fire and forget)
    // This prevents email timeout from blocking the API response
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

    // Use non-blocking notification - don't await to prevent API timeout
    notifyAdmin(subject, messageText).catch(error => {
      console.error('Failed to send order notification email:', error);
    });

    // Format order for response to ensure all monetary values are rounded
    const formattedOrder = formatOrderResponse(order);

    // Response structure per handoff doc
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderId: order.orderId,
        order: formattedOrder, // Full order object with rounded monetary values
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get All Orders (Admin)
exports.getAllOrders = async (req, res, next) => {
  try {
    const { status, paymentStatus } = req.query;

    // Build query with filters
    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    if (paymentStatus && paymentStatus !== 'all') {
      query.paymentStatus = paymentStatus;
    }

    // Get all orders (no pagination for admin panel - frontend handles it)
    const orders = await Order.find(query)
      .populate('userId', 'name email phone')
      .populate('items.productId')
      .populate('items.serviceId')
      .sort({ createdAt: -1 })
      .lean(); // Use lean() for better performance

    // Format orders to ensure all monetary values are rounded (important for lean() queries)
    const formattedOrders = formatOrdersResponse(orders);

    res.json({
      success: true,
      data: formattedOrders
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

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
        error: 'VALIDATION_ERROR'
      });
    }

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        error: 'VALIDATION_ERROR'
      });
    }

    // Find order by MongoDB _id or orderId string
    let oldOrder = await Order.findById(orderId);
    if (!oldOrder) {
      // Try finding by orderId string (e.g., "ORD-2025-295")
      oldOrder = await Order.findOne({ orderId: orderId });
    }

    if (!oldOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        error: 'NOT_FOUND'
      });
    }

    // Update order using the _id from the found order
    const order = await Order.findByIdAndUpdate(
      oldOrder._id,
      { status },
      { new: true, runValidators: true }
    )
      .populate('userId', 'name email phone')
      .populate('items.productId')
      .populate('items.serviceId');

    // Format order for response
    const formattedOrder = formatOrderResponse(order);

    // Update product status when order is confirmed
    // Only update if status changed to 'confirmed' and payment is paid
    if (status === 'confirmed' && oldOrder.paymentStatus === 'paid') {
      for (const item of order.items) {
        if (item.type === 'rental' && item.productId) {
          await Product.findByIdAndUpdate(item.productId, { status: 'Rented Out' });
        }
      }
    }

    // If order is cancelled or status changes away from confirmed, make products available again
    if (status === 'cancelled' && oldOrder.status !== 'cancelled') {
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
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: formattedOrder
    });
  } catch (error) {
    next(error);
  }
};

// Cancel Order
exports.cancelOrder = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const userRole = req.user.role;
    const orderId = req.params.orderId;
    const { cancellationReason } = req.body;

    // Validate cancellation reason is provided
    if (!cancellationReason || typeof cancellationReason !== 'string' || cancellationReason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason is required',
        error: 'VALIDATION_ERROR'
      });
    }

    // Build query - admins can cancel any order, users can only cancel their own
    // Check if orderId is a valid MongoDB ObjectId
    let order = null;

    if (mongoose.Types.ObjectId.isValid(orderId)) {
      // Try finding by MongoDB _id
      const orderQuery = userRole === 'admin'
        ? { _id: orderId }
        : { _id: orderId, userId };
      order = await Order.findOne(orderQuery);
    }

    // If not found, try finding by orderId string (e.g., "ORD-2025-295")
    if (!order) {
      const orderIdQuery = userRole === 'admin'
        ? { orderId: orderId }
        : { orderId: orderId, userId };
      order = await Order.findOne(orderIdQuery);
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        error: 'NOT_FOUND'
      });
    }

    // Check if order can be cancelled
    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Order is already cancelled',
        error: 'VALIDATION_ERROR'
      });
    }

    if (order.status === 'completed' || order.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a ${order.status} order`,
        error: 'VALIDATION_ERROR'
      });
    }

    // Determine who is cancelling
    const cancelledBy = userRole === 'admin' ? 'admin' : 'user';

    // Update order with cancellation details
    order.status = 'cancelled';
    order.cancellationReason = cancellationReason.trim();
    order.cancelledAt = new Date();
    order.cancelledBy = cancelledBy;
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

    // Populate order for notification and response
    await order.populate([
      { path: 'items.productId' },
      { path: 'items.serviceId' },
      { path: 'userId', select: 'name email phone' }
    ]);

    // Format order for response
    const formattedOrder = formatOrderResponse(order);

    // Notify admin about order cancellation (non-blocking)
    const orderUser = order.userId;
    const subject = `Order ${order.orderId} Cancelled - ${cancelledBy === 'admin' ? 'By Admin' : 'By User'}`;
    const messageText = `
      An order has been cancelled:
      
      Order ID: ${order.orderId}
      Customer: ${orderUser?.name || 'N/A'} (${orderUser?.email || 'N/A'})
      Cancelled By: ${cancelledBy === 'admin' ? 'Admin' : 'User'}
      Cancellation Reason: ${cancellationReason}
      Cancelled At: ${order.cancelledAt.toLocaleString()}
      Order Total: ₹${order.total}
      
      Please check the admin panel for details.
    `;

    // Use non-blocking notification - don't await to prevent API timeout
    notifyAdmin(subject, messageText).catch(error => {
      console.error('Failed to send cancellation notification email:', error);
    });

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: formattedOrder
    });
  } catch (error) {
    next(error);
  }
};
