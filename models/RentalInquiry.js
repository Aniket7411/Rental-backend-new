const mongoose = require('mongoose');

const rentalInquirySchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required']
  },
  acId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    // Optional for backward compatibility
  },
  productCategory: {
    type: String,
    enum: ['AC', 'Refrigerator', 'Washing Machine'],
    default: 'AC'
  },
  acDetails: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    brand: {
      type: String,
      required: true
    },
    model: {
      type: String,
      default: ''
    },
    capacity: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    location: {
      type: String,
      required: true
    },
    price: {
      type: Object,
      required: true
    }
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone is required'],
    trim: true
  },
  message: {
    type: String,
    trim: true,
    default: ''
  },
  duration: {
    type: String,
    enum: ['Monthly', 'Quarterly', 'Yearly'],
    default: 'Monthly'
  },
  status: {
    type: String,
    enum: ['New', 'Contacted', 'In-Progress', 'Resolved', 'Rejected'],
    default: 'New'
  }
}, {
  timestamps: true
});

// Index for better query performance
rentalInquirySchema.index({ productCategory: 1 });
rentalInquirySchema.index({ status: 1 });
rentalInquirySchema.index({ createdAt: -1 });

module.exports = mongoose.model('RentalInquiry', rentalInquirySchema);

