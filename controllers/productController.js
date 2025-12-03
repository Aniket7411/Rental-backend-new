const Product = require('../models/Product');

// Get Products (with filtering)
exports.getProducts = async (req, res, next) => {
  try {
    const {
      category,
      search,
      brand,
      capacity,
      type,
      location,
      duration,
      minPrice,
      maxPrice,
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    const query = {};

    if (category) {
      query.category = category;
    }

    if (brand) {
      query.brand = new RegExp(brand, 'i');
    }

    if (capacity) {
      query.capacity = capacity;
    }

    if (type) {
      query.type = type;
    }

    if (location) {
      query.location = new RegExp(location, 'i');
    }

    // Duration filter - filter products that have prices for the specified duration(s)
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

    // Combine duration conditions with existing query
    if (durationConditions.length > 0) {
      // If there's already a $or from search, combine with $and
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: durationConditions }
        ];
        delete query.$or;
      } else {
        query.$or = durationConditions;
      }
    }

    if (minPrice || maxPrice) {
      const priceQuery = {};
      if (duration) {
        const priceField = `price.${duration}`;
        if (minPrice) priceQuery[priceField] = { $gte: Number(minPrice) };
        if (maxPrice) {
          if (priceQuery[priceField]) {
            priceQuery[priceField].$lte = Number(maxPrice);
          } else {
            priceQuery[priceField] = { $lte: Number(maxPrice) };
          }
        }
      } else {
        // Check all price fields (3, 6, 9, 11, 12, 24 months)
        const priceFields = ['price.3', 'price.6', 'price.9', 'price.11', 'price.12', 'price.24'];
        query.$or = priceFields.map(field => {
          const fieldQuery = {};
          if (minPrice) fieldQuery[field] = { $gte: Number(minPrice) };
          if (maxPrice) {
            if (fieldQuery[field]) {
              fieldQuery[field].$lte = Number(maxPrice);
            } else {
              fieldQuery[field] = { $lte: Number(maxPrice) };
            }
          }
          return fieldQuery;
        });
      }
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    let productsQuery = Product.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    if (search) {
      productsQuery = productsQuery.sort({ score: { $meta: 'textScore' } });
    }

    const products = await productsQuery;
    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: products,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    next(error);
  }
};

