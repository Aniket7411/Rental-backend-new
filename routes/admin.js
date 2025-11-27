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
  updateOrderStatus
} = require('../controllers/orderController');
const {
  getAllServiceRequests,
  updateServiceRequestStatus
} = require('../controllers/serviceRequestController');
const { validateAdminLogin, validateAC, validateService } = require('../middleware/validation');

// Admin login (public)
router.post('/login', validateAdminLogin, login);

// Admin AC routes
router.get('/acs', auth, getAllACsAdmin);
router.post('/acs', auth, validateAC, addAC);
router.patch('/acs/:id', auth, updateAC);
router.delete('/acs/:id', auth, deleteAC);

// Admin rental inquiries routes
router.get('/rental-inquiries', auth, getAllRentalInquiries);
router.patch('/rental-inquiries/:id', auth, updateInquiryStatus);

// Admin vendor requests routes
router.get('/vendor-requests', auth, getAllVendorRequests);

// Admin service management routes
router.post('/services', auth, validateService, createService);
router.patch('/services/:id', auth, updateService);
router.delete('/services/:id', auth, deleteService);

// Admin service bookings routes
router.get('/service-bookings', auth, getAllServiceBookings);
router.patch('/service-bookings/:id', auth, updateServiceBookingStatus);

// Admin product routes (from BACKEND_UPDATES.md)
router.get('/products', adminAuth, getProducts);
router.post('/products', adminAuth, createProduct);
router.patch('/products/:id', adminAuth, updateProduct);
router.delete('/products/:id', adminAuth, deleteProduct);

// Admin order routes (from BACKEND_UPDATES.md)
router.patch('/orders/:orderId', adminAuth, updateOrderStatus);

// Admin service request routes (from BACKEND_UPDATES.md)
router.get('/service-requests', adminAuth, getAllServiceRequests);
router.patch('/service-requests/:requestId', adminAuth, updateServiceRequestStatus);

module.exports = router;

