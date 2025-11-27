const Lead = require('../models/Lead');
const { notifyLead } = require('../utils/notifications');

// Create lead
exports.createLead = async (req, res, next) => {
  try {
    const { name, phone, email, source, message } = req.body;

    const lead = await Lead.create({
      name,
      phone,
      email, // Optional
      source, // Optional - "browse", "home", "contact"
      message // Optional
    });

    // Notify admin
    await notifyLead(lead);

    res.status(201).json({
      success: true,
      message: 'Thank you! We will contact you soon.',
      data: {
        _id: lead._id,
        name: lead.name,
        phone: lead.phone,
        createdAt: lead.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

