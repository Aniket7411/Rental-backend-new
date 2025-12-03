const Coupon = require('../models/Coupon');
const CouponUsage = require('../models/CouponUsage');

// Get All Coupons (Admin)
exports.getAllCoupons = async (req, res, next) => {
  try {
    const { isActive, page = 1, limit = 20 } = req.query;
    const query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [coupons, total] = await Promise.all([
      Coupon.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Coupon.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: coupons,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get Coupon by ID (Admin)
exports.getCouponById = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
        error: 'NOT_FOUND'
      });
    }

    // Get usage statistics
    const usageStats = await CouponUsage.aggregate([
      { $match: { couponId: coupon._id } },
      {
        $group: {
          _id: null,
          totalUsage: { $sum: 1 },
          totalDiscount: { $sum: '$discountAmount' }
        }
      }
    ]);

    const stats = usageStats[0] || { totalUsage: 0, totalDiscount: 0 };

    res.json({
      success: true,
      data: {
        ...coupon.toObject(),
        statistics: {
          totalUsage: stats.totalUsage,
          totalDiscount: stats.totalDiscount,
          remainingUsage: coupon.usageLimit ? coupon.usageLimit - coupon.usageCount : null
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create Coupon (Admin)
exports.createCoupon = async (req, res, next) => {
  try {
    const {
      code,
      title,
      description,
      type,
      value,
      minAmount,
      maxDiscount,
      validFrom,
      validUntil,
      usageLimit,
      userLimit,
      applicableCategories,
      applicableDurations,
      isActive = true
    } = req.body;

    // Validate required fields
    if (!code || !title || !type || value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Code, title, type, and value are required',
        error: 'VALIDATION_ERROR'
      });
    }

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code already exists',
        error: 'DUPLICATE_CODE'
      });
    }

    // Validate dates
    if (validFrom && validUntil && new Date(validFrom) > new Date(validUntil)) {
      return res.status(400).json({
        success: false,
        message: 'Valid from date must be before or equal to valid until date',
        error: 'VALIDATION_ERROR'
      });
    }

    // Validate type-specific values
    if (type === 'percentage' && (value < 0 || value > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Percentage value must be between 0 and 100',
        error: 'VALIDATION_ERROR'
      });
    }

    if (type === 'fixed' && value < 0) {
      return res.status(400).json({
        success: false,
        message: 'Fixed value must be positive',
        error: 'VALIDATION_ERROR'
      });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      title,
      description: description || '',
      type,
      value,
      minAmount: minAmount || 0,
      maxDiscount: maxDiscount || null,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : new Date(),
      usageLimit: usageLimit || null,
      userLimit: userLimit || null,
      applicableCategories: applicableCategories || [],
      applicableDurations: applicableDurations || [],
      isActive
    });

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: coupon
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code already exists',
        error: 'DUPLICATE_CODE'
      });
    }
    next(error);
  }
};

// Update Coupon (Admin)
exports.updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
        error: 'NOT_FOUND'
      });
    }

    const {
      title,
      description,
      type,
      value,
      minAmount,
      maxDiscount,
      validFrom,
      validUntil,
      usageLimit,
      userLimit,
      applicableCategories,
      applicableDurations,
      isActive
    } = req.body;

    // Update fields if provided
    if (title !== undefined) coupon.title = title;
    if (description !== undefined) coupon.description = description;
    if (type !== undefined) coupon.type = type;
    if (value !== undefined) coupon.value = value;
    if (minAmount !== undefined) coupon.minAmount = minAmount;
    if (maxDiscount !== undefined) coupon.maxDiscount = maxDiscount;
    if (validFrom !== undefined) coupon.validFrom = new Date(validFrom);
    if (validUntil !== undefined) coupon.validUntil = new Date(validUntil);
    if (usageLimit !== undefined) coupon.usageLimit = usageLimit;
    if (userLimit !== undefined) coupon.userLimit = userLimit;
    if (applicableCategories !== undefined) coupon.applicableCategories = applicableCategories;
    if (applicableDurations !== undefined) coupon.applicableDurations = applicableDurations;
    if (isActive !== undefined) coupon.isActive = isActive;

    // Validate dates
    if (coupon.validFrom > coupon.validUntil) {
      return res.status(400).json({
        success: false,
        message: 'Valid from date must be before or equal to valid until date',
        error: 'VALIDATION_ERROR'
      });
    }

    await coupon.save();

    res.json({
      success: true,
      message: 'Coupon updated successfully',
      data: coupon
    });
  } catch (error) {
    next(error);
  }
};

// Deactivate Coupon (Admin)
exports.deactivateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
        error: 'NOT_FOUND'
      });
    }

    coupon.isActive = false;
    await coupon.save();

    res.json({
      success: true,
      message: 'Coupon deactivated successfully',
      data: coupon
    });
  } catch (error) {
    next(error);
  }
};

// Get Coupon Usage Statistics (Admin)
exports.getCouponUsageStats = async (req, res, next) => {
  try {
    const couponId = req.params.id;

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
        error: 'NOT_FOUND'
      });
    }

    const stats = await CouponUsage.aggregate([
      { $match: { couponId: coupon._id } },
      {
        $group: {
          _id: null,
          totalUsage: { $sum: 1 },
          totalDiscount: { $sum: '$discountAmount' },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          totalUsage: 1,
          totalDiscount: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      }
    ]);

    const result = stats[0] || {
      totalUsage: 0,
      totalDiscount: 0,
      uniqueUsers: 0
    };

    res.json({
      success: true,
      data: {
        coupon: {
          code: coupon.code,
          title: coupon.title,
          usageCount: coupon.usageCount,
          usageLimit: coupon.usageLimit
        },
        statistics: result
      }
    });
  } catch (error) {
    next(error);
  }
};

