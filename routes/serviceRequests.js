const express = require('express');
const router = express.Router();
const {
  getUserServiceRequests,
  createServiceRequest,
  getAllServiceRequests,
  updateServiceRequestStatus
} = require('../controllers/serviceRequestController');
const { auth, adminAuth } = require('../middleware/auth');

// User routes
router.get('/', auth, getUserServiceRequests);
router.post('/', auth, createServiceRequest);

// Admin routes
router.get('/admin/all', adminAuth, getAllServiceRequests);
router.patch('/admin/:requestId', adminAuth, updateServiceRequestStatus);

module.exports = router;

