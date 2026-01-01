const Settings = require('../models/Settings');

// Get Public Settings (No Auth Required)
exports.getPublicSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    
    res.json({
      success: true,
      data: {
        instantPaymentDiscount: settings.instantPaymentDiscount,
        advancePaymentDiscount: settings.advancePaymentDiscount,
        advancePaymentAmount: settings.advancePaymentAmount || 500
      }
    });
  } catch (error) {
    console.error('Error fetching public settings:', error);
    // Return default if error (frontend will use this as fallback)
    res.json({
      success: true,
      data: {
        instantPaymentDiscount: 10,
        advancePaymentDiscount: 5,
        advancePaymentAmount: 500
      }
    });
  }
};

// Get Settings (Admin)
exports.getSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    
    res.json({
      success: true,
      data: {
        instantPaymentDiscount: settings.instantPaymentDiscount,
        advancePaymentDiscount: settings.advancePaymentDiscount,
        advancePaymentAmount: settings.advancePaymentAmount || 500,
        updatedAt: settings.updatedAt,
        updatedBy: settings.updatedBy
      }
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
};

// Update Settings (Admin)
exports.updateSettings = async (req, res, next) => {
  try {
    const { instantPaymentDiscount, advancePaymentDiscount, advancePaymentAmount } = req.body;

    // Build update object (only include fields that are provided - partial updates)
    const updateData = {};

    if (instantPaymentDiscount !== undefined && instantPaymentDiscount !== null) {
      const discount = parseFloat(instantPaymentDiscount);
      if (isNaN(discount) || discount < 0 || discount > 100) {
        return res.status(400).json({
          success: false,
          message: 'instantPaymentDiscount must be a number between 0 and 100',
          error: 'VALIDATION_ERROR'
        });
      }
      updateData.instantPaymentDiscount = discount;
    }

    if (advancePaymentDiscount !== undefined && advancePaymentDiscount !== null) {
      const discount = parseFloat(advancePaymentDiscount);
      if (isNaN(discount) || discount < 0 || discount > 100) {
        return res.status(400).json({
          success: false,
          message: 'advancePaymentDiscount must be a number between 0 and 100',
          error: 'VALIDATION_ERROR'
        });
      }
      updateData.advancePaymentDiscount = discount;
    }

    if (advancePaymentAmount !== undefined && advancePaymentAmount !== null) {
      const amount = parseFloat(advancePaymentAmount);
      if (isNaN(amount) || amount < 1) {
        return res.status(400).json({
          success: false,
          message: 'advancePaymentAmount must be a positive number (minimum 1)',
          error: 'VALIDATION_ERROR'
        });
      }
      // Optional: Set reasonable upper limit (e.g., 10000)
      if (amount > 10000) {
        return res.status(400).json({
          success: false,
          message: 'advancePaymentAmount must be less than or equal to 10000',
          error: 'VALIDATION_ERROR'
        });
      }
      updateData.advancePaymentAmount = amount;
    }

    // At least one field must be provided
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one settings field must be provided',
        error: 'VALIDATION_ERROR'
      });
    }

    // Get admin user ID from request (set by auth middleware)
    const updatedBy = req.user?._id || req.user?.id || null;

    // Update or create settings
    const settings = await Settings.updateSettings(updateData, updatedBy);

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        instantPaymentDiscount: settings.instantPaymentDiscount,
        advancePaymentDiscount: settings.advancePaymentDiscount,
        advancePaymentAmount: settings.advancePaymentAmount || 500,
        updatedAt: settings.updatedAt,
        updatedBy: settings.updatedBy
      }
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
};

