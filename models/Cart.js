const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  type: {
    type: String,
    enum: ['rental', 'service'],
    required: [true, 'Cart item type is required']
  },
  // For rental items
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    index: true
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1
  },
  paymentOption: {
    type: String,
    enum: ['payNow', 'payLater'],
    default: 'payLater'
  },
  // For service items
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    index: true
  },
  serviceTitle: String,
  servicePrice: Number,
  bookingDetails: {
    date: String, // YYYY-MM-DD format
    time: {
      type: String,
      enum: ['10-12', '12-2', '2-4', '4-6', '6-8']
    },
    address: String,
    addressType: {
      type: String,
      enum: ['myself', 'someoneElse']
    },
    contactName: String,
    contactPhone: String,
    paymentOption: {
      type: String,
      enum: ['payNow', 'payLater']
    }
  }
}, {
  timestamps: true
});

// Prevent duplicate cart items - different indexes for rentals and services
cartSchema.index({ userId: 1, productId: 1, type: 1 }, {
  unique: true,
  partialFilterExpression: { type: 'rental' }
});
cartSchema.index({ userId: 1, serviceId: 1, type: 1 }, {
  unique: true,
  partialFilterExpression: { type: 'service' }
});

module.exports = mongoose.model('Cart', cartSchema);

