const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['AC', 'Refrigerator', 'Washing Machine'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true,
    index: true
  },
  model: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Type is required'],
    trim: true
    // For AC: "Split" | "Window" etc.
    // For Refrigerator: "Single Door" | "Double Door" etc.
    // For Washing Machine: "Top Load" | "Front Load" etc.
  },
  capacity: {
    type: String,
    required: [true, 'Capacity is required'],
    trim: true
    // For AC: "1 Ton" | "1.5 Ton" | "2 Ton" | "2.5 Ton"
    // For Refrigerator: "190 L" | "210 L" | "240 L" | "280 L" | "300 L+"
    // For Washing Machine: "5.8 kg" | "6.5 kg" | "7 kg" | "8 kg" | "10 kg+"
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
    index: true
  },
  price: {
    3: {
      type: Number,
      required: [true, '3 months price is required']
    },
    6: {
      type: Number,
      required: [true, '6 months price is required']
    },
    9: {
      type: Number,
      required: [true, '9 months price is required']
    },
    11: {
      type: Number,
      required: [true, '11 months price is required']
    }
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  images: {
    type: [String],
    required: [true, 'At least one image is required'],
    validate: {
      validator: function (v) {
        return v && v.length > 0;
      },
      message: 'At least one image is required'
    }
  },
  features: {
    specs: {
      type: [String],
      default: []
    },
    dimensions: String,
    safety: {
      type: [String],
      default: []
    }
  },
  // Category-specific fields
  energyRating: {
    type: String,
    // For Refrigerator: "2 Star" | "3 Star" | "4 Star" | "5 Star"
  },
  operationType: {
    type: String,
    // For Washing Machine: "Automatic" | "Semi-Automatic"
  },
  loadType: {
    type: String,
    // For Washing Machine: "Top Load" | "Front Load"
  },
  reviews: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  condition: {
    type: String,
    enum: ['New', 'Refurbished'],
    default: 'New'
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  status: {
    type: String,
    enum: ['Available', 'Rented Out', 'Under Maintenance'],
    default: 'Available',
    index: true
  },
  installationCharges: {
    amount: {
      type: Number,
      default: 0,
      min: 0
    },
    includedItems: [{
      type: String,
      trim: true
    }],
    extraMaterialRates: {
      copperPipe: {
        type: Number,
        default: 0,
        min: 0
      },
      drainPipe: {
        type: Number,
        default: 0,
        min: 0
      },
      electricWire: {
        type: Number,
        default: 0,
        min: 0
      }
    }
  }
}, {
  timestamps: true
});

// Index for search functionality
productSchema.index({ name: 'text', brand: 'text', model: 'text', location: 'text' });

// Calculate average rating before saving
productSchema.pre('save', function (next) {
  if (this.reviews && this.reviews.length > 0) {
    const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
    this.averageRating = sum / this.reviews.length;
    this.totalReviews = this.reviews.length;
  }
  next();
});

// Validate installationCharges - only allowed for AC category
productSchema.pre('save', function (next) {
  // Only allow installationCharges for AC category
  if (this.category !== 'AC' && this.installationCharges) {
    // Remove installationCharges for non-AC products
    this.installationCharges = undefined;
  }
  // If installationCharges amount is 0 or not provided, set to default structure
  if (this.category === 'AC' && this.installationCharges) {
    if (!this.installationCharges.amount || this.installationCharges.amount === 0) {
      this.installationCharges = {
        amount: 0,
        includedItems: this.installationCharges.includedItems || [],
        extraMaterialRates: {
          copperPipe: this.installationCharges.extraMaterialRates?.copperPipe || 0,
          drainPipe: this.installationCharges.extraMaterialRates?.drainPipe || 0,
          electricWire: this.installationCharges.extraMaterialRates?.electricWire || 0
        }
      };
    }
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);

