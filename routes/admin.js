const express = require('express');
const router = express.Router();
const { login } = require('../controllers/adminController');
const {
  getAllACsAdmin,
  addAC,
  updateAC,
  deleteAC
} = require('../controllers/acController');
const {
  getAllRentalInquiries,
  updateInquiryStatus
} = require('../controllers/rentalInquiryController');
const {
  getAllVendorRequests
} = require('../controllers/vendorController');
const {
  createService,
  updateService,
  deleteService
} = require('../controllers/serviceController');
const {
  getAllServiceBookings,
  updateServiceBookingStatus
} = require('../controllers/serviceBookingController');
const { auth, adminAuth } = require('../middleware/auth');
const {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');
const {
  getAllOrders,
  updateOrderStatus,
  updatePaymentStatus
} = require('../controllers/orderController');
const {
  getAllServiceRequests,
  updateServiceRequestStatus
} = require('../controllers/serviceRequestController');
const {
  getAllTickets,
  updateTicketStatus,
  addTicketRemark
} = require('../controllers/adminTicketController');
const {
  createFAQ,
  updateFAQ,
  deleteFAQ
} = require('../controllers/faqController');
const {
  getAllCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponUsageStats
} = require('../controllers/adminCouponController');
const {
  getAllLeads,
  getLeadById,
  updateLeadStatus,
  deleteLead,
  getLeadStats
} = require('../controllers/leadController');
const {
  getAllUsers,
  getUserById,
  getUserOrders,
  getUserStats
} = require('../controllers/userController');
const { validateAdminLogin, validateAC, validateService, validateLeadStatusUpdate } = require('../middleware/validation');

// Admin login (public)
router.post('/login', validateAdminLogin, login);

// Admin AC routes
router.get('/acs', adminAuth, getAllACsAdmin);
router.post('/acs', adminAuth, validateAC, addAC);
router.patch('/acs/:id', adminAuth, updateAC);
router.delete('/acs/:id', adminAuth, deleteAC);

// Admin rental inquiries routes
router.get('/rental-inquiries', adminAuth, getAllRentalInquiries);
router.patch('/rental-inquiries/:inquiryId', adminAuth, updateInquiryStatus);

// Admin vendor requests routes
router.get('/vendor-requests', adminAuth, getAllVendorRequests);

// Admin service management routes
router.post('/services', adminAuth, validateService, createService);
router.patch('/services/:id', adminAuth, updateService);
router.delete('/services/:id', adminAuth, deleteService);

// Admin service bookings routes
router.get('/service-bookings', adminAuth, getAllServiceBookings);
router.patch('/service-bookings/:leadId', adminAuth, updateServiceBookingStatus);

// Admin product routes (from BACKEND_UPDATES.md)
router.get('/products', adminAuth, getProducts);
router.post('/products', adminAuth, createProduct);
router.patch('/products/:id', adminAuth, updateProduct);
router.delete('/products/:id', adminAuth, deleteProduct);

// Admin order routes
router.get('/orders', adminAuth, getAllOrders);
router.patch('/orders/:orderId/status', adminAuth, updateOrderStatus);
router.patch('/orders/:orderId/payment-status', adminAuth, updatePaymentStatus);

// Admin service request routes (from BACKEND_UPDATES.md)
router.get('/service-requests', adminAuth, getAllServiceRequests);
router.patch('/service-requests/:requestId', adminAuth, updateServiceRequestStatus);

// Admin ticket routes
router.get('/tickets', adminAuth, getAllTickets);
router.patch('/tickets/:ticketId/status', adminAuth, updateTicketStatus);
router.post('/tickets/:ticketId/remarks', adminAuth, addTicketRemark);

// Admin FAQ routes
router.post('/faqs', adminAuth, createFAQ);
router.patch('/faqs/:id', adminAuth, updateFAQ);
router.delete('/faqs/:id', adminAuth, deleteFAQ);

// Admin coupon routes
router.get('/coupons', adminAuth, getAllCoupons);
router.get('/coupons/:id', adminAuth, getCouponById);
router.post('/coupons', adminAuth, createCoupon);
router.put('/coupons/:couponId', adminAuth, updateCoupon);
router.delete('/coupons/:couponId', adminAuth, deleteCoupon);
router.get('/coupons/:id/stats', adminAuth, getCouponUsageStats);

// Admin callback leads routes
router.get('/leads', adminAuth, getAllLeads);
router.get('/leads/stats', adminAuth, getLeadStats);
router.get('/leads/:id', adminAuth, getLeadById);
router.patch('/leads/:id', adminAuth, validateLeadStatusUpdate, updateLeadStatus);
router.delete('/leads/:id', adminAuth, deleteLead);

// Admin user management routes
router.get('/users', adminAuth, getAllUsers);
router.get('/users/:userId', adminAuth, getUserById);
router.get('/users/:userId/orders', adminAuth, getUserOrders);
router.get('/users/:userId/stats', adminAuth, getUserStats);

module.exports = router;

