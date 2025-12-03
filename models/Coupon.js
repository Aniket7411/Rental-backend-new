const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9_-]{6,20}$/, 'Coupon code must be 6-20 characters, alphanumeric with hyphens/underscores only']
  },
  title: {
    type: String,
    required: [true, 'Coupon title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  type: {
    type: String,
    required: [true, 'Coupon type is required'],
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  value: {
    type: Number,
    required: [true, 'Coupon value is required'],
    min: [0, 'Coupon value must be positive']
  },
  minAmount: {
    type: Number,
    default: 0,
    min: [0, 'Minimum amount must be positive']
  },
  maxDiscount: {
    type: Number,
    default: null,
    min: [0, 'Maximum discount must be positive']
  },
  validFrom: {
    type: Date,
    required: [true, 'Valid from date is required']
  },
  validUntil: {
    type: Date,
    required: [true, 'Valid until date is required']
  },
  usageLimit: {
    type: Number,
    default: null,
    min: [0, 'Usage limit must be positive']
  },
  usageCount: {
    type: Number,
    default: 0,
    min: [0, 'Usage count cannot be negative']
  },
  userLimit: {
    type: Number,
    default: null,
    min: [1, 'User limit must be at least 1']
  },
  applicableCategories: [{
    type: String,
    enum: ['AC', 'Refrigerator', 'Washing Machine']
  }],
  applicableDurations: [{
    type: Number,
    enum: [3, 6, 9, 11, 12, 24]
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Index for faster lookups
couponSchema.index({ code: 1, isActive: 1 });
couponSchema.index({ validFrom: 1, validUntil: 1 });

// Validation: validFrom must be <= validUntil
couponSchema.pre('save', function(next) {
  if (this.validFrom && this.validUntil && this.validFrom > this.validUntil) {
    return next(new Error('Valid from date must be before or equal to valid until date'));
  }
  next();
});

module.exports = mongoose.model('Coupon', couponSchema);

