const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
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
  source: {
    type: String,
    trim: true
    // Optional - "browse", "home", "contact"
  },
  message: {
    type: String,
    trim: true
    // Optional
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Lead', leadSchema);

