const Ticket = require('../models/Ticket');
const Order = require('../models/Order');
const ServiceBooking = require('../models/ServiceBooking');
const ServiceRequest = require('../models/ServiceRequest');
const RentalInquiry = require('../models/RentalInquiry');

// @desc    Create a new ticket
// @route   POST /api/tickets
// @access  Private (User)
exports.createTicket = async (req, res, next) => {
  try {
    const { 
      subject, 
      description, 
      category, 
      priority,
      relatedOrder,
      relatedServiceBooking,
      relatedServiceRequest,
      relatedRentalInquiry,
      attachments
    } = req.body;
    const userId = req.user._id || req.user.id;

    // Validate related entities if provided
    if (relatedOrder) {
      const order = await Order.findById(relatedOrder);
      if (!order) {
        return res.status(400).json({
          success: false,
          message: 'Related order not found',
          error: 'VALIDATION_ERROR'
        });
      }
      if (order.userId.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only link tickets to your own orders',
          error: 'FORBIDDEN'
        });
      }
    }

    if (relatedServiceBooking) {
      const booking = await ServiceBooking.findById(relatedServiceBooking);
      if (!booking) {
        return res.status(400).json({
          success: false,
          message: 'Related service booking not found',
          error: 'VALIDATION_ERROR'
        });
      }
      if (booking.userId && booking.userId.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only link tickets to your own service bookings',
          error: 'FORBIDDEN'
        });
      }
    }

    if (relatedServiceRequest) {
      const serviceRequest = await ServiceRequest.findById(relatedServiceRequest);
      if (!serviceRequest) {
        return res.status(400).json({
          success: false,
          message: 'Related service request not found',
          error: 'VALIDATION_ERROR'
        });
      }
      if (serviceRequest.userId.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only link tickets to your own service requests',
          error: 'FORBIDDEN'
        });
      }
    }

    if (relatedRentalInquiry) {
      const inquiry = await RentalInquiry.findById(relatedRentalInquiry);
      if (!inquiry) {
        return res.status(400).json({
          success: false,
          message: 'Related rental inquiry not found',
          error: 'VALIDATION_ERROR'
        });
      }
    }

    const ticket = await Ticket.create({
      user: userId,
      subject,
      description,
      category: category || 'general',
      priority: priority || 'medium',
      status: 'new',
      relatedOrder: relatedOrder || null,
      relatedServiceBooking: relatedServiceBooking || null,
      relatedServiceRequest: relatedServiceRequest || null,
      relatedRentalInquiry: relatedRentalInquiry || null,
      attachments: attachments || []
    });

    // Populate references for response
    await ticket.populate([
      { path: 'relatedOrder', select: 'orderId status totalAmount' },
      { path: 'relatedServiceBooking', select: 'serviceId name phone address status' },
      { path: 'relatedServiceRequest', select: 'serviceType productType status' },
      { path: 'relatedRentalInquiry', select: 'productCategory status' }
    ]);

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
    const { status, priority, category, page = 1, limit = 20 } = req.query;

    // Build filter
    const filter = { user: userId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const tickets = await Ticket.find(filter)
      .populate([
        { path: 'relatedOrder', select: 'orderId status totalAmount' },
        { path: 'relatedServiceBooking', select: 'serviceId name phone address status' },
        { path: 'relatedServiceRequest', select: 'serviceType productType status' },
        { path: 'relatedRentalInquiry', select: 'productCategory status' }
      ])
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

// @desc    Get single ticket by ID
// @route   GET /api/tickets/:ticketId
// @access  Private (User)
exports.getTicketById = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const ticket = await Ticket.findById(req.params.ticketId)
      .populate([
        { path: 'relatedOrder', select: 'orderId status totalAmount items' },
        { path: 'relatedServiceBooking', select: 'serviceId name phone email address preferredDate preferredTime status' },
        { path: 'relatedServiceRequest', select: 'serviceType productType brand model description address status' },
        { path: 'relatedRentalInquiry', select: 'productCategory acDetails name email phone status' }
      ]);

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

