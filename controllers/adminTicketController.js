const Ticket = require('../models/Ticket');

// @desc    Get all tickets (Admin)
// @route   GET /api/admin/tickets
// @access  Private (Admin)
exports.getAllTickets = async (req, res, next) => {
  try {
    const { status, priority, category, page = 1, limit = 10 } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const tickets = await Ticket.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Ticket.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: tickets,
      total,
      page: pageNum,
      limit: limitNum
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update ticket status
// @route   PATCH /api/admin/tickets/:ticketId/status
// @access  Private (Admin)
exports.updateTicketStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const { ticketId } = req.params;

    const validStatuses = ['new', 'open', 'in-progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
        error: 'VALIDATION_ERROR'
      });
    }

    const ticket = await Ticket.findByIdAndUpdate(
      ticketId,
      { status, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
        error: 'NOT_FOUND'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Ticket status updated successfully',
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add/Update admin remark
// @route   POST /api/admin/tickets/:ticketId/remarks
// @access  Private (Admin)
exports.addTicketRemark = async (req, res, next) => {
  try {
    const { remark } = req.body;
    const { ticketId } = req.params;

    if (!remark || !remark.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Remark is required',
        error: 'VALIDATION_ERROR'
      });
    }

    const ticket = await Ticket.findByIdAndUpdate(
      ticketId,
      {
        adminRemark: remark.trim(),
        remarkUpdatedAt: Date.now(),
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
        error: 'NOT_FOUND'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Remark added successfully',
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

