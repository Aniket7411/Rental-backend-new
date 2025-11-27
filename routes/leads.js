const express = require('express');
const router = express.Router();
const { createLead } = require('../controllers/leadController');
const { validateLead } = require('../middleware/validation');

// Public route
router.post('/', validateLead, createLead);

module.exports = router;

