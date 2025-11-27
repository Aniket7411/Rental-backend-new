const express = require('express');
const router = express.Router();
const { getAllServices } = require('../controllers/serviceController');

// Public routes
router.get('/', getAllServices);

module.exports = router;

