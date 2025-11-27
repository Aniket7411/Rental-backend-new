const ServiceRequest = require('../models/ServiceRequest');
const { notifyServiceRequest } = require('../utils/notifications');

// Get User Service Requests
exports.getUserServiceRequests = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const serviceRequests = await ServiceRequest.find({ userId })
      .populate('assignedTo', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: serviceRequests
    });
  } catch (error) {
    next(error);
  }
};

// Create service request
exports.createServiceRequest = async (req, res, next) => {
  try {
    const {
      serviceType,
      productType,
      brand,
      model,
      description,
      address,
      preferredDate,
      preferredTime
    } = req.body;

    const userId = req.user._id || req.user.id;

    if (!serviceType || !productType || !description || !address) {
      return res.status(400).json({
        success: false,
        message: 'Service type, product type, description, and address are required',
        error: 'VALIDATION_ERROR'
      });
    }

    const serviceRequest = await ServiceRequest.create({
      userId,
      serviceType,
      productType,
      brand,
      model,
      description,
      address,
      preferredDate: preferredDate ? new Date(preferredDate) : undefined,
      preferredTime,
      status: 'Pending'
    });

    await serviceRequest.populate('userId', 'name email phone');

    // Notify admin
    await notifyServiceRequest(serviceRequest);

    res.status(201).json({
      success: true,
      message: 'Service request submitted successfully',
      data: serviceRequest
    });
  } catch (error) {
    next(error);
  }
};

// Get all service requests (Admin)
exports.getAllServiceRequests = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) {
      query.status = status;
    }

    const serviceRequests = await ServiceRequest.find(query)
      .populate('userId', 'name email phone')
      .populate('assignedTo', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: serviceRequests
    });
  } catch (error) {
    next(error);
  }
};

// Update service request status (Admin)
exports.updateServiceRequestStatus = async (req, res, next) => {
  try {
    const { status, assignedTo, technicianNotes } = req.body;

    const allowedStatuses = ['Pending', 'Assigned', 'In Progress', 'Completed', 'Cancelled'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`,
        error: 'VALIDATION_ERROR'
      });
    }

    const serviceRequest = await ServiceRequest.findById(req.params.requestId || req.params.id);

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found',
        error: 'NOT_FOUND'
      });
    }

    if (status) serviceRequest.status = status;
    if (assignedTo) serviceRequest.assignedTo = assignedTo;
    if (technicianNotes !== undefined) serviceRequest.technicianNotes = technicianNotes;
    
    if (status === 'Completed') {
      serviceRequest.completedAt = new Date();
    }

    await serviceRequest.save();
    await serviceRequest.populate('assignedTo', 'name email phone');
    await serviceRequest.populate('userId', 'name email phone');

    res.json({
      success: true,
      message: 'Service request updated successfully',
      data: serviceRequest
    });
  } catch (error) {
    next(error);
  }
};

