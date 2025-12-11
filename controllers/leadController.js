const Lead = require('../models/Lead');
const { notifyLead } = require('../utils/notifications');

// Helper function to map frontend source to backend source
const mapSource = (source) => {
  const sourceMap = {
    'website': 'browse',
    'callback': 'contact',
    'contact_form': 'contact'
  };
  return sourceMap[source] || source || 'browse';
};

// Helper function to normalize status (accept both lowercase and capitalized)
const normalizeStatus = (status) => {
  if (!status) return 'New';
  const statusMap = {
    'new': 'New',
    'contacted': 'Contacted',
    'converted': 'Resolved', // Map converted to Resolved
    'closed': 'Closed',
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
    'Closed': 'closed',
    'In-Progress': 'contacted' // Map In-Progress to contacted for frontend
  };
  return statusMap[status] || status.toLowerCase();
};

// Create lead (Public)
exports.createLead = async (req, res, next) => {
  try {
    const { name, phone, email, message, source, interest } = req.body;

    // Map source from documentation format to backend format
    const backendSource = mapSource(source);
    
    // Determine interest from source if not provided
    const backendInterest = interest || (source === 'callback' ? 'rental' : 'service');

    const lead = await Lead.create({
      name,
      phone,
      email: email || '', // Store email if provided
      interest: backendInterest,
      source: backendSource,
      notes: message || '', // Store message in notes field
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
        email: lead.email || '',
        message: lead.notes || '',
        source: source || lead.source, // Return original source format
        status: formatStatus(lead.status),
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

    // Normalize status filter if provided
    if (filter.status) {
      filter.status = normalizeStatus(filter.status);
    }

    // Execute query
    const [leads, totalLeads] = await Promise.all([
      Lead.find(filter)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Lead.countDocuments(filter)
    ]);

    // Format leads for response (convert status to lowercase)
    const formattedLeads = leads.map(lead => ({
      ...lead,
      status: formatStatus(lead.status),
      message: lead.notes || '',
      email: lead.email || ''
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalLeads / limitNum);

    res.status(200).json({
      success: true,
      data: formattedLeads,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalLeads
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
      lead.status = normalizeStatus(status);
    }
    if (notes !== undefined) {
      lead.notes = notes;
    }

    // Auto-timestamp logic
    // When status changes to 'Contacted' and contactedAt is null, set it
    if (lead.status === 'Contacted' && previousStatus !== 'Contacted' && !lead.contactedAt) {
      lead.contactedAt = new Date();
    }

    // When status changes to 'Resolved' or 'Closed' and resolvedAt is null, set it
    if ((lead.status === 'Resolved' || lead.status === 'Closed') && 
        previousStatus !== 'Resolved' && previousStatus !== 'Closed' && 
        !lead.resolvedAt) {
      lead.resolvedAt = new Date();
    }

    await lead.save();

    // Format response
    const formattedLead = lead.toObject();
    formattedLead.status = formatStatus(formattedLead.status);
    formattedLead.message = formattedLead.notes || '';
    formattedLead.email = formattedLead.email || '';

    res.status(200).json({
      success: true,
      message: 'Lead updated successfully',
      data: formattedLead
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

    // Format status map for frontend (convert to lowercase)
    const formattedStatusMap = {
      new: statusMap['New'] || 0,
      contacted: (statusMap['Contacted'] || 0) + (statusMap['In-Progress'] || 0),
      converted: statusMap['Resolved'] || 0,
      closed: statusMap['Closed'] || 0
    };

    res.status(200).json({
      success: true,
      data: {
        total,
        new: formattedStatusMap.new,
        contacted: formattedStatusMap.contacted,
        converted: formattedStatusMap.converted,
        closed: formattedStatusMap.closed
      }
    });
  } catch (error) {
    next(error);
  }
};
