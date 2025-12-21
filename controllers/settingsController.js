const Settings = require('../models/Settings');

// Get Public Settings (No Auth Required)
exports.getPublicSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    
    res.json({
      success: true,
      data: {
        instantPaymentDiscount: settings.instantPaymentDiscount
      }
    });
  } catch (error) {
    console.error('Error fetching public settings:', error);
    // Return default if error (frontend will use this as fallback)
    res.json({
      success: true,
      data: {
        instantPaymentDiscount: 10
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
    const { instantPaymentDiscount } = req.body;

    // Validation
    if (instantPaymentDiscount === undefined || instantPaymentDiscount === null) {
      return res.status(400).json({
        success: false,
        message: 'instantPaymentDiscount is required',
        error: 'VALIDATION_ERROR'
      });
    }

    const discount = parseFloat(instantPaymentDiscount);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      return res.status(400).json({
        success: false,
        message: 'instantPaymentDiscount must be a number between 0 and 100',
        error: 'VALIDATION_ERROR'
      });
    }

    // Get admin user ID from request (set by auth middleware)
    const updatedBy = req.user?._id || req.user?.id || null;

    // Update or create settings
    const settings = await Settings.updateSettings(
      { instantPaymentDiscount: discount },
      updatedBy
    );

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        instantPaymentDiscount: settings.instantPaymentDiscount,
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

