const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  items: [{
    type: {
      type: String,
      enum: ['rental', 'service'],
      required: true
    },
    // For rental items
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    product: {
      type: Object // Product snapshot
    },
    quantity: {
      type: Number,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    duration: {
      type: Number,
      enum: [3, 6, 9, 11]
      // Duration is required for rental items (validated in controller)
    },
    // For service items
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service'
    },
    service: {
      type: Object // Service snapshot
    },
    bookingDetails: {
      date: String,
      time: String,
      address: String,
      addressType: String,
      contactName: String,
      contactPhone: String
    }
  }],
  total: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  finalTotal: {
    type: Number,
    required: [true, 'Final total is required'],
    min: 0
  },
  paymentOption: {
    type: String,
    enum: ['payNow', 'payLater'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'pending'],
    default: 'pending'
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  shippingAddress: {
    type: String,
    trim: true
  },
  billingAddress: {
    type: String,
    trim: true
  },
  paymentDetails: {
    paymentId: String,
    transactionId: String,
    gateway: String,
    paidAt: Date
  }
}, {
  timestamps: true
});

// Generate order ID before saving
orderSchema.pre('save', async function (next) {
  if (!this.orderId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Order').countDocuments({});
    this.orderId = `ORD-${year}-${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);

