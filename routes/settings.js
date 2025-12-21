const express = require('express');
const router = express.Router();
const {
  getPublicSettings,
  getSettings,
  updateSettings
} = require('../controllers/settingsController');
const { adminAuth } = require('../middleware/auth');

// Public settings endpoint (no auth required)
router.get('/settings', getPublicSettings);

// Admin settings endpoints (auth required)
router.get('/admin/settings', adminAuth, getSettings);
router.put('/admin/settings', adminAuth, updateSettings);

module.exports = router;

