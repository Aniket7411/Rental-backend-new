const RentalInquiry = require('../models/RentalInquiry');
const Product = require('../models/Product');
const { notifyRentalInquiry } = require('../utils/notifications');

// Get all rental inquiries (Admin)
exports.getAllRentalInquiries = async (req, res, next) => {
  try {
    const [inquiries, total] = await Promise.all([
      RentalInquiry.find().sort({ createdAt: -1 }),
      RentalInquiry.countDocuments()
    ]);

    // Format response
    const formattedInquiries = inquiries.map(inquiry => ({
      _id: inquiry._id,
      acId: inquiry.productId || inquiry.acId, // API uses acId
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone,
      duration: inquiry.duration || 'Monthly',
      message: inquiry.message,
      status: inquiry.status,
      createdAt: inquiry.createdAt
    }));

    res.status(200).json({
      success: true,
      data: formattedInquiries,
      total
    });
  } catch (error) {
    next(error);
  }
};

// Update inquiry status (Admin)
exports.updateInquiryStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const allowedStatuses = ['New', 'Contacted', 'In-Progress', 'Resolved', 'Rejected'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: New, Contacted, In-Progress, Resolved, Rejected'
      });
    }

    // Support both :id and :inquiryId for backward compatibility
    const inquiryId = req.params.inquiryId || req.params.id;
    const inquiry = await RentalInquiry.findByIdAndUpdate(
      inquiryId,
      { status },
      { new: true, runValidators: true }
    );

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    const inquiryObj = inquiry.toObject();
    res.status(200).json({
      success: true,
      message: 'Inquiry status updated',
      data: {
        _id: inquiry._id,
        status: inquiry.status,
        updatedAt: inquiry.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

