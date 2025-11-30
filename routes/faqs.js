const express = require('express');
const router = express.Router();
const { getAllFAQs } = require('../controllers/faqController');

// Public route - no authentication required
router.get('/', getAllFAQs);

module.exports = router;

