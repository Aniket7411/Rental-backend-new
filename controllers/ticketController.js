const Ticket = require('../models/Ticket');

// @desc    Create a new ticket
// @route   POST /api/tickets
// @access  Private (User)
exports.createTicket = async (req, res, next) => {
  try {
    const { subject, description, category, priority } = req.body;
    const userId = req.user._id || req.user.id;

    const ticket = await Ticket.create({
      user: userId,
      subject,
      description,
      category: category || 'general',
      priority: priority || 'medium',
      status: 'new'
    });

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all tickets for logged in user
// @route   GET /api/tickets
// @access  Private (User)
exports.getUserTickets = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;

    const tickets = await Ticket.find({ user: userId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: tickets
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single ticket by ID
// @route   GET /api/tickets/:ticketId
// @access  Private (User)
exports.getTicketById = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const ticket = await Ticket.findById(req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
        error: 'NOT_FOUND'
      });
    }

    // Make sure user owns the ticket
    if (ticket.user.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this ticket',
        error: 'FORBIDDEN'
      });
    }

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

