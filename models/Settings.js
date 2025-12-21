const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  instantPaymentDiscount: {
    type: Number,
    default: 10,
    min: 0,
    max: 100,
    required: true
  },
  advancePaymentDiscount: {
    type: Number,
    default: 5,
    min: 0,
    max: 100,
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists (singleton pattern)
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({ 
      instantPaymentDiscount: 10,
      advancePaymentDiscount: 5
    });
  }
  return settings;
};

// Update settings (upsert)
settingsSchema.statics.updateSettings = async function(data, updatedBy) {
  const settings = await this.findOneAndUpdate(
    {},
    {
      ...data,
      updatedBy: updatedBy || null,
      updatedAt: new Date()
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);

