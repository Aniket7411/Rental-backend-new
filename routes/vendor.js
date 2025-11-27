const express = require('express');
const router = express.Router();
const { submitVendorListing } = require('../controllers/vendorController');
const { validateVendorListing } = require('../middleware/validation');

// Public route
router.post('/', validateVendorListing, submitVendorListing);

module.exports = router;

