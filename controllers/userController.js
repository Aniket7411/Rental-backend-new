const User = require('../models/User');
const Order = require('../models/Order');
const { generateToken } = require('../utils/jwt');
const crypto = require('crypto');
const { notifyAdmin } = require('../utils/notifications');

// Note: Login, Signup, Forgot Password, and Reset Password have been moved to authController
// These endpoints are now available at /api/auth/*

// Get User Profile
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'NOT_FOUND'
      });
    }

    // Support both nested and top-level address formats per USER.md
    res.json({
      success: true,
      data: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        homeAddress: user.homeAddress || '',
        nearLandmark: user.nearLandmark || '',
        pincode: user.pincode || '',
        alternateNumber: user.alternateNumber || '',
        interestedIn: user.interestedIn || [],
        role: user.role,
        // Nested address format for backward compatibility
        address: {
          homeAddress: user.homeAddress || '',
          nearLandmark: user.nearLandmark || '',
          pincode: user.pincode || '',
          alternateNumber: user.alternateNumber || ''
        },
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update User Profile
// Supports both nested (address.homeAddress) and top-level (homeAddress) formats per USER.md
exports.updateProfile = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      homeAddress,
      pincode,
      nearLandmark,
      alternateNumber,
      interestedIn,
      address // Nested address format
    } = req.body;

    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'NOT_FOUND'
      });
    }

    // Update fields - support both nested and top-level formats
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;

    // Handle address fields - prefer nested format, fallback to top-level
    if (address) {
      // Nested format: { address: { homeAddress, nearLandmark, pincode, alternateNumber } }
      if (address.homeAddress !== undefined) user.homeAddress = address.homeAddress;
      if (address.nearLandmark !== undefined) user.nearLandmark = address.nearLandmark;
      if (address.pincode !== undefined) user.pincode = address.pincode;
      if (address.alternateNumber !== undefined) user.alternateNumber = address.alternateNumber;
    } else {
      // Top-level format: { homeAddress, nearLandmark, pincode, alternateNumber }
      if (homeAddress !== undefined) user.homeAddress = homeAddress;
      if (nearLandmark !== undefined) user.nearLandmark = nearLandmark;
      if (pincode !== undefined) user.pincode = pincode;
      if (alternateNumber !== undefined) user.alternateNumber = alternateNumber;
    }

    if (interestedIn !== undefined) user.interestedIn = interestedIn;

    await user.save();

    // Return response with both nested and top-level formats per USER.md
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        homeAddress: user.homeAddress || '',
        nearLandmark: user.nearLandmark || '',
        pincode: user.pincode || '',
        alternateNumber: user.alternateNumber || '',
        // Nested address format for backward compatibility
        address: {
          homeAddress: user.homeAddress || '',
          nearLandmark: user.nearLandmark || '',
          pincode: user.pincode || '',
          alternateNumber: user.alternateNumber || ''
        },
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// ADMIN USER MANAGEMENT ENDPOINTS
// ============================================

