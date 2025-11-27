const mongoose = require('mongoose');

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
    enum: ['Visit Within 1 Hour', 'Most Booked', 'Power Saver', null],
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
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Service', serviceSchema);

