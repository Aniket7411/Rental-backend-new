const ServiceBooking = require('../models/ServiceBooking');
const Service = require('../models/Service');
const { notifyAdmin } = require('../utils/notifications');

// Create service booking (Public)
exports.createServiceBooking = async (req, res, next) => {
  try {
    const { 
      serviceId, 
      userId, 
      name, 
      phone, 
      email,
      address, 
      preferredDate,
      preferredTime,
      description,
      images
    } = req.body;

    // Check if service exists
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Create booking
    const booking = await ServiceBooking.create({
      serviceId,
      userId, // Optional
      name,
      phone,
      email, // Optional
      address,
      preferredDate, // Optional
      preferredTime, // Optional
      description, // Optional (replaces notes)
      images: images || [] // Optional
    });

    // Notify admin
    const subject = 'New Service Booking';
    const messageText = `
      A new service booking has been created:
      
      Service: ${service.title}
      Customer: ${name}
      Phone: ${phone}
      Email: ${email || 'N/A'}
      Address: ${address}
      Preferred Date: ${preferredDate || 'N/A'}
      Preferred Time: ${preferredTime || 'N/A'}
      Description: ${description || 'N/A'}
    `;

    await notifyAdmin(subject, messageText);

    res.status(201).json({
      success: true,
      message: 'Service booking submitted successfully',
      data: {
        _id: booking._id,
        serviceId: booking.serviceId,
        name: booking.name,
        phone: booking.phone,
        status: booking.status,
        createdAt: booking.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all service bookings (Admin)
exports.getAllServiceBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    // Build query
    let query = {};
    if (status) {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get bookings with pagination
    const bookings = await ServiceBooking.find(query)
      .populate('serviceId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await ServiceBooking.countDocuments(query);

    res.status(200).json({
      success: true,
      data: bookings,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    next(error);
  }
};

// Update service booking status (Admin)
exports.updateServiceBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const allowedStatuses = ['New', 'Contacted', 'In-Progress', 'Resolved', 'Rejected'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: New, Contacted, In-Progress, Resolved, Rejected'
      });
    }

    const booking = await ServiceBooking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Service booking not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Lead status updated',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

