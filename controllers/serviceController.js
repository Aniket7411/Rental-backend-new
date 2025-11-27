const Service = require('../models/Service');

// Get all services (Public)
exports.getAllServices = async (req, res, next) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: services
    });
  } catch (error) {
    next(error);
  }
};

// Get service by ID (Public)
exports.getServiceById = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.status(200).json({
      success: true,
      data: service
    });
  } catch (error) {
    next(error);
  }
};

// Create service (Admin)
exports.createService = async (req, res, next) => {
  try {
    const {
      title,
      description,
      price,
      originalPrice,
      badge,
      image,
      process = [],
      benefits = [],
      keyFeatures = [],
      recommendedFrequency
    } = req.body;

    const service = await Service.create({
      title,
      description,
      price,
      originalPrice,
      badge: badge || null,
      image,
      process: Array.isArray(process) ? process : [],
      benefits: Array.isArray(benefits) ? benefits : [],
      keyFeatures: Array.isArray(keyFeatures) ? keyFeatures : [],
      recommendedFrequency
    });

    res.status(201).json({
      success: true,
      message: 'Service added successfully',
      data: {
        _id: service._id,
        title: service.title,
        createdAt: service.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update service (Admin)
exports.updateService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Update fields
    const updateFields = {};
    if (req.body.title !== undefined) updateFields.title = req.body.title;
    if (req.body.description !== undefined) updateFields.description = req.body.description;
    if (req.body.price !== undefined) updateFields.price = req.body.price;
    if (req.body.originalPrice !== undefined) updateFields.originalPrice = req.body.originalPrice;
    if (req.body.badge !== undefined) updateFields.badge = req.body.badge || null;
    if (req.body.image !== undefined) updateFields.image = req.body.image;
    if (req.body.process !== undefined) updateFields.process = Array.isArray(req.body.process) ? req.body.process : [];
    if (req.body.benefits !== undefined) updateFields.benefits = Array.isArray(req.body.benefits) ? req.body.benefits : [];
    if (req.body.keyFeatures !== undefined) updateFields.keyFeatures = Array.isArray(req.body.keyFeatures) ? req.body.keyFeatures : [];
    if (req.body.recommendedFrequency !== undefined) updateFields.recommendedFrequency = req.body.recommendedFrequency;

    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: {
        _id: updatedService._id,
        title: updatedService.title
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete service (Admin)
exports.deleteService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    await Service.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

