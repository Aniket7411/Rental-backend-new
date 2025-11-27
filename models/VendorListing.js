const mongoose = require('mongoose');

const vendorListingSchema = new mongoose.Schema({
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
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  message: {
    type: String,
    trim: true
    // Optional
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('VendorListing', vendorListingSchema);

