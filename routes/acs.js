const express = require('express');
const router = express.Router();
const {
  getAllACs,
  getACById,
  createRentalInquiry
} = require('../controllers/acController');
const { validateRentalInquiry } = require('../middleware/validation');

// Public routes
router.get('/', getAllACs);
router.get('/:id', getACById);
router.post('/:id/inquiry', validateRentalInquiry, createRentalInquiry);

module.exports = router;