// Get All Users (Admin) - with order statistics
exports.getAllUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build search query
    const searchQuery = {};
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object - handle orderStats fields
    let sortObj = {};
    if (sortBy.startsWith('orderStats.')) {
      // For nested orderStats fields, use the field path directly
      sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;
    } else {
      // For regular user fields
      sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get users with order statistics using aggregation
    const usersWithStats = await User.aggregate([
      // Match users (with search if provided)
      { $match: searchQuery },
      // Lookup orders
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'userId',
          as: 'orders'
        }
      },
      // Project user fields and calculate order stats
      {
        $project: {
          name: 1,
          email: 1,
          phone: 1,
          role: 1,
          homeAddress: 1,
          nearLandmark: 1,
          pincode: 1,
          alternateNumber: 1,
          createdAt: 1,
          updatedAt: 1,
          orderStats: {
            totalOrders: { $size: '$orders' },
            completedOrders: {
              $size: {
                $filter: {
                  input: '$orders',
                  as: 'order',
                  cond: { $in: ['$$order.status', ['delivered', 'completed']] }
                }
              }
            },
            pendingOrders: {
              $size: {
                $filter: {
                  input: '$orders',
                  as: 'order',
                  cond: { $eq: ['$$order.status', 'pending'] }
                }
              }
            },
            cancelledOrders: {
              $size: {
                $filter: {
                  input: '$orders',
                  as: 'order',
                  cond: { $eq: ['$$order.status', 'cancelled'] }
                }
              }
            },
            totalSpent: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$orders',
                      as: 'order',
                      cond: { $in: ['$$order.status', ['delivered', 'completed']] }
                    }
                  },
                  as: 'order',
                  in: '$$order.finalTotal'
                }
              }
            }
          }
        }
      },
      // Calculate average order value
      {
        $addFields: {
          'orderStats.averageOrderValue': {
            $cond: {
              if: { $gt: ['$orderStats.totalOrders', 0] },
              then: {
                $divide: ['$orderStats.totalSpent', '$orderStats.totalOrders']
              },
              else: 0
            }
          }
        }
      },
      // Sort
      { $sort: sortObj },
      // Pagination
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);

    // Get total count for pagination
    const totalUsers = await User.countDocuments(searchQuery);

    // Format response with address object
    const formattedUsers = usersWithStats.map(user => {
      const userObj = {
        _id: user._id,
        name: user.name,
        email: user.email || null,
        phone: user.phone,
        role: user.role,
        address: (user.homeAddress || user.nearLandmark || user.pincode) ? {
          homeAddress: user.homeAddress || '',
          nearLandmark: user.nearLandmark || '',
          pincode: user.pincode || ''
        } : null,
        createdAt: user.createdAt,
        orderStats: {
          totalOrders: user.orderStats.totalOrders || 0,
          completedOrders: user.orderStats.completedOrders || 0,
          pendingOrders: user.orderStats.pendingOrders || 0,
          cancelledOrders: user.orderStats.cancelledOrders || 0,
          totalSpent: user.orderStats.totalSpent || 0,
          averageOrderValue: Math.round(user.orderStats.averageOrderValue || 0)
        }
      };
      return userObj;
    });

    const totalPages = Math.ceil(totalUsers / parseInt(limit));

    res.json({
      success: true,
      data: formattedUsers,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalUsers,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get User by ID (Admin)
exports.getUserById = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'NOT_FOUND'
      });
    }

    // Get order statistics
    const orders = await Order.find({ userId: user._id });

    const completedOrders = orders.filter(o => ['delivered', 'completed'].includes(o.status));
    const pendingOrders = orders.filter(o => o.status === 'pending');
    const cancelledOrders = orders.filter(o => o.status === 'cancelled');
    const totalSpent = completedOrders.reduce((sum, o) => sum + (o.finalTotal || 0), 0);
    const lastOrder = orders.length > 0 ? orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] : null;

    const orderStats = {
      totalOrders: orders.length,
      completedOrders: completedOrders.length,
      pendingOrders: pendingOrders.length,
      cancelledOrders: cancelledOrders.length,
      totalSpent,
      averageOrderValue: orders.length > 0 ? Math.round(totalSpent / orders.length) : 0,
      lastOrderDate: lastOrder ? lastOrder.createdAt : null
    };

    // Format address
    const address = (user.homeAddress || user.nearLandmark || user.pincode) ? {
      homeAddress: user.homeAddress || '',
      nearLandmark: user.nearLandmark || '',
      pincode: user.pincode || ''
    } : null;

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email || null,
        phone: user.phone,
        role: user.role,
        address,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        orderStats
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get User Orders (Admin)
exports.getUserOrders = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const {
      status,
      page = 1,
      limit = 20
    } = req.query;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'NOT_FOUND'
      });
    }

    // Build query
    const query = { userId };
    if (status) {
      query.status = status;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get orders
    const orders = await Order.find(query)
      .populate('items.productId', 'name brand model capacity type location')
      .populate('items.serviceId', 'title description')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Format orders
    const formattedOrders = orders.map(order => {
      const formattedItems = order.items.map(item => {
        const formattedItem = {
          type: item.type,
          quantity: item.quantity,
          price: item.price
        };

        if (item.type === 'rental') {
          formattedItem.productId = item.productId?._id || item.productId;
          formattedItem.productDetails = item.productDetails || (item.productId ? {
            brand: item.productId.brand,
            model: item.productId.model,
            capacity: item.productId.capacity,
            type: item.productId.type,
            location: item.productId.location
          } : null);
          if (item.duration) formattedItem.duration = item.duration;
        } else if (item.type === 'service') {
          formattedItem.serviceId = item.serviceId?._id || item.serviceId;
          formattedItem.serviceDetails = item.serviceDetails || (item.serviceId ? {
            title: item.serviceId.title,
            description: item.serviceId.description
          } : null);
          if (item.bookingDetails) formattedItem.bookingDetails = item.bookingDetails;
        }

        return formattedItem;
      });

      return {
        _id: order._id,
        orderId: order.orderId,
        userId: order.userId,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentOption: order.paymentOption,
        items: formattedItems,
        total: order.total,
        discount: order.discount || 0,
        finalTotal: order.finalTotal,
        customerInfo: order.customerInfo || {
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: (user.homeAddress || user.nearLandmark || user.pincode) ? {
            homeAddress: user.homeAddress || '',
            nearLandmark: user.nearLandmark || '',
            pincode: user.pincode || ''
          } : null
        },
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      };
    });

    // Get total count
    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / parseInt(limit));

    res.json({
      success: true,
      data: formattedOrders,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalOrders,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get User Statistics (Admin)
exports.getUserStats = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'NOT_FOUND'
      });
    }

    // Get all orders for this user
    const orders = await Order.find({ userId: user._id }).sort({ createdAt: 1 });

    // Calculate order statistics
    const completedOrders = orders.filter(o => ['delivered', 'completed'].includes(o.status));
    const pendingOrders = orders.filter(o => o.status === 'pending');
    const cancelledOrders = orders.filter(o => o.status === 'cancelled');
    const totalSpent = completedOrders.reduce((sum, o) => sum + (o.finalTotal || 0), 0);

    // Order breakdown by status
    const byStatus = {
      pending: orders.filter(o => o.status === 'pending').length,
      confirmed: orders.filter(o => o.status === 'confirmed').length,
      processing: orders.filter(o => o.status === 'processing').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      cancelled: cancelledOrders.length
    };

    // Order breakdown by payment status
    const byPaymentStatus = {
      paid: orders.filter(o => o.paymentStatus === 'paid').length,
      pending: orders.filter(o => o.paymentStatus === 'pending').length,
      failed: orders.filter(o => o.paymentStatus === 'failed').length || 0
    };

    // Order breakdown by type
    const byType = {
      rental: orders.filter(o => o.items.some(item => item.type === 'rental')).length,
      service: orders.filter(o => o.items.some(item => item.type === 'service')).length
    };

    // Monthly statistics
    const monthlyStatsMap = {};
    orders.forEach(order => {
      const month = order.createdAt.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyStatsMap[month]) {
        monthlyStatsMap[month] = { orders: 0, spent: 0 };
      }
      monthlyStatsMap[month].orders += 1;
      if (['delivered', 'completed'].includes(order.status)) {
        monthlyStatsMap[month].spent += order.finalTotal || 0;
      }
    });

    const monthlyStats = Object.keys(monthlyStatsMap)
      .sort()
      .map(month => ({
        month,
        orders: monthlyStatsMap[month].orders,
        spent: monthlyStatsMap[month].spent
      }));

    const firstOrder = orders.length > 0 ? orders[0] : null;
    const lastOrder = orders.length > 0 ? orders[orders.length - 1] : null;

    res.json({
      success: true,
      data: {
        userId: user._id,
        userInfo: {
          name: user.name,
          email: user.email || null,
          phone: user.phone,
          memberSince: user.createdAt
        },
        orderStats: {
          totalOrders: orders.length,
          completedOrders: completedOrders.length,
          pendingOrders: pendingOrders.length,
          cancelledOrders: cancelledOrders.length,
          totalSpent,
          averageOrderValue: orders.length > 0 ? Math.round(totalSpent / orders.length) : 0,
          lastOrderDate: lastOrder ? lastOrder.createdAt : null,
          firstOrderDate: firstOrder ? firstOrder.createdAt : null
        },
        orderBreakdown: {
          byStatus,
          byPaymentStatus,
          byType
        },
        monthlyStats
      }
    });
  } catch (error) {
    next(error);
  }
};

