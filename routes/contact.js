const express = require('express');
const router = express.Router();
const { submitContact } = require('../controllers/contactController');
const { validateContact } = require('../middleware/validation');

// Public route
router.post('/', validateContact, submitContact);

module.exports = router;

