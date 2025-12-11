const Product = require('../models/Product');
const RentalInquiry = require('../models/RentalInquiry');
const { notifyRentalInquiry } = require('../utils/notifications');

// Get all Products with filters (supports /api/acs endpoint for backward compatibility)
exports.getAllACs = async (req, res, next) => {
  try {
    const {
      category,
      search,
      brand,
      capacity,
      type,
      condition,
      location,
      duration
    } = req.query;

    // Build query
    let query = {};

    // Category filter (required for products)
    if (category) {
      query.category = category;
    }

    // Search functionality - search in brand, model, location
    const searchConditions = [];
    if (search) {
      searchConditions.push(
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      );
    }

    // Filters
    if (brand) {
      query.brand = { $regex: brand, $options: 'i' };
    }
    
    // Capacity filter - support comma-separated values with OR logic
    if (capacity) {
      const capacityValues = capacity.split(',').map(c => c.trim()).filter(c => c);
      if (capacityValues.length > 0) {
        query.capacity = capacityValues.length === 1 ? capacityValues[0] : { $in: capacityValues };
      }
    }
    
    // Type filter - support comma-separated values with OR logic
    if (type) {
      const typeValues = type.split(',').map(t => t.trim()).filter(t => t);
      if (typeValues.length > 0) {
        query.type = typeValues.length === 1 ? typeValues[0] : { $in: typeValues };
      }
    }
    
    // Condition filter - support comma-separated values with OR logic
    if (condition) {
      const conditionValues = condition.split(',').map(c => c.trim()).filter(c => c);
      if (conditionValues.length > 0) {
        query.condition = conditionValues.length === 1 ? conditionValues[0] : { $in: conditionValues };
      }
    }
    
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    // Price filters based on duration (3, 6, 9, 11, 12, or 24 months)
    const durationConditions = [];
    if (duration) {
      // Support comma-separated duration values (e.g., "3,6,12,24")
      const durationValues = duration.split(',').map(d => d.trim()).filter(d => d);
      const validDurations = ['3', '6', '9', '11', '12', '24'];
      
      // Validate all provided durations are valid
      const invalidDurations = durationValues.filter(d => !validDurations.includes(d));
      if (invalidDurations.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid duration values: ${invalidDurations.join(', ')}. Allowed values: ${validDurations.join(', ')}`,
          error: 'VALIDATION_ERROR'
        });
      }

      // Filter products that have prices for at least one of the requested durations
      if (durationValues.length > 0) {
        durationConditions.push(...durationValues.map(d => ({
          [`price.${d}`]: { $exists: true, $ne: null, $gt: 0 }
        })));
      }
    }

    // Combine search and duration conditions properly
    if (searchConditions.length > 0 && durationConditions.length > 0) {
      // Need both search match AND duration match
      query.$and = [
        { $or: searchConditions },
        { $or: durationConditions }
      ];
    } else if (searchConditions.length > 0) {
      query.$or = searchConditions;
    } else if (durationConditions.length > 0) {
      query.$or = durationConditions;
    }

    // Get Products (no pagination as per API doc - returns all results)
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    // Ensure all 6 duration prices are present in response (backward compatibility)
    const validDurations = [3, 6, 9, 11, 12, 24];
    const productsWithPrices = products.map(product => {
      if (product.price) {
        for (const duration of validDurations) {
          if (product.price[duration] === undefined || product.price[duration] === null) {
            product.price[duration] = null; // Set to null for missing prices
          }
        }
      }
      return product;
    });
    
    const total = productsWithPrices.length;

    res.status(200).json({
      success: true,
      data: productsWithPrices,
      total
    });
  } catch (error) {
    next(error);
  }
};

// Get Product by ID (supports /api/acs/:id for backward compatibility)
exports.getACById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// Get all ACs (Admin) - includes all statuses
exports.getAllACsAdmin = async (req, res, next) => {
  try {
    const acs = await AC.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: acs
    });
  } catch (error) {
    next(error);
  }
};

// Add new AC (Admin)
exports.addAC = async (req, res, next) => {
  try {
    const {
      brand,
      model,
      capacity,
      type,
      description,
      location,
      status,
      price,
      images
    } = req.body;

    // Images come as array of URLs from frontend (already uploaded to Cloudinary)
    const imageUrls = Array.isArray(images) ? images : [];

    // Normalize price: accept number or object
    let normalizedPrice;
    if (typeof price === 'number') {
      normalizedPrice = {
        monthly: parseFloat(price),
        quarterly: parseFloat(price) * 3,
        yearly: parseFloat(price) * 12
      };
    } else if (price && (price.monthly || price.quarterly || price.yearly)) {
      normalizedPrice = {
        monthly: parseFloat(price.monthly),
        quarterly: parseFloat(price.quarterly ?? price.monthly * 3),
        yearly: parseFloat(price.yearly ?? price.monthly * 12)
      };
    } else {
      return res.status(400).json({
        success: false,
        message: 'Price is required'
      });
    }

    const ac = await AC.create({
      brand,
      model,
      capacity,
      type,
      description,
      location,
      price: normalizedPrice,
      status: status || 'Available',
      images: imageUrls
    });

    res.status(201).json({
      success: true,
      message: 'AC added successfully',
      data: ac
    });
  } catch (error) {
    next(error);
  }
};

// Update AC (Admin)
exports.updateAC = async (req, res, next) => {
  try {
    const ac = await AC.findById(req.params.id);

    if (!ac) {
      return res.status(404).json({
        success: false,
        message: 'AC not found'
      });
    }

    // Update fields
    const updateFields = {};
    if (req.body.brand) updateFields.brand = req.body.brand;
    if (req.body.model) updateFields.model = req.body.model;
    if (req.body.capacity) updateFields.capacity = req.body.capacity;
    if (req.body.type) updateFields.type = req.body.type;
    if (req.body.description !== undefined) updateFields.description = req.body.description;
    if (req.body.location) updateFields.location = req.body.location;
    if (req.body.status) updateFields.status = req.body.status;

    // Update price if provided (accept number or object)
    if (req.body.price !== undefined) {
      if (typeof req.body.price === 'number') {
        updateFields.price = {
          monthly: parseFloat(req.body.price),
          quarterly: parseFloat(req.body.price) * 3,
          yearly: parseFloat(req.body.price) * 12
        };
      } else {
        updateFields.price = {
          monthly: req.body.price.monthly !== undefined ? parseFloat(req.body.price.monthly) : ac.price.monthly,
          quarterly: req.body.price.quarterly !== undefined ? parseFloat(req.body.price.quarterly) : ac.price.quarterly,
          yearly: req.body.price.yearly !== undefined ? parseFloat(req.body.price.yearly) : ac.price.yearly
        };
      }
    }

    // Update images if provided (images come as array of URLs from frontend)
    if (req.body.images !== undefined) {
      updateFields.images = Array.isArray(req.body.images) ? req.body.images : [];
    }

    const updatedAC = await AC.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'AC updated successfully',
      data: updatedAC
    });
  } catch (error) {
    next(error);
  }
};

// Delete AC (Admin)
exports.deleteAC = async (req, res, next) => {
  try {
    const ac = await AC.findById(req.params.id);

    if (!ac) {
      return res.status(404).json({
        success: false,
        message: 'AC not found'
      });
    }

    await AC.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'AC deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Create rental inquiry (called from routes)
exports.createRentalInquiry = async (req, res, next) => {
  try {
    const { name, email, phone, message, acId, acDetails, productId, preferredDuration, address } = req.body;
    const { id } = req.params;

    // Support both productId and acId for backward compatibility
    const finalProductId = productId || acId || id;
    
    // Check if product exists
    const product = await Product.findById(finalProductId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Use acDetails/productDetails from request body if provided, otherwise construct from product
    let finalAcDetails = acDetails;
    if (!finalAcDetails) {
      finalAcDetails = {
        id: product._id,
        brand: product.brand,
        model: product.model || '',
        capacity: product.capacity,
        type: product.type,
        location: product.location,
        price: product.price
      };
    }

    // Determine product category
    const productCategory = product.category || 'AC';

    // Get duration from request body (API uses preferredDuration or duration)
    const duration = preferredDuration || req.body.duration || 'Monthly';

    // Create inquiry
    const inquiry = await RentalInquiry.create({
      productId: finalProductId,
      acId: finalProductId, // Backward compatibility
      productCategory,
      acDetails: finalAcDetails,
      name,
      email,
      phone,
      message: message || '',
      duration: duration
    });

    // Notify admin
    await notifyRentalInquiry(inquiry);

    res.status(201).json({
      success: true,
      message: 'Rental inquiry submitted successfully',
      data: {
        _id: inquiry._id,
        acId: inquiry.productId, // API uses acId
        name: inquiry.name,
        email: inquiry.email,
        phone: inquiry.phone,
        preferredDuration: inquiry.duration, // API uses preferredDuration
        message: inquiry.message,
        address: address || '', // Include address if provided
        status: inquiry.status.toLowerCase(), // Return lowercase status
        createdAt: inquiry.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

