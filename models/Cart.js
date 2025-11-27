const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required'],
    index: true
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1
  },
  selectedTenure: {
    type: String,
    enum: ['3', '6', '9', '11', 'monthly'],
    required: [true, 'Tenure is required']
  }
}, {
  timestamps: true
});

// Prevent duplicate cart items
cartSchema.index({ userId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('Cart', cartSchema);

