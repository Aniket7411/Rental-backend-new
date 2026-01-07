const mongoose = require('mongoose');
const { roundMoney } = require('../utils/money');

const refundSchema = new mongoose.Schema({
  refundId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  razorpayRefundId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true,
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
    set: (v) => roundMoney(v),
    get: (v) => roundMoney(v)
  },
  amountInPaise: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['processed', 'pending', 'failed'],
    default: 'pending',
    index: true
  },
  reason: {
    type: String,
    trim: true
  },
  processedAt: {
    type: Date,
    default: Date.now
  },
  razorpayRefundData: {
    type: mongoose.Schema.Types.Mixed
  },
  error: {
    type: String
  }
}, {
  timestamps: true
});

// Ensure amount is rounded before saving
refundSchema.pre('save', async function (next) {
  if (this.amount !== undefined && this.amount !== null) {
    this.amount = roundMoney(this.amount);
  }
  next();
});

module.exports = mongoose.model('Refund', refundSchema);

