const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^\+91[0-9]{10}$/, 'Phone number must be 10 digits with +91 prefix'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    default: ''
  },
  interest: {
    type: String,
    required: [true, 'Interest type is required'],
    enum: {
      values: ['rental', 'service'],
      message: 'Interest must be either "rental" or "service"'
    }
  },
  source: {
    type: String,
    required: [true, 'Source is required'],
    enum: {
      values: ['browse', 'contact'],
      message: 'Source must be either "browse" or "contact"'
    }
  },
  status: {
    type: String,
    enum: ['New', 'Contacted', 'In-Progress', 'Resolved', 'Closed'],
    default: 'New'
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    default: ''
  },
  contactedAt: {
    type: Date,
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  collection: 'callback_leads'
});

// Indexes for better query performance
leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ interest: 1, createdAt: -1 });
leadSchema.index({ source: 1, createdAt: -1 });
leadSchema.index({ phone: 1 });

module.exports = mongoose.model('Lead', leadSchema);

