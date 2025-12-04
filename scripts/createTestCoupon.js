const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Coupon = require('../models/Coupon');

// Load environment variables
dotenv.config();

// Create test coupon
const createTestCoupon = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coolrentals', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Check if coupon already exists
    const existingCoupon = await Coupon.findOne({ code: 'TEST20' });
    if (existingCoupon) {
      console.log('Test coupon already exists. Updating it...');
      existingCoupon.isActive = true;
      existingCoupon.validFrom = new Date();
      existingCoupon.validUntil = null; // No expiration
      existingCoupon.usageLimit = null; // Unlimited
      existingCoupon.userLimit = null; // Unlimited
      await existingCoupon.save();
      console.log('Test coupon updated successfully!');
      process.exit(0);
    }

    // Create test coupon
    const coupon = await Coupon.create({
      code: 'TEST20',
      title: 'Test Coupon',
      description: '20% off on all rentals',
      type: 'percentage',
      value: 20,
      minAmount: 0,
      maxDiscount: null,
      validFrom: new Date(), // Starts now
      validUntil: null, // No expiration
      usageLimit: null, // Unlimited
      userLimit: null, // Unlimited
      applicableCategories: [], // All categories
      applicableDurations: [], // All durations
      isActive: true
    });

    console.log('Test coupon created successfully!');
    console.log('Code:', coupon.code);
    console.log('Title:', coupon.title);
    console.log('Active:', coupon.isActive);
    console.log('Valid from:', coupon.validFrom);
    console.log('Valid until:', coupon.validUntil || 'No expiration');

    process.exit(0);
  } catch (error) {
    console.error('Error creating test coupon:', error);
    process.exit(1);
  }
};

createTestCoupon();

