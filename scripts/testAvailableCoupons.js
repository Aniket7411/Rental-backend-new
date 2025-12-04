const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Coupon = require('../models/Coupon');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coolrentals')
  .then(async () => {
    const now = new Date();
    const query = {
      isActive: true,
      validFrom: { $lte: now },
      $or: [
        { validUntil: null },
        { validUntil: { $gte: now } }
      ]
    };
    const coupons = await Coupon.find(query);
    console.log('Available coupons found:', coupons.length);
    coupons.forEach(c => {
      console.log(`- ${c.code} - Active: ${c.isActive} - Valid from: ${c.validFrom}`);
    });
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });

