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
      productId: inquiry.productId || inquiry.acId,
      productCategory: inquiry.productCategory || 'AC',
      name: inquiry.name,
      phone: inquiry.phone,
      email: inquiry.email,
      message: inquiry.message,
      acDetails: inquiry.acDetails || {},
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

    const allowedStatuses = ['Pending', 'Contacted', 'Completed', 'Cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: Pending, Contacted, Completed, Cancelled'
      });
    }

    const inquiry = await RentalInquiry.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

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

