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
        // Check all price fields (3, 6, 9, 11 months only)
        const priceFields = ['price.3', 'price.6', 'price.9', 'price.11'];
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
      status = 'Available'
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

    const product = await Product.create({
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
    });

    res.status(201).json({
      success: true,
      message: 'Product added successfully',
      data: {
        _id: product._id,
        category: product.category,
        name: product.name,
        createdAt: product.createdAt
      }
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

    const updateFields = req.body;
    Object.keys(updateFields).forEach(key => {
      if (updateFields[key] !== undefined) {
        product[key] = updateFields[key];
      }
    });

    await product.save();

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: {
        _id: product._id,
        name: product.name,
        updatedAt: product.updatedAt
      }
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

