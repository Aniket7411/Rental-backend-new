const mongoose = require('mongoose');
const { roundMoney } = require('../utils/money');

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    unique: true,
    required: false, // Auto-generated in pre-save hook
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order ID is required'],
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: 0,
    set: (v) => roundMoney(v),
    get: (v) => roundMoney(v)
  },
  currency: {
    type: String,
    default: 'INR'
  },
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'stripe', 'paypal', 'full', 'advance'],
    default: 'razorpay'
  },
  paymentGateway: {
    type: String,
    trim: true
  },
  gatewayOrderId: {
    type: String,
    trim: true
  },
  transactionId: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
    default: 'Pending'
  },
  signature: {
    type: String,
    trim: true
  },
  paidAt: Date,
  razorpayPaymentId: {
    type: String,
    trim: true,
    index: true
  },
  refundId: {
    type: String,
    required: false
  },
  refundStatus: {
    type: String,
    enum: ['processed', 'pending', 'failed', null],
    default: null
  },
  refundAmount: {
    type: Number,
    required: false,
    min: 0,
    set: (v) => v !== null && v !== undefined ? roundMoney(v) : null,
    get: (v) => v !== null && v !== undefined ? roundMoney(v) : null
  },
  refundedAt: {
    type: Date,
    required: false
  }
}, {
  timestamps: true
});

// Generate payment ID before saving and ensure amount is rounded
paymentSchema.pre('save', async function (next) {
  if (!this.paymentId) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    this.paymentId = `PAY-${timestamp}-${random}`;
  }
  
  // Ensure amount is rounded to 2 decimal places
  if (this.amount !== undefined && this.amount !== null) {
    this.amount = roundMoney(this.amount);
  }
  
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);

