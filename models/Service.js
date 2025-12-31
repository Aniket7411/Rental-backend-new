const mongoose = require('mongoose');
const { SERVICE_CATEGORIES } = require('../utils/serviceConstants');

const serviceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price must be positive']
  },
  originalPrice: {
    type: Number,
    min: [0, 'Original price must be positive']
  },
  badge: {
    type: String,
    enum: [
      'Visit within 1 hour',
      'Visit within 2 hours',
      'Visit within 3 hours',
      'Same Day Visit',
      'Most Booked',
      'Power Saver',
      null
    ],
    default: null
  },
  image: {
    type: String,
    trim: true
  },
  process: {
    type: [String],
    default: []
  },
  benefits: {
    type: [String],
    default: []
  },
  keyFeatures: {
    type: [String],
    default: []
  },
  recommendedFrequency: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: SERVICE_CATEGORIES,
    required: false, // Optional for backward compatibility
    index: true, // For efficient filtering
    default: null // Default to null for uncategorized services
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Service', serviceSchema);

