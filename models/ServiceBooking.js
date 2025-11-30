const mongoose = require('mongoose');

const serviceBookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    unique: true,
    index: true
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Service ID is required']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Optional for guest bookings
  },
  serviceTitle: {
    type: String,
    required: [true, 'Service title is required'],
    trim: true
  },
  servicePrice: {
    type: Number,
    required: [true, 'Service price is required'],
    min: [0, 'Service price must be positive']
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone is required'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    // Optional
  },
  date: {
    type: String,
    required: [true, 'Date is required'],
    trim: true,
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    validate: {
      validator: function (value) {
        const bookingDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        bookingDate.setHours(0, 0, 0, 0);
        return bookingDate > today;
      },
      message: 'Booking date must be in the future'
    }
  },
  time: {
    type: String,
    required: [true, 'Time slot is required'],
    enum: {
      values: ['10-12', '12-2', '2-4', '4-6', '6-8'],
      message: 'Invalid time slot. Valid slots are: 10-12, 12-2, 2-4, 4-6, 6-8'
    }
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    minlength: [10, 'Address must be at least 10 characters long']
  },
  nearLandmark: {
    type: String,
    trim: true,
    default: ''
  },
  pincode: {
    type: String,
    trim: true,
    default: '',
    validate: {
      validator: function (v) {
        if (!v) return true; // Optional field
        return /^\d{6}$/.test(v);
      },
      message: 'Pincode must be 6 digits'
    }
  },
  alternateNumber: {
    type: String,
    trim: true,
    default: '',
    validate: {
      validator: function (v) {
        if (!v) return true; // Optional field
        return /^\d{10,}$/.test(v.replace(/\D/g, ''));
      },
      message: 'Alternate number must contain at least 10 digits'
    }
  },
  addressType: {
    type: String,
    required: [true, 'Address type is required'],
    enum: {
      values: ['myself', 'other'],
      message: 'Address type must be either "myself" or "other"'
    }
  },
  contactName: {
    type: String,
    trim: true,
    default: ''
  },
  contactPhone: {
    type: String,
    trim: true,
    default: ''
  },
  paymentOption: {
    type: String,
    required: [true, 'Payment option is required'],
    enum: {
      values: ['payNow', 'payLater'],
      message: 'Payment option must be either "payNow" or "payLater"'
    }
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'pending'],
    default: 'pending'
  },
  description: {
    type: String,
    trim: true
    // Optional
  },
  images: {
    type: [String],
    default: []
    // Optional - Cloudinary URLs for issue images
  },
  status: {
    type: String,
    enum: ['New', 'Contacted', 'In-Progress', 'Resolved', 'Rejected', 'Cancelled'],
    default: 'New'
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  }
}, {
  timestamps: true
});

// Generate booking ID before saving
serviceBookingSchema.pre('save', async function (next) {
  if (!this.bookingId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('ServiceBooking').countDocuments({});
    this.bookingId = `SB-${year}-${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

// Index for better query performance
serviceBookingSchema.index({ status: 1 });
serviceBookingSchema.index({ createdAt: -1 });
serviceBookingSchema.index({ date: 1 });
serviceBookingSchema.index({ time: 1 });
serviceBookingSchema.index({ serviceId: 1 });

module.exports = mongoose.model('ServiceBooking', serviceBookingSchema);

