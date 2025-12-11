const ServiceBooking = require('../models/ServiceBooking');
const Service = require('../models/Service');
const { notifyAdmin } = require('../utils/notifications');

// Helper function to normalize status (accept both lowercase and capitalized)
const normalizeStatus = (status) => {
  if (!status) return 'New';
  const statusMap = {
    'pending': 'New',
    'confirmed': 'Contacted',
    'completed': 'Resolved',
    'cancelled': 'Cancelled',
    'new': 'New',
    'contacted': 'Contacted',
    'in-progress': 'In-Progress',
    'resolved': 'Resolved',
    'rejected': 'Rejected'
  };
  return statusMap[status.toLowerCase()] || status;
};

// Helper function to format status for response (convert to lowercase for frontend)
const formatStatus = (status) => {
  const statusMap = {
    'New': 'pending',
    'Contacted': 'confirmed',
    'Resolved': 'completed',
    'Cancelled': 'cancelled',
    'In-Progress': 'confirmed', // Map In-Progress to confirmed for frontend
    'Rejected': 'cancelled' // Map Rejected to cancelled for frontend
  };
  return statusMap[status] || status.toLowerCase();
};

// Create service booking (Public)
exports.createServiceBooking = async (req, res, next) => {
  try {
    const {
      serviceId,
      userId,
      serviceTitle,
      servicePrice,
      name,
      phone,
      email,
      date,
      time,
      preferredDate, // API uses preferredDate
      preferredTime, // API uses preferredTime
      address,
      nearLandmark, // Per USER.md
      pincode, // Per USER.md
      alternateNumber, // Per USER.md
      addressType,
      contactName,
      contactPhone,
      paymentOption,
      description,
      notes, // API uses notes instead of description
      images,
      orderId
    } = req.body;

    // Map preferredDate/preferredTime to date/time for backward compatibility
    const finalDate = preferredDate || date;
    const finalTime = preferredTime || time;
    const finalDescription = notes || description;

    // Check if service exists
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
        error: 'NOT_FOUND'
      });
    }

    // Validate date is in the future
    const bookingDate = new Date(finalDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate <= today) {
      return res.status(400).json({
        success: false,
        message: 'Booking date must be in the future',
        error: 'VALIDATION_ERROR'
      });
    }

    // Validate time slot
    const validTimeSlots = ['10-12', '12-2', '2-4', '4-6', '6-8'];
    if (!validTimeSlots.includes(finalTime)) {
      return res.status(400).json({
        success: false,
        message: `Invalid time slot. Valid slots are: ${validTimeSlots.join(', ')}`,
        error: 'VALIDATION_ERROR'
      });
    }

    // Validate contact info if addressType is other
    if (addressType === 'other') {
      if (!contactName || !contactName.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Contact name is required when address type is "other"',
          error: 'VALIDATION_ERROR'
        });
      }
      if (!contactPhone || !contactPhone.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Contact phone is required when address type is "other"',
          error: 'VALIDATION_ERROR'
        });
      }
    }

    // Set payment status based on payment option
    const paymentStatus = paymentOption === 'payNow' ? 'paid' : 'pending';

    // Create booking
    const booking = await ServiceBooking.create({
      serviceId,
      userId: userId || req.user?._id || req.user?.id, // Optional, use from auth if not provided
      serviceTitle,
      servicePrice,
      name,
      phone,
      email, // Optional
      date: finalDate,
      time: finalTime,
      address,
      nearLandmark: nearLandmark || '', // Per USER.md
      pincode: pincode || '', // Per USER.md
      alternateNumber: alternateNumber || '', // Per USER.md
      addressType,
      contactName: addressType === 'other' ? contactName : '',
      contactPhone: addressType === 'other' ? contactPhone : '',
      paymentOption,
      paymentStatus,
      description: finalDescription, // Optional
      images: images || [], // Optional
      orderId: orderId || null // Optional, if created from order
    });

    // Format time for display (e.g., "10-12" -> "10 AM - 12 PM")
    const formatTimeSlot = (slot) => {
      const [start, end] = slot.split('-');
      const startHour = parseInt(start);
      const endHour = parseInt(end);
      const startPeriod = startHour >= 12 ? 'PM' : 'AM';
      const endPeriod = endHour >= 12 ? 'PM' : 'AM';
      const startDisplay = startHour > 12 ? `${startHour - 12}` : startHour === 0 ? '12' : startHour;
      const endDisplay = endHour > 12 ? `${endHour - 12}` : endHour === 0 ? '12' : endHour;
      return `${startDisplay} ${startPeriod} - ${endDisplay} ${endPeriod}`;
    };

    // Notify admin
    const subject = 'New Service Booking';
    const messageText = `
      A new service booking has been created:
      
      Service: ${serviceTitle || service.title}
      Price: ₹${servicePrice}
      Customer: ${name}
      Phone: ${phone}
      Email: ${email || 'N/A'}
      Date: ${finalDate}
      Time: ${formatTimeSlot(finalTime)}
      Address: ${address}
      Address Type: ${addressType === 'myself' ? 'Myself' : 'Other'}
      ${addressType === 'other' ? `Contact Name: ${contactName}\nContact Phone: ${contactPhone}` : ''}
      Payment Option: ${paymentOption === 'payNow' ? 'Pay Now' : 'Pay Later'}
      Description: ${finalDescription || 'N/A'}
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
        preferredDate: booking.date, // API uses preferredDate
        preferredTime: booking.time, // API uses preferredTime
        address: booking.address,
        nearLandmark: booking.nearLandmark || '',
        pincode: booking.pincode || '',
        alternateNumber: booking.alternateNumber || '',
        notes: booking.description, // API uses notes
        addressType: booking.addressType,
        contactName: booking.contactName,
        contactPhone: booking.contactPhone,
        status: formatStatus(booking.status),
        paymentOption: booking.paymentOption,
        paymentStatus: booking.paymentStatus,
        orderId: booking.orderId,
        createdAt: booking.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get user's own service bookings
exports.getMyServiceBookings = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    // Build query - only get bookings for the authenticated user
    let query = { userId };
    if (status) {
      // Normalize status filter
      query.status = normalizeStatus(status);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get bookings with pagination
    const bookings = await ServiceBooking.find(query)
      .populate('serviceId', 'title description price image')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await ServiceBooking.countDocuments(query);

    res.status(200).json({
      success: true,
      data: bookings.map(booking => {
        const bookingObj = booking.toObject();
        return {
          ...bookingObj,
          status: formatStatus(bookingObj.status),
          preferredDate: bookingObj.date, // API uses preferredDate
          preferredTime: bookingObj.time, // API uses preferredTime
          notes: bookingObj.description, // API uses notes
          nearLandmark: bookingObj.nearLandmark || '',
          pincode: bookingObj.pincode || '',
          alternateNumber: bookingObj.alternateNumber || '',
          serviceDetails: bookingObj.serviceId ? {
            title: bookingObj.serviceId.title,
            description: bookingObj.serviceId.description,
            image: bookingObj.serviceId.image
          } : null
        };
      })
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
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await ServiceBooking.countDocuments(query);

    res.status(200).json({
      success: true,
      data: bookings.map(booking => {
        const bookingObj = booking.toObject();
        return {
          ...bookingObj,
          preferredDate: bookingObj.date, // API uses preferredDate
          preferredTime: bookingObj.time, // API uses preferredTime
          notes: bookingObj.description, // API uses notes
          nearLandmark: bookingObj.nearLandmark || '',
          pincode: bookingObj.pincode || '',
          alternateNumber: bookingObj.alternateNumber || '',
          // Keep date/time for backward compatibility but prefer preferredDate/preferredTime
        };
      }),
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    next(error);
  }
};

// Update service booking (Admin or User - can update time, date, or status)
exports.updateServiceBooking = async (req, res, next) => {
  try {
    const { time, date, preferredTime, preferredDate, status } = req.body;
    const bookingId = req.params.id;

    // Map preferredDate/preferredTime to date/time for backward compatibility
    const finalDate = preferredDate || date;
    const finalTime = preferredTime || time;

    const booking = await ServiceBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Service booking not found',
        error: 'NOT_FOUND'
      });
    }

    // Check authorization - users can only update their own bookings
    const userId = req.user?._id || req.user?.id;
    if (userId && booking.userId && booking.userId.toString() !== userId.toString() && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking',
        error: 'FORBIDDEN'
      });
    }

    const updateData = {};

    // Validate and update time slot if provided
    if (finalTime !== undefined) {
      const validTimeSlots = ['10-12', '12-2', '2-4', '4-6', '6-8'];
      if (!validTimeSlots.includes(finalTime)) {
        return res.status(400).json({
          success: false,
          message: `Invalid time slot. Valid slots are: ${validTimeSlots.join(', ')}`,
          error: 'VALIDATION_ERROR'
        });
      }
      updateData.time = finalTime;
    }

    // Validate and update date if provided
    if (finalDate !== undefined) {
      const bookingDate = new Date(finalDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (bookingDate <= today) {
        return res.status(400).json({
          success: false,
          message: 'Booking date must be in the future',
          error: 'VALIDATION_ERROR'
        });
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(finalDate)) {
        return res.status(400).json({
          success: false,
          message: 'Date must be in YYYY-MM-DD format',
          error: 'VALIDATION_ERROR'
        });
      }
      updateData.date = finalDate;
    }

    // Validate and update status if provided (admin only)
    if (status !== undefined) {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admins can update booking status',
          error: 'FORBIDDEN'
        });
      }

      // Normalize status (accept both lowercase and capitalized)
      updateData.status = normalizeStatus(status);
    }

    // Update booking
    const updatedBooking = await ServiceBooking.findByIdAndUpdate(
      bookingId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('serviceId', 'title');

    const bookingObj = updatedBooking.toObject();
    res.status(200).json({
      success: true,
      message: 'Booking updated successfully',
      data: {
        ...bookingObj,
        status: formatStatus(bookingObj.status),
        preferredDate: bookingObj.date, // API uses preferredDate
        preferredTime: bookingObj.time, // API uses preferredTime
        notes: bookingObj.description, // API uses notes
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update service booking status (Admin) - kept for backward compatibility
exports.updateServiceBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
        error: 'VALIDATION_ERROR'
      });
    }

    // Normalize status (accept both lowercase and capitalized)
    const normalizedStatus = normalizeStatus(status);

    // Support both :id and :leadId for backward compatibility
    const bookingId = req.params.leadId || req.params.id;
    const booking = await ServiceBooking.findByIdAndUpdate(
      bookingId,
      { status: normalizedStatus },
      { new: true, runValidators: true }
    )
      .populate('serviceId', 'title');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Service booking not found',
        error: 'NOT_FOUND'
      });
    }

    const bookingObj = booking.toObject();
    res.status(200).json({
      success: true,
      message: 'Lead status updated',
      data: {
        ...bookingObj,
        status: formatStatus(booking.status),
        preferredDate: bookingObj.date, // API uses preferredDate
        preferredTime: bookingObj.time, // API uses preferredTime
        notes: bookingObj.description, // API uses notes
      }
    });
  } catch (error) {
    next(error);
  }
};

