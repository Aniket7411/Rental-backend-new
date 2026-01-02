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

    // Ensure all 6 duration prices are present in response (backward compatibility)
    const validDurations = [3, 6, 9, 11, 12, 24];
    const productsWithPrices = products.map(product => {
      const productObj = product.toObject ? product.toObject() : product;
      if (productObj.price) {
        for (const duration of validDurations) {
          if (productObj.price[duration] === undefined || productObj.price[duration] === null) {
            productObj.price[duration] = null; // Set to null for missing prices
          }
        }
      }
      return productObj;
    });

    res.json({
      success: true,
      data: productsWithPrices,
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

    // Ensure all 6 duration prices are present in response (backward compatibility)
    const productObj = product.toObject();
    const validDurations = [3, 6, 9, 11, 12, 24];
    if (productObj.price) {
      for (const duration of validDurations) {
        if (productObj.price[duration] === undefined || productObj.price[duration] === null) {
          productObj.price[duration] = null; // Set to null for missing prices
        }
      }
    }

    res.json({
      success: true,
      data: productObj
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
      weight,
      status = 'Available',
      installationCharges,
      monthlyPaymentEnabled,
      monthlyPrice,
      securityDeposit
    } = req.body;

    // Validation
    if (!category || !name || !brand || !capacity || !location) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
        error: 'VALIDATION_ERROR'
      });
    }

    // Validate all required duration prices (3, 6, 9, 11, 12, 24 months)
    const validDurations = [3, 6, 9, 11, 12, 24];
    const missingPrices = [];
    const invalidPrices = [];

    if (!price || typeof price !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Price object is required',
        error: 'VALIDATION_ERROR'
      });
    }

    // Check all durations are present and valid
    for (const duration of validDurations) {
      if (!price[duration] && price[duration] !== 0) {
        missingPrices.push(`${duration} months`);
      } else if (typeof price[duration] !== 'number' || price[duration] <= 0) {
        invalidPrices.push(`${duration} months`);
      }
    }

    if (missingPrices.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Price for ${missingPrices.join(', ')} is required`,
        error: 'VALIDATION_ERROR'
      });
    }

    if (invalidPrices.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Price for ${invalidPrices.join(', ')} must be a positive number`,
        error: 'VALIDATION_ERROR'
      });
    }

    // Price consistency validation
    if (price[12] < price[11]) {
      return res.status(400).json({
        success: false,
        message: '12 months price should be greater than or equal to 11 months price',
        error: 'VALIDATION_ERROR'
      });
    }

    // Warning: 24 months should offer better value (at least 1.5x of 12 months)
    if (price[24] < price[12] * 1.5) {
      // Allow it but could log a warning
      console.warn(`Product creation: 24 months price (${price[24]}) may not offer sufficient discount compared to 12 months (${price[12]})`);
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

    // Validate weight field if provided
    if (weight !== undefined && weight !== null && weight !== '') {
      const validWeights = ['5kg', '6kg', '7kg', '8kg', '9kg'];
      if (!validWeights.includes(weight)) {
        return res.status(400).json({
          success: false,
          message: `Weight must be one of: ${validWeights.join(', ')}`,
          error: 'VALIDATION_ERROR'
        });
      }
    }

    // Validate monthly payment fields
    if (monthlyPaymentEnabled === true) {
      if (!monthlyPrice || monthlyPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Monthly price is required and must be greater than 0 when monthly payment is enabled',
          error: 'VALIDATION_ERROR'
        });
      }
      if (!securityDeposit || securityDeposit <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Security deposit is required and must be greater than 0 when monthly payment is enabled',
          error: 'VALIDATION_ERROR'
        });
      }
    }

    // If monthlyPaymentEnabled is false, ensure monthlyPrice and securityDeposit are null/0
    if (monthlyPaymentEnabled === false) {
      if (monthlyPrice !== null && monthlyPrice !== undefined) {
        return res.status(400).json({
          success: false,
          message: 'Monthly price should be null when monthly payment is disabled',
          error: 'VALIDATION_ERROR'
        });
      }
      securityDeposit = 0;
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
      weight,
      status,
      monthlyPaymentEnabled: monthlyPaymentEnabled || false,
      monthlyPrice: monthlyPaymentEnabled === true ? monthlyPrice : null,
      securityDeposit: monthlyPaymentEnabled === true ? (securityDeposit || 0) : 0
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

    // Validate price updates if price is being modified
    if (req.body.price && typeof req.body.price === 'object') {
      const validDurations = [3, 6, 9, 11, 12, 24];
      const updatedPrice = { ...product.price.toObject(), ...req.body.price };

      // Validate all updated prices are positive numbers
      for (const duration of validDurations) {
        if (updatedPrice[duration] !== undefined) {
          if (typeof updatedPrice[duration] !== 'number' || updatedPrice[duration] <= 0) {
            return res.status(400).json({
              success: false,
              message: `Price for ${duration} months must be a positive number`,
              error: 'VALIDATION_ERROR'
            });
          }
        }
      }

      // Price consistency validation
      if (updatedPrice[12] !== undefined && updatedPrice[11] !== undefined) {
        if (updatedPrice[12] < updatedPrice[11]) {
          return res.status(400).json({
            success: false,
            message: '12 months price should be greater than or equal to 11 months price',
            error: 'VALIDATION_ERROR'
          });
        }
      }

      // Check if all required prices are present after update
      const missingPrices = [];
      for (const duration of validDurations) {
        if (!updatedPrice[duration] && updatedPrice[duration] !== 0) {
          missingPrices.push(`${duration} months`);
        }
      }

      if (missingPrices.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Price for ${missingPrices.join(', ')} is required`,
          error: 'VALIDATION_ERROR'
        });
      }
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

    // Validate monthly payment fields if being updated
    if (req.body.monthlyPaymentEnabled !== undefined) {
      if (req.body.monthlyPaymentEnabled === true) {
        if (!req.body.monthlyPrice || req.body.monthlyPrice <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Monthly price is required and must be greater than 0 when monthly payment is enabled',
            error: 'VALIDATION_ERROR'
          });
        }
        if (!req.body.securityDeposit || req.body.securityDeposit <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Security deposit is required and must be greater than 0 when monthly payment is enabled',
            error: 'VALIDATION_ERROR'
          });
        }
        product.monthlyPaymentEnabled = true;
        product.monthlyPrice = req.body.monthlyPrice;
        product.securityDeposit = req.body.securityDeposit;
      } else {
        product.monthlyPaymentEnabled = false;
        product.monthlyPrice = null;
        product.securityDeposit = 0;
      }
    } else {
      // If monthlyPaymentEnabled is not being changed, validate individual fields
      if (req.body.monthlyPrice !== undefined) {
        // If only monthlyPrice is being updated, validate it
        if (product.monthlyPaymentEnabled === true) {
          if (!req.body.monthlyPrice || req.body.monthlyPrice <= 0) {
            return res.status(400).json({
              success: false,
              message: 'Monthly price must be greater than 0 when monthly payment is enabled',
              error: 'VALIDATION_ERROR'
            });
          }
          product.monthlyPrice = req.body.monthlyPrice;
        } else {
          return res.status(400).json({
            success: false,
            message: 'Cannot set monthly price when monthly payment is disabled',
            error: 'VALIDATION_ERROR'
          });
        }
      }
      
      if (req.body.securityDeposit !== undefined) {
        // If only securityDeposit is being updated, validate it
        if (product.monthlyPaymentEnabled === true) {
          if (!req.body.securityDeposit || req.body.securityDeposit <= 0) {
            return res.status(400).json({
              success: false,
              message: 'Security deposit must be greater than 0 when monthly payment is enabled',
              error: 'VALIDATION_ERROR'
            });
          }
          product.securityDeposit = req.body.securityDeposit;
        } else {
          // If monthly payment is disabled, set securityDeposit to 0
          product.securityDeposit = 0;
        }
      }
    }

    // Validate weight field if provided
    if (req.body.weight !== undefined) {
      const validWeights = ['5kg', '6kg', '7kg', '8kg', '9kg'];
      if (req.body.weight !== null && req.body.weight !== '' && !validWeights.includes(req.body.weight)) {
        return res.status(400).json({
          success: false,
          message: `Weight must be one of: ${validWeights.join(', ')}`,
          error: 'VALIDATION_ERROR'
        });
      }
    }

    // Update other fields
    const updateFields = req.body;
    Object.keys(updateFields).forEach(key => {
      if (key !== 'installationCharges' && key !== 'monthlyPaymentEnabled' && key !== 'monthlyPrice' && key !== 'securityDeposit' && updateFields[key] !== undefined) {
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

