const Service = require('../models/Service');
const { SERVICE_CATEGORIES, isValidCategory, getCategoryErrorMessage } = require('../utils/serviceConstants');

// Get all services (Public)
exports.getAllServices = async (req, res, next) => {
  try {
    const { category } = req.query;
    
    // Build query object
    const query = {};
    
    // Add category filter if provided
    if (category) {
      // Validate category value
      if (!isValidCategory(category)) {
        return res.status(400).json({
          success: false,
          message: getCategoryErrorMessage(),
          error: 'VALIDATION_ERROR'
        });
      }
      
      query.category = category;
    }
    
    const services = await Service.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: services,
      total: services.length
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

// Helper function to validate image URL
const isValidImageUrl = (url) => {
  if (!url || url.trim() === '') return true; // Empty is valid (optional field)
  
  try {
    const urlObj = new URL(url);
    // Check if it's http or https
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (error) {
    return false;
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
      recommendedFrequency,
      category
    } = req.body;

    // Validate category if provided
    if (category !== undefined && category !== null && category !== '') {
      if (!isValidCategory(category)) {
        return res.status(400).json({
          success: false,
          message: getCategoryErrorMessage(),
          error: 'VALIDATION_ERROR'
        });
      }
    }

    // Validate image URL if provided
    if (image !== undefined && image !== null && image !== '') {
      if (!isValidImageUrl(image)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid image URL (must start with http:// or https://)',
          error: 'VALIDATION_ERROR'
        });
      }
    }

    const service = await Service.create({
      title,
      description,
      price,
      originalPrice,
      badge: badge || null,
      image: (image && image.trim() !== '') ? image.trim() : null, // Store null if empty
      process: Array.isArray(process) ? process : [],
      benefits: Array.isArray(benefits) ? benefits : [],
      keyFeatures: Array.isArray(keyFeatures) ? keyFeatures : [],
      recommendedFrequency,
      category: (category && category.trim() !== '') ? category : null // Set to null if empty/undefined
    });

    res.status(201).json({
      success: true,
      message: 'Service added successfully',
      data: {
        _id: service._id,
        title: service.title,
        category: service.category,
        image: service.image,
        createdAt: service.createdAt
      }
    });
  } catch (error) {
    // Handle Mongoose validation errors (including enum validation)
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message,
        error: 'VALIDATION_ERROR'
      });
    }
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

    // Validate category if provided
    if (req.body.category !== undefined) {
      // Allow clearing the category (null or empty string)
      if (req.body.category === null || req.body.category === '') {
        // Category will be set to null
      } else {
        // Validate category value
        if (!isValidCategory(req.body.category)) {
          return res.status(400).json({
            success: false,
            message: getCategoryErrorMessage(),
            error: 'VALIDATION_ERROR'
          });
        }
      }
    }

    // Validate image URL if provided
    if (req.body.image !== undefined) {
      if (req.body.image === null || req.body.image === '') {
        // Allow clearing the image - will be handled in updateFields
      } else if (!isValidImageUrl(req.body.image)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid image URL (must start with http:// or https://)',
          error: 'VALIDATION_ERROR'
        });
      }
    }

    // Update fields
    const updateFields = {};
    if (req.body.title !== undefined) updateFields.title = req.body.title;
    if (req.body.description !== undefined) updateFields.description = req.body.description;
    if (req.body.price !== undefined) updateFields.price = req.body.price;
    if (req.body.originalPrice !== undefined) updateFields.originalPrice = req.body.originalPrice;
    if (req.body.badge !== undefined) updateFields.badge = req.body.badge || null;
    if (req.body.image !== undefined) {
      // Set to null if empty, otherwise use the validated and trimmed URL
      updateFields.image = (req.body.image === null || req.body.image === '') ? null : req.body.image.trim();
    }
    if (req.body.process !== undefined) updateFields.process = Array.isArray(req.body.process) ? req.body.process : [];
    if (req.body.benefits !== undefined) updateFields.benefits = Array.isArray(req.body.benefits) ? req.body.benefits : [];
    if (req.body.keyFeatures !== undefined) updateFields.keyFeatures = Array.isArray(req.body.keyFeatures) ? req.body.keyFeatures : [];
    if (req.body.recommendedFrequency !== undefined) updateFields.recommendedFrequency = req.body.recommendedFrequency;
    if (req.body.category !== undefined) {
      // Set to null if explicitly cleared (null or empty string), otherwise use the validated value
      updateFields.category = (req.body.category === null || req.body.category === '') ? null : req.body.category;
    }

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
        title: updatedService.title,
        category: updatedService.category,
        image: updatedService.image
      }
    });
  } catch (error) {
    // Handle Mongoose validation errors (including enum validation)
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message,
        error: 'VALIDATION_ERROR'
      });
    }
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

