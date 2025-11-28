const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  createTicket,
  getUserTickets,
  getTicketById
} = require('../controllers/ticketController');

// User routes
router.post('/', auth, createTicket);
router.get('/', auth, getUserTickets);
router.get('/:ticketId', auth, getTicketById);

module.exports = router;