// Get Product by ID
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('reviews.userId', 'name email');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        error: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// Create Product (Admin)
exports.createProduct = async (req, res, next) => {
  try {
    const {
      category,
      name,
      brand,
      model,
      type,
      capacity,
      location,
      price,
      discount = 0,
      images = [],
      features = {},
      energyRating,
      operationType,
      loadType,
      status = 'Available',
      installationCharges
    } = req.body;

    // Validation
    if (!category || !name || !brand || !capacity || !location) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
        error: 'VALIDATION_ERROR'
      });
    }

    if (!price || !price['3'] || !price['6'] || !price['9'] || !price['11']) {
      return res.status(400).json({
        success: false,
        message: 'All rental duration prices (3, 6, 9, 11 months) are required',
        error: 'VALIDATION_ERROR'
      });
    }

    // Validate 12 and 24 months prices if provided (optional for backward compatibility)
    if (price['12'] !== undefined && (typeof price['12'] !== 'number' || price['12'] < 0)) {
      return res.status(400).json({
        success: false,
        message: '12 months price must be a positive number',
        error: 'VALIDATION_ERROR'
      });
    }

    if (price['24'] !== undefined && (typeof price['24'] !== 'number' || price['24'] < 0)) {
      return res.status(400).json({
        success: false,
        message: '24 months price must be a positive number',
        error: 'VALIDATION_ERROR'
      });
    }

    // Validate installationCharges - only for AC category
    if (installationCharges && category !== 'AC') {
      return res.status(400).json({
        success: false,
        message: 'Installation charges are only applicable for AC products',
        error: 'VALIDATION_ERROR'
      });
    }

    // Validate installationCharges structure if provided
    if (installationCharges && category === 'AC') {
      if (typeof installationCharges.amount !== 'number' || installationCharges.amount < 0) {
        return res.status(400).json({
          success: false,
          message: 'Installation charges amount must be a non-negative number',
          error: 'VALIDATION_ERROR'
        });
      }

      if (installationCharges.includedItems && !Array.isArray(installationCharges.includedItems)) {
        return res.status(400).json({
          success: false,
          message: 'Included items must be an array',
          error: 'VALIDATION_ERROR'
        });
      }

      if (installationCharges.extraMaterialRates) {
        const rates = installationCharges.extraMaterialRates;
        if (rates.copperPipe !== undefined && (typeof rates.copperPipe !== 'number' || rates.copperPipe < 0)) {
          return res.status(400).json({
            success: false,
            message: 'Copper pipe rate must be a non-negative number',
            error: 'VALIDATION_ERROR'
          });
        }
        if (rates.drainPipe !== undefined && (typeof rates.drainPipe !== 'number' || rates.drainPipe < 0)) {
          return res.status(400).json({
            success: false,
            message: 'Drain pipe rate must be a non-negative number',
            error: 'VALIDATION_ERROR'
          });
        }
        if (rates.electricWire !== undefined && (typeof rates.electricWire !== 'number' || rates.electricWire < 0)) {
          return res.status(400).json({
            success: false,
            message: 'Electric wire rate must be a non-negative number',
            error: 'VALIDATION_ERROR'
          });
        }
      }
    }

    const productData = {
      category,
      name,
      brand,
      model,
      type,
      capacity,
      location,
      price,
      discount,
      images,
      features,
      energyRating,
      operationType,
      loadType,
      status
    };

    // Only add installationCharges if category is AC
    if (category === 'AC' && installationCharges) {
      productData.installationCharges = {
        amount: installationCharges.amount || 0,
        includedItems: installationCharges.includedItems || [],
        extraMaterialRates: {
          copperPipe: installationCharges.extraMaterialRates?.copperPipe || 0,
          drainPipe: installationCharges.extraMaterialRates?.drainPipe || 0,
          electricWire: installationCharges.extraMaterialRates?.electricWire || 0
        }
      };
    }

    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      message: 'Product added successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// Update Product (Admin)
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        error: 'NOT_FOUND'
      });
    }

    // Validate installationCharges - only for AC category
    if (req.body.installationCharges !== undefined) {
      if (product.category !== 'AC' && req.body.installationCharges !== null) {
        return res.status(400).json({
          success: false,
          message: 'Installation charges are only applicable for AC products',
          error: 'VALIDATION_ERROR'
        });
      }

      // If setting to null, remove installationCharges
      if (req.body.installationCharges === null) {
        product.installationCharges = undefined;
      } else if (product.category === 'AC' && req.body.installationCharges) {
        const installationCharges = req.body.installationCharges;

        // Validate installationCharges structure
        if (typeof installationCharges.amount !== 'number' || installationCharges.amount < 0) {
          return res.status(400).json({
            success: false,
            message: 'Installation charges amount must be a non-negative number',
            error: 'VALIDATION_ERROR'
          });
        }

        if (installationCharges.includedItems && !Array.isArray(installationCharges.includedItems)) {
          return res.status(400).json({
            success: false,
            message: 'Included items must be an array',
            error: 'VALIDATION_ERROR'
          });
        }

        if (installationCharges.extraMaterialRates) {
          const rates = installationCharges.extraMaterialRates;
          if (rates.copperPipe !== undefined && (typeof rates.copperPipe !== 'number' || rates.copperPipe < 0)) {
            return res.status(400).json({
              success: false,
              message: 'Copper pipe rate must be a non-negative number',
              error: 'VALIDATION_ERROR'
            });
          }
          if (rates.drainPipe !== undefined && (typeof rates.drainPipe !== 'number' || rates.drainPipe < 0)) {
            return res.status(400).json({
              success: false,
              message: 'Drain pipe rate must be a non-negative number',
              error: 'VALIDATION_ERROR'
            });
          }
          if (rates.electricWire !== undefined && (typeof rates.electricWire !== 'number' || rates.electricWire < 0)) {
            return res.status(400).json({
              success: false,
              message: 'Electric wire rate must be a non-negative number',
              error: 'VALIDATION_ERROR'
            });
          }
        }

        // Update installationCharges
        product.installationCharges = {
          amount: installationCharges.amount || 0,
          includedItems: installationCharges.includedItems || [],
          extraMaterialRates: {
            copperPipe: installationCharges.extraMaterialRates?.copperPipe || 0,
            drainPipe: installationCharges.extraMaterialRates?.drainPipe || 0,
            electricWire: installationCharges.extraMaterialRates?.electricWire || 0
          }
        };
      }
    }

    // Update other fields
    const updateFields = req.body;
    Object.keys(updateFields).forEach(key => {
      if (key !== 'installationCharges' && updateFields[key] !== undefined) {
        product[key] = updateFields[key];
      }
    });

    await product.save();

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// Delete Product (Admin)
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        error: 'NOT_FOUND'
      });
    }

    await product.deleteOne();

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

