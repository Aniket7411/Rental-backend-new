const mongoose = require('mongoose');

const serviceBookingSchema = new mongoose.Schema({
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
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  preferredDate: {
    type: String,
    trim: true
    // Optional
  },
  preferredTime: {
    type: String,
    trim: true
    // Optional
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
    enum: ['New', 'Contacted', 'In-Progress', 'Resolved', 'Rejected'],
    default: 'New'
  }
}, {
  timestamps: true
});

// Index for better query performance
serviceBookingSchema.index({ status: 1 });
serviceBookingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ServiceBooking', serviceBookingSchema);

