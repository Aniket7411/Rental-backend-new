const Coupon = require('../models/Coupon');
const CouponUsage = require('../models/CouponUsage');

// Validate Coupon Code
exports.validateCoupon = async (req, res, next) => {
  try {
    const { code, orderTotal, userId, items } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required',
        error: 'VALIDATION_ERROR'
      });
    }

    if (!orderTotal || orderTotal <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Order total is required and must be positive',
        error: 'VALIDATION_ERROR'
      });
    }

    // Find coupon (case-insensitive)
    const coupon = await Coupon.findOne({ 
      code: code.trim().toUpperCase(),
      isActive: true 
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon code is invalid or expired',
        error: 'COUPON_INVALID'
      });
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is invalid or expired',
        error: 'COUPON_INVALID'
      });
    }

    // Check validity dates
    const now = new Date();
    if (now < coupon.validFrom) {
      return res.status(400).json({
        success: false,
        message: 'Coupon is not yet valid',
        error: 'COUPON_NOT_STARTED'
      });
    }

    if (coupon.validUntil && now > coupon.validUntil) {
      return res.status(400).json({
        success: false,
        message: 'Coupon has expired',
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
    if (coupon.minAmount && orderTotal < coupon.minAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of ₹${coupon.minAmount} required`,
        error: 'COUPON_MIN_AMOUNT_NOT_MET'
      });
    }

    // Check user limit if userId is provided
    if (userId && coupon.userLimit !== null) {
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
    if (coupon.applicableCategories && coupon.applicableCategories.length > 0 && items) {
      const orderCategories = items
        .filter(item => item.type === 'rental' && item.category)
        .map(item => item.category);
      
      const hasMatchingCategory = coupon.applicableCategories.some(category =>
        orderCategories.includes(category)
      );

      if (!hasMatchingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Coupon code is invalid or expired',
          error: 'COUPON_NOT_APPLICABLE'
        });
      }
    }

    // Check duration restrictions
    if (coupon.applicableDurations && coupon.applicableDurations.length > 0 && items) {
      const orderDurations = items
        .filter(item => item.type === 'rental' && item.duration)
        .map(item => item.duration);
      
      const hasMatchingDuration = coupon.applicableDurations.some(duration =>
        orderDurations.includes(duration)
      );

      if (!hasMatchingDuration) {
        return res.status(400).json({
          success: false,
          message: 'Coupon code is invalid or expired',
          error: 'COUPON_NOT_APPLICABLE'
        });
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      discountAmount = orderTotal * (coupon.value / 100);
      // Apply max discount if specified
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else if (coupon.type === 'fixed') {
      discountAmount = coupon.value;
      // Ensure discount doesn't exceed order total
      if (discountAmount > orderTotal) {
        discountAmount = orderTotal;
      }
    }

    res.json({
      success: true,
      data: {
        _id: coupon._id,
        code: coupon.code,
        title: coupon.title,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        minAmount: coupon.minAmount,
        maxDiscount: coupon.maxDiscount,
        discountAmount: Math.round(discountAmount * 100) / 100, // Round to 2 decimal places
        validFrom: coupon.validFrom,
        validUntil: coupon.validUntil,
        applicableCategories: coupon.applicableCategories,
        applicableDurations: coupon.applicableDurations
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get Available Coupons
exports.getAvailableCoupons = async (req, res, next) => {
  try {
    const { userId, category, minAmount } = req.query;
    const now = new Date();

    // Build query
    const queryConditions = [
      { isActive: true },
      { validFrom: { $lte: now } },
      {
        $or: [
          { validUntil: null },
          { validUntil: { $gte: now } }
        ]
      }
    ];

    // Filter by category if provided
    if (category) {
      queryConditions.push({
        $or: [
          { applicableCategories: { $size: 0 } }, // No category restriction
          { applicableCategories: category } // Matches category
        ]
      });
    }

    // Filter by minimum amount if provided
    if (minAmount) {
      const minAmountNum = parseFloat(minAmount);
      queryConditions.push({
        $or: [
          { minAmount: { $lte: minAmountNum } },
          { minAmount: 0 },
          { minAmount: null }
        ]
      });
    }

    const query = queryConditions.length > 0 ? { $and: queryConditions } : {};

    // Check usage limits
    const coupons = await Coupon.find(query).sort({ createdAt: -1 });

    // Filter coupons based on usage limits and user limits
    const availableCoupons = [];
    for (const coupon of coupons) {
      // Check global usage limit
      if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
        continue;
      }

      // Check user limit if userId is provided
      if (userId && coupon.userLimit !== null) {
        const userUsageCount = await CouponUsage.countDocuments({
          couponId: coupon._id,
          userId: userId
        });

        if (userUsageCount >= coupon.userLimit) {
          continue;
        }
      }

      availableCoupons.push({
        _id: coupon._id,
        code: coupon.code,
        title: coupon.title,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        minAmount: coupon.minAmount,
        maxDiscount: coupon.maxDiscount,
        validFrom: coupon.validFrom,
        validUntil: coupon.validUntil,
        usageLimit: coupon.usageLimit,
        userLimit: coupon.userLimit,
        applicableCategories: coupon.applicableCategories,
        applicableDurations: coupon.applicableDurations,
        isActive: coupon.isActive,
        usageCount: coupon.usageCount
      });
    }

    res.json({
      success: true,
      data: availableCoupons
    });
  } catch (error) {
    next(error);
  }
};

