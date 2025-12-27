const mongoose = require('mongoose');
const { roundMoney } = require('../utils/money');

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
      type: Object // Product snapshot (backward compatibility)
    },
    productDetails: {
      type: Object // Complete product details from frontend
    },
    deliveryInfo: {
      type: Object // Delivery information for rental items
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
      enum: [3, 6, 9, 11, 12, 24]
      // Duration is required for rental items (validated in controller)
      // Valid values: 3, 6, 9, 11, 12, 24 months (same for both payment types)
    },
    isMonthlyPayment: {
      type: Boolean,
      default: false
    },
    monthlyPrice: {
      type: Number,
      default: null
    },
    monthlyTenure: {
      type: Number,
      default: null,
      // Valid values: 3, 6, 9, 11, 12, 24
      enum: [3, 6, 9, 11, 12, 24],
      validate: {
        validator: function(value) {
          if (this.isMonthlyPayment) {
            return [3, 6, 9, 11, 12, 24].includes(value);
          }
          return true;
        },
        message: 'Monthly tenure must be one of: 3, 6, 9, 11, 12, 24 months'
      }
    },
    securityDeposit: {
      type: Number,
      default: null,
      min: 0
    },
    // For service items
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service'
    },
    service: {
      type: Object // Service snapshot (backward compatibility)
    },
    serviceDetails: {
      type: Object // Complete service details from frontend
    },
    bookingDetails: {
      type: Object // Complete booking details for service items
    }
  }],
  total: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: 0,
    set: (v) => roundMoney(v),
    get: (v) => roundMoney(v)
  },
  productDiscount: {
    type: Number,
    default: 0,
    min: 0,
    set: (v) => roundMoney(v),
    get: (v) => roundMoney(v)
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    set: (v) => roundMoney(v),
    get: (v) => roundMoney(v)
  },
  couponCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  couponDiscount: {
    type: Number,
    default: 0,
    min: 0,
    set: (v) => roundMoney(v),
    get: (v) => roundMoney(v)
  },
  paymentDiscount: {
    type: Number,
    default: 0,
    min: 0,
    set: (v) => roundMoney(v),
    get: (v) => roundMoney(v)
  },
  finalTotal: {
    type: Number,
    required: [true, 'Final total is required'],
    min: 0,
    set: (v) => roundMoney(v),
    get: (v) => roundMoney(v)
  },
  paymentOption: {
    type: String,
    enum: ['payNow', 'payLater', 'payAdvance'],
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
  customerInfo: {
    type: Object // Complete customer information
  },
  deliveryAddresses: [{
    type: Object // Array of delivery addresses
  }],
  notes: {
    type: String,
    trim: true
  },
  orderDate: {
    type: Date
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
  },
  cancellationReason: {
    type: String,
    trim: true
  },
  cancelledAt: {
    type: Date
  },
  cancelledBy: {
    type: String,
    enum: ['user', 'admin']
  }
}, {
  timestamps: true
});

// Order ID is provided by frontend, no auto-generation needed
// If orderId is not provided (backward compatibility), generate it
orderSchema.pre('save', async function (next) {
  if (!this.orderId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Order').countDocuments({});
    this.orderId = `ORD-${year}-${String(count + 1).padStart(3, '0')}`;
  }
  
  // Ensure all monetary fields are rounded to 2 decimal places
  this.total = roundMoney(this.total);
  this.productDiscount = roundMoney(this.productDiscount || 0);
  this.discount = roundMoney(this.discount || 0);
  this.couponDiscount = roundMoney(this.couponDiscount || 0);
  this.paymentDiscount = roundMoney(this.paymentDiscount || 0);
  this.finalTotal = roundMoney(this.finalTotal);
  
  // Round monetary fields in items array
  if (this.items && Array.isArray(this.items)) {
    this.items.forEach(item => {
      if (item.price !== undefined) {
        item.price = roundMoney(item.price);
      }
      if (item.monthlyPrice !== undefined && item.monthlyPrice !== null) {
        item.monthlyPrice = roundMoney(item.monthlyPrice);
      }
      if (item.securityDeposit !== undefined && item.securityDeposit !== null) {
        item.securityDeposit = roundMoney(item.securityDeposit);
      }
      if (item.installationCharges && item.installationCharges.amount !== undefined) {
        item.installationCharges.amount = roundMoney(item.installationCharges.amount);
      }
    });
  }
  
  next();
});

module.exports = mongoose.model('Order', orderSchema);

