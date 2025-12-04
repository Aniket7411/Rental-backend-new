const Lead = require('../models/Lead');
const { notifyLead } = require('../utils/notifications');

// Create lead (Public)
exports.createLead = async (req, res, next) => {
  try {
    const { name, phone, interest, source } = req.body;

    const lead = await Lead.create({
      name,
      phone,
      interest,
      source,
      status: 'New'
    });

    // Notify admin
    try {
      await notifyLead(lead);
    } catch (notificationError) {
      // Don't fail the request if notification fails
      console.error('Failed to send notification:', notificationError);
    }

    res.status(201).json({
      success: true,
      message: 'Thank you! We will contact you soon.',
      data: {
        _id: lead._id,
        name: lead.name,
        phone: lead.phone,
        interest: lead.interest,
        source: lead.source,
        status: lead.status,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt
      }
    });
  } catch (error) {
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
        errors
      });
    }
    next(error);
  }
};

// Get all leads (Admin Only)
exports.getAllLeads = async (req, res, next) => {
  try {
    const {
      status,
      interest,
      source,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (interest) filter.interest = interest;
    if (source) filter.source = source;

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

    // Validate sortBy
    const allowedSortFields = ['createdAt', 'updatedAt', 'name'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    // Calculate skip
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const [leads, totalLeads] = await Promise.all([
      Lead.find(filter)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Lead.countDocuments(filter)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalLeads / limitNum);

    res.status(200).json({
      success: true,
      data: leads,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalLeads,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get single lead (Admin Only)
exports.getLeadById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    res.status(200).json({
      success: true,
      data: lead
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }
    next(error);
  }
};

// Update lead status (Admin Only)
exports.updateLeadStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Track previous status for auto-timestamp logic
    const previousStatus = lead.status;

    // Update fields
    if (status !== undefined) {
      lead.status = status;
    }
    if (notes !== undefined) {
      lead.notes = notes;
    }

    // Auto-timestamp logic
    // When status changes to 'Contacted' and contactedAt is null, set it
    if (status === 'Contacted' && previousStatus !== 'Contacted' && !lead.contactedAt) {
      lead.contactedAt = new Date();
    }

    // When status changes to 'Resolved' or 'Closed' and resolvedAt is null, set it
    if ((status === 'Resolved' || status === 'Closed') && 
        previousStatus !== 'Resolved' && previousStatus !== 'Closed' && 
        !lead.resolvedAt) {
      lead.resolvedAt = new Date();
    }

    await lead.save();

    res.status(200).json({
      success: true,
      message: 'Lead updated successfully',
      data: lead
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }
    next(error);
  }
};

// Delete lead (Admin Only)
exports.deleteLead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findByIdAndDelete(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }
    next(error);
  }
};

// Get lead statistics (Admin Only)
exports.getLeadStats = async (req, res, next) => {
  try {
    // Get total count
    const total = await Lead.countDocuments();

    // Get counts by status
    const byStatus = await Lead.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    const statusMap = {
      'New': 0,
      'Contacted': 0,
      'In-Progress': 0,
      'Resolved': 0,
      'Closed': 0
    };
    byStatus.forEach(item => {
      statusMap[item._id] = item.count;
    });

    // Get counts by interest
    const byInterest = await Lead.aggregate([
      {
        $group: {
          _id: '$interest',
          count: { $sum: 1 }
        }
      }
    ]);
    const interestMap = {
      'rental': 0,
      'service': 0
    };
    byInterest.forEach(item => {
      interestMap[item._id] = item.count;
    });

    // Get counts by source
    const bySource = await Lead.aggregate([
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 }
        }
      }
    ]);
    const sourceMap = {
      'browse': 0,
      'contact': 0
    };
    bySource.forEach(item => {
      sourceMap[item._id] = item.count;
    });

    // Get new leads today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newToday = await Lead.countDocuments({
      createdAt: { $gte: today },
      status: 'New'
    });

    // Get new leads this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    const newThisWeek = await Lead.countDocuments({
      createdAt: { $gte: weekAgo }
    });

    // Get new leads this month
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    monthAgo.setHours(0, 0, 0, 0);
    const newThisMonth = await Lead.countDocuments({
      createdAt: { $gte: monthAgo }
    });

    res.status(200).json({
      success: true,
      data: {
        total,
        byStatus: statusMap,
        byInterest: interestMap,
        bySource: sourceMap,
        newToday,
        newThisWeek,
        newThisMonth
      }
    });
  } catch (error) {
    next(error);
  }
};
