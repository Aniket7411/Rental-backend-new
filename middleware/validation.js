const { body, validationResult } = require('express-validator');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg
    });
  }
  next();
};

// Validate rental inquiry
exports.validateRentalInquiry = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .customSanitizer((value) => (typeof value === 'string' ? value.replace(/[\s-]/g, '') : value))
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid E.164 phone number (e.g., +919999999999)'),
  body('duration')
    .trim()
    .notEmpty()
    .withMessage('Duration is required')
    .isIn(['Monthly', 'Quarterly', 'Yearly'])
    .withMessage('Duration must be Monthly, Quarterly, or Yearly'),
  body('message')
    .optional()
    .trim(),
  handleValidationErrors
];

// Validate service request
exports.validateServiceRequest = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required'),
  body('acType')
    .trim()
    .notEmpty()
    .withMessage('AC type is required')
    .isIn(['Split', 'Window', 'Central'])
    .withMessage('AC type must be Split, Window, or Central'),
  body('brand')
    .trim()
    .notEmpty()
    .withMessage('Brand is required'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required'),
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required'),
  body('contactNumber')
    .trim()
    .notEmpty()
    .withMessage('Contact number is required')
    .matches(/^\+91\s?\d{10}$/)
    .withMessage('Please provide a valid Indian phone number (+91 XXXXXXXXXX)'),
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
  body('images.*')
    .optional()
    .isURL()
    .withMessage('Each image must be a valid URL'),
  handleValidationErrors
];

// Validate lead
exports.validateLead = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .customSanitizer((value) => (typeof value === 'string' ? value.replace(/[\s-]/g, '') : value))
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid E.164 phone number (e.g., +919999999999)'),
  body('message')
    .optional()
    .trim(),
  handleValidationErrors
];

// Validate contact form
exports.validateContact = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .customSanitizer((value) => (typeof value === 'string' ? value.replace(/[\s-]/g, '') : value))
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid E.164 phone number (e.g., +919999999999)'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required'),
  handleValidationErrors
];

// Validate vendor listing request
exports.validateVendorListing = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .customSanitizer((value) => (typeof value === 'string' ? value.replace(/[\s-]/g, '') : value))
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid E.164 phone number (e.g., +919999999999)'),
  body('businessName')
    .trim()
    .notEmpty()
    .withMessage('Business name is required'),
  body('message')
    .optional()
    .trim(),
  handleValidationErrors
];

// Validate admin login
exports.validateAdminLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Validate AC creation/update
exports.validateAC = [
  body('brand')
    .trim()
    .notEmpty()
    .withMessage('Brand is required'),
  body('model')
    .trim()
    .notEmpty()
    .withMessage('Model is required'),
  body('capacity')
    .trim()
    .notEmpty()
    .withMessage('Capacity is required'),
  body('type')
    .trim()
    .notEmpty()
    .withMessage('Type is required')
    .isIn(['Split', 'Window'])
    .withMessage('Type must be Split or Window'),
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Location is required'),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .custom((value) => {
      if (typeof value === 'number') {
        if (value < 0) throw new Error('Price must be a positive number');
        return true;
      }
      if (typeof value === 'object') {
        if (value.monthly === undefined) throw new Error('Monthly price is required');
        if (Number.isNaN(parseFloat(value.monthly)) || parseFloat(value.monthly) < 0) throw new Error('Monthly price must be a positive number');
        return true;
      }
      throw new Error('Price must be a number or an object');
    }),
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
  body('images.*')
    .optional()
    .isURL()
    .withMessage('Each image must be a valid URL'),
  body('status')
    .optional()
    .isIn(['Available', 'Rented Out', 'Under Maintenance'])
    .withMessage('Status must be Available, Rented Out, or Under Maintenance'),
  handleValidationErrors
];

// Validate service
exports.validateService = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required'),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('originalPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Original price must be a positive number'),
  body('badge')
    .optional()
    .isIn(['Visit Within 1 Hour', 'Most Booked', 'Power Saver', null, ''])
    .withMessage('Badge must be one of: Visit Within 1 Hour, Most Booked, Power Saver'),
  body('image')
    .optional()
    .isURL()
    .withMessage('Image must be a valid URL'),
  body('process')
    .optional()
    .isArray()
    .withMessage('Process must be an array of strings'),
  body('process.*')
    .optional()
    .isString()
    .withMessage('Each process step must be a string'),
  body('benefits')
    .optional()
    .isArray()
    .withMessage('Benefits must be an array of strings'),
  body('benefits.*')
    .optional()
    .isString()
    .withMessage('Each benefit must be a string'),
  body('keyFeatures')
    .optional()
    .isArray()
    .withMessage('Key features must be an array of strings'),
  body('keyFeatures.*')
    .optional()
    .isString()
    .withMessage('Each key feature must be a string'),
  handleValidationErrors
];

// Validate service booking
exports.validateServiceBooking = [
  body('serviceId')
    .notEmpty()
    .withMessage('Service ID is required')
    .isMongoId()
    .withMessage('Service ID must be a valid ObjectId'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .customSanitizer((value) => {
      if (typeof value !== 'string') return value;
      const cleaned = value.replace(/[()\s\-\.]/g, '');
      return cleaned.replace(/(?!^)\+/g, '');
    })
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid E.164 phone number (e.g., +919999999999)'),
  body('preferredDate')
    .custom((value, { req }) => {
      const dateVal = (req.body.preferredDate || req.body.date || '').toString().trim();
      if (!dateVal) {
        throw new Error('Preferred date is required');
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
        throw new Error('Date must be in YYYY-MM-DD format');
      }
      return true;
    }),
  body('preferredTime')
    .custom((value, { req }) => {
      const timeVal = (req.body.preferredTime || req.body.time || '').toString().trim();
      if (!timeVal) {
        throw new Error('Preferred time is required');
      }
      const is24h = /^([01]\d|2[0-3]):[0-5]\d$/.test(timeVal);
      const isAmPm = /^(0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/i.test(timeVal);
      if (!is24h && !isAmPm) {
        throw new Error('Time must be in HH:mm 24-hour format');
      }
      return true;
    }),
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ min: 10 })
    .withMessage('Address must be at least 10 characters long'),
  body('notes')
    .optional()
    .trim(),
  handleValidationErrors
];

