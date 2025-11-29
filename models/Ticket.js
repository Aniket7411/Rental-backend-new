const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
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
  // Optional references to related entities
  relatedOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  relatedServiceBooking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceBooking',
    default: null
  },
  relatedServiceRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceRequest',
    default: null
  },
  relatedRentalInquiry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RentalInquiry',
    default: null
  },
  // File attachments (array of URLs)
  attachments: {
    type: [String],
    default: []
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
ticketSchema.index({ category: 1 });
ticketSchema.index({ relatedOrder: 1 });
ticketSchema.index({ relatedServiceBooking: 1 });
ticketSchema.index({ relatedServiceRequest: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);

