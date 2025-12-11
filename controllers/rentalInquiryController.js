const RentalInquiry = require('../models/RentalInquiry');
const Product = require('../models/Product');
const { notifyRentalInquiry } = require('../utils/notifications');

// Helper function to normalize status (accept both lowercase and capitalized)
const normalizeStatus = (status) => {
  if (!status) return 'New';
  const statusMap = {
    'new': 'New',
    'contacted': 'Contacted',
    'converted': 'Resolved', // Map converted to Resolved
    'closed': 'Rejected', // Map closed to Rejected
    'in-progress': 'In-Progress'
  };
  return statusMap[status.toLowerCase()] || status;
};

// Helper function to format status for response (convert to lowercase for frontend)
const formatStatus = (status) => {
  const statusMap = {
    'New': 'new',
    'Contacted': 'contacted',
    'Resolved': 'converted',
    'Rejected': 'closed',
    'In-Progress': 'contacted' // Map In-Progress to contacted for frontend
  };
  return statusMap[status] || status.toLowerCase();
};

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
      product: inquiry.productId ? { _id: inquiry.productId } : null, // Populate if needed
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone,
      preferredDuration: inquiry.duration || 'Monthly', // API uses preferredDuration
      message: inquiry.message,
      status: formatStatus(inquiry.status),
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

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    // Normalize status (accept both lowercase and capitalized)
    const normalizedStatus = normalizeStatus(status);

    // Support both :id and :inquiryId for backward compatibility
    const inquiryId = req.params.inquiryId || req.params.id;
    const inquiry = await RentalInquiry.findByIdAndUpdate(
      inquiryId,
      { status: normalizedStatus },
      { new: true, runValidators: true }
    );

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    // Format response with lowercase status
    const inquiryObj = inquiry.toObject();
    res.status(200).json({
      success: true,
      message: 'Inquiry status updated',
      data: {
        ...inquiryObj,
        status: formatStatus(inquiry.status)
      }
    });
  } catch (error) {
    next(error);
  }
};

