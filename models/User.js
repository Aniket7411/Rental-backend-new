const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false, // Optional for guest checkout (can be set later)
    trim: true,
    default: ''
  },
  email: {
    type: String,
    required: false, // Email is optional (required only if password is provided)
    unique: true,
    sparse: true, // Allow multiple null values - only unique if email exists
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        // Only validate format if email is provided
        if (!v || v === '') return true; // Allow null/empty
        return /^\S+@\S+\.\S+$/.test(v); // Validate format if provided
      },
      message: 'Please provide a valid email address'
    },
    index: true
  },
  password: {
    type: String,
    required: false, // Password is now optional (for OTP-based auth)
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  phone: {
    type: String,
    required: [true, 'Phone is required'],
    unique: true, // Phone is now unique and primary identifier
    trim: true,
    validate: {
      validator: function (v) {
        return /^\d{10,}$/.test(v.replace(/\D/g, ''));
      },
      message: 'Phone must contain at least 10 digits'
    },
    index: true
  },
  homeAddress: {
    type: String,
    trim: true,
    default: ''
  },
  pincode: {
    type: String,
    trim: true,
    default: ''
  },
  nearLandmark: {
    type: String,
    trim: true,
    default: ''
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
  interestedIn: {
    type: [String],
    enum: ['AC', 'Refrigerator', 'Washing Machine'],
    default: []
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'vendor'],
    default: 'user',
    index: true // Indexed for efficient queries
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  // Guest checkout tracking (optional)
  isGuestCheckout: {
    type: Boolean,
    default: false,
    description: 'Indicates if user was created via guest checkout'
  },
  guestCheckoutDate: {
    type: Date,
    description: 'Date when user was created via guest checkout'
  }
}, {
  timestamps: true
});

// Hash password before saving (only if password is provided)
userSchema.pre('save', async function (next) {
  // If password is provided, email must also be provided (for email/password auth)
  if (this.password && !this.email) {
    return next(new Error('Email is required when password is provided'));
  }
  
  // Set default name if not provided (for guest checkout)
  if (!this.name || this.name.trim() === '') {
    this.name = 'Guest User';
  }
  
  // Normalize email if provided (lowercase, trim)
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
    // If email becomes empty after trimming, set to undefined
    if (this.email === '') {
      this.email = undefined;
    }
  } else {
    this.email = undefined; // Ensure null emails are stored as undefined for sparse index
  }
  
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

