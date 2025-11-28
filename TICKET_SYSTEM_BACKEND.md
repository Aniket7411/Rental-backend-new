# Ticket System Backend Implementation Guide

This document outlines the backend implementation requirements for the ticket/support system.

## Overview

The ticket system allows users to raise support tickets that can be viewed, managed, and resolved by admins. Admins can add remarks and change ticket statuses, which are visible to users.

## Database Schema

### Ticket Model

```javascript
{
  _id: ObjectId,
  user: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 10
  },
  category: {
    type: String,
    enum: ['general', 'technical', 'billing', 'service', 'complaint', 'other'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['new', 'open', 'in-progress', 'resolved', 'closed'],
    default: 'new'
  },
  adminRemark: {
    type: String,
    trim: true,
    default: null
  },
  remarkUpdatedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

## API Endpoints

### User Endpoints

#### 1. Create Ticket
- **POST** `/api/tickets`
- **Auth**: Required (User)
- **Body**:
  ```json
  {
    "subject": "AC not cooling properly",
    "description": "The AC I rented is not cooling as expected...",
    "category": "technical",
    "priority": "high"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Ticket created successfully",
    "data": {
      "_id": "...",
      "user": "...",
      "subject": "...",
      "description": "...",
      "category": "technical",
      "priority": "high",
      "status": "new",
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
  ```

#### 2. Get User Tickets
- **GET** `/api/tickets`
- **Auth**: Required (User)
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "...",
        "subject": "...",
        "description": "...",
        "category": "...",
        "priority": "...",
        "status": "...",
        "adminRemark": "...",
        "createdAt": "...",
        "updatedAt": "..."
      }
    ]
  }
  ```

#### 3. Get Single Ticket
- **GET** `/api/tickets/:ticketId`
- **Auth**: Required (User - can only access own tickets)
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "...",
      "subject": "...",
      "description": "...",
      "category": "...",
      "priority": "...",
      "status": "...",
      "adminRemark": "...",
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
  ```

### Admin Endpoints

#### 1. Get All Tickets
- **GET** `/api/admin/tickets`
- **Auth**: Required (Admin)
- **Query Parameters** (optional):
  - `status`: Filter by status (new, open, in-progress, resolved, closed)
  - `priority`: Filter by priority (low, medium, high, urgent)
  - `category`: Filter by category
  - `page`: Page number for pagination
  - `limit`: Items per page
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "...",
        "user": {
          "_id": "...",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "subject": "...",
        "description": "...",
        "category": "...",
        "priority": "...",
        "status": "...",
        "adminRemark": "...",
        "remarkUpdatedAt": "...",
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 10
  }
  ```

#### 2. Update Ticket Status
- **PATCH** `/api/admin/tickets/:ticketId/status`
- **Auth**: Required (Admin)
- **Body**:
  ```json
  {
    "status": "in-progress"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Ticket status updated successfully",
    "data": {
      "_id": "...",
      "status": "in-progress",
      "updatedAt": "..."
    }
  }
  ```

#### 3. Add/Update Admin Remark
- **POST** `/api/admin/tickets/:ticketId/remarks`
- **Auth**: Required (Admin)
- **Body**:
  ```json
  {
    "remark": "We have forwarded your issue to our technical team. They will contact you within 24 hours."
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Remark added successfully",
    "data": {
      "_id": "...",
      "adminRemark": "...",
      "remarkUpdatedAt": "...",
      "updatedAt": "..."
    }
  }
  ```

## Implementation Steps

### 1. Create Ticket Model

Create a new file `models/Ticket.js`:

```javascript
const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    minlength: [5, 'Subject must be at least 5 characters'],
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters']
  },
  category: {
    type: String,
    enum: ['general', 'technical', 'billing', 'service', 'complaint', 'other'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['new', 'open', 'in-progress', 'resolved', 'closed'],
    default: 'new'
  },
  adminRemark: {
    type: String,
    trim: true,
    default: null
  },
  remarkUpdatedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries
ticketSchema.index({ user: 1, createdAt: -1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ priority: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
```

### 2. Create Ticket Routes

Create `routes/tickets.js`:

```javascript
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createTicket,
  getUserTickets,
  getTicketById
} = require('../controllers/tickets');

// User routes
router.post('/', protect, createTicket);
router.get('/', protect, getUserTickets);
router.get('/:id', protect, getTicketById);

module.exports = router;
```

Create `routes/admin/tickets.js`:

```javascript
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAllTickets,
  updateTicketStatus,
  addTicketRemark
} = require('../controllers/admin/tickets');

// Admin routes
router.get('/', protect, authorize('admin'), getAllTickets);
router.patch('/:ticketId/status', protect, authorize('admin'), updateTicketStatus);
router.post('/:ticketId/remarks', protect, authorize('admin'), addTicketRemark);

module.exports = router;
```

### 3. Create Ticket Controllers

Create `controllers/tickets.js`:

```javascript
const Ticket = require('../models/Ticket');
const asyncHandler = require('../middleware/async');

// @desc    Create a new ticket
// @route   POST /api/tickets
// @access  Private (User)
exports.createTicket = asyncHandler(async (req, res, next) => {
  const { subject, description, category, priority } = req.body;

  const ticket = await Ticket.create({
    user: req.user.id,
    subject,
    description,
    category: category || 'general',
    priority: priority || 'medium',
    status: 'new'
  });

  res.status(201).json({
    success: true,
    message: 'Ticket created successfully',
    data: ticket
  });
});

// @desc    Get all tickets for logged in user
// @route   GET /api/tickets
// @access  Private (User)
exports.getUserTickets = asyncHandler(async (req, res, next) => {
  const tickets = await Ticket.find({ user: req.user.id })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: tickets
  });
});

// @desc    Get single ticket by ID
// @route   GET /api/tickets/:id
// @access  Private (User)
exports.getTicketById = asyncHandler(async (req, res, next) => {
  const ticket = await Ticket.findById(req.params.id);

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Ticket not found'
    });
  }

  // Make sure user owns the ticket
  if (ticket.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this ticket'
    });
  }

  res.status(200).json({
    success: true,
    data: ticket
  });
});
```

Create `controllers/admin/tickets.js`:

```javascript
const Ticket = require('../../models/Ticket');
const asyncHandler = require('../../middleware/async');

// @desc    Get all tickets (Admin)
// @route   GET /api/admin/tickets
// @access  Private (Admin)
exports.getAllTickets = asyncHandler(async (req, res, next) => {
  const { status, priority, category, page = 1, limit = 10 } = req.query;

  // Build filter object
  const filter = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;

  // Pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const tickets = await Ticket.find(filter)
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Ticket.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: tickets,
    total,
    page: pageNum,
    limit: limitNum
  });
});

// @desc    Update ticket status
// @route   PATCH /api/admin/tickets/:ticketId/status
// @access  Private (Admin)
exports.updateTicketStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const { ticketId } = req.params;

  const validStatuses = ['new', 'open', 'in-progress', 'resolved', 'closed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status'
    });
  }

  const ticket = await Ticket.findByIdAndUpdate(
    ticketId,
    { status, updatedAt: Date.now() },
    { new: true, runValidators: true }
  );

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Ticket not found'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Ticket status updated successfully',
    data: ticket
  });
});

// @desc    Add/Update admin remark
// @route   POST /api/admin/tickets/:ticketId/remarks
// @access  Private (Admin)
exports.addTicketRemark = asyncHandler(async (req, res, next) => {
  const { remark } = req.body;
  const { ticketId } = req.params;

  if (!remark || !remark.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Remark is required'
    });
  }

  const ticket = await Ticket.findByIdAndUpdate(
    ticketId,
    {
      adminRemark: remark.trim(),
      remarkUpdatedAt: Date.now(),
      updatedAt: Date.now()
    },
    { new: true, runValidators: true }
  );

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Ticket not found'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Remark added successfully',
    data: ticket
  });
});
```

### 4. Register Routes in Main App

In your main `server.js` or `app.js`:

```javascript
// User ticket routes
app.use('/api/tickets', require('./routes/tickets'));

// Admin ticket routes
app.use('/api/admin/tickets', require('./routes/admin/tickets'));
```

## Validation

### Input Validation

- **Subject**: Required, 5-200 characters
- **Description**: Required, minimum 10 characters
- **Category**: Must be one of: general, technical, billing, service, complaint, other
- **Priority**: Must be one of: low, medium, high, urgent
- **Status**: Must be one of: new, open, in-progress, resolved, closed

### Authorization

- Users can only create tickets for themselves
- Users can only view their own tickets
- Admins can view all tickets
- Only admins can update ticket status and add remarks

## Error Handling

All endpoints should return consistent error responses:

```json
{
  "success": false,
  "message": "Error message here"
}
```

Common error codes:
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (not authenticated)
- `403`: Forbidden (not authorized)
- `404`: Not Found (ticket doesn't exist)
- `500`: Internal Server Error

## Testing Checklist

- [ ] User can create a ticket
- [ ] User can view their own tickets
- [ ] User cannot view other users' tickets
- [ ] Admin can view all tickets
- [ ] Admin can filter tickets by status, priority, category
- [ ] Admin can update ticket status
- [ ] Admin can add/update remarks
- [ ] User can see admin remarks on their tickets
- [ ] Status changes are reflected for users
- [ ] Validation works correctly
- [ ] Authorization is properly enforced

## Optional Enhancements

1. **Email Notifications**: Send email when ticket status changes
2. **Ticket History**: Track all status changes and remarks
3. **File Attachments**: Allow users to attach files to tickets
4. **Ticket Comments**: Allow back-and-forth conversation
5. **Auto-assignment**: Assign tickets to specific admin users
6. **SLA Tracking**: Track response times and resolution times
7. **Ticket Templates**: Pre-defined ticket templates for common issues

## Notes

- Ensure proper indexing on frequently queried fields (user, status, createdAt)
- Consider pagination for large ticket lists
- Add proper logging for ticket operations
- Consider rate limiting for ticket creation to prevent spam
- Implement soft delete if needed (mark as deleted instead of removing)

