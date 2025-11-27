const mongoose = require('mongoose');

const acSchema = new mongoose.Schema({
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true
  },
  model: {
    type: String,
    required: [true, 'Model is required'],
    trim: true
  },
  capacity: {
    type: String,
    required: [true, 'Capacity is required'],
    // Accept free-form capacity like "1.5 Ton" per spec
  },
  type: {
    type: String,
    required: [true, 'Type is required'],
    enum: ['Split', 'Window']
  },
  description: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  price: {
    monthly: {
      type: Number,
      required: [true, 'Monthly price is required'],
      min: [0, 'Price must be positive']
    },
    quarterly: {
      type: Number,
      required: [true, 'Quarterly price is required'],
      min: [0, 'Price must be positive']
    },
    yearly: {
      type: Number,
      required: [true, 'Yearly price is required'],
      min: [0, 'Price must be positive']
    }
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['Available', 'Rented Out', 'Under Maintenance'],
    default: 'Available'
  },
  images: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

// Index for search functionality
acSchema.index({ brand: 'text', model: 'text', location: 'text', description: 'text' });

module.exports = mongoose.model('AC', acSchema);

