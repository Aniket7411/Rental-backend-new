const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: function() {
      // Email is required if password is provided (for email/password auth)
      return !!this.password;
    },
    unique: true,
    sparse: true, // Allow multiple null values
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
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
  resetPasswordExpire: Date
}, {
  timestamps: true
});

// Hash password before saving (only if password is provided)
userSchema.pre('save', async function (next) {
  // If password is provided, email must also be provided
  if (this.password && !this.email) {
    return next(new Error('Email is required when password is provided'));
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

