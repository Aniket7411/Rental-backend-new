const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');


// Load environment variables
dotenv.config();

// Import routes
const acRoutes = require('./routes/acs');
const leadRoutes = require('./routes/leads');
const contactRoutes = require('./routes/contact');
const vendorRoutes = require('./routes/vendor');
const serviceRoutes = require('./routes/services');
const serviceBookingRoutes = require('./routes/serviceBookings');
const adminRoutes = require('./routes/admin');
// New routes from BACKEND_UPDATES.md
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const wishlistRoutes = require('./routes/wishlist');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const serviceRequestRoutes = require('./routes/serviceRequests');
const ticketRoutes = require('./routes/tickets');
const faqRoutes = require('./routes/faqs');
const couponRoutes = require('./routes/coupons');
const settingsRoutes = require('./routes/settings');

// Import error handler
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;



// Middleware
// CORS: allow all by default, or restrict via CORS_ORIGINS/FRONTEND_URL (comma-separated)
const parseOrigins = (value) => {
  if (!value) return null;
  return value.split(',').map(o => o.trim()).filter(Boolean);
};

// Build allowed origins list
let allowedOrigins = parseOrigins(process.env.CORS_ORIGINS) || parseOrigins(process.env.FRONTEND_URL);

// Add common development origins if in development mode
if (process.env.NODE_ENV !== 'production') {
  const devOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'];
  if (allowedOrigins) {
    allowedOrigins = [...allowedOrigins, ...devOrigins];
  } else {
    allowedOrigins = devOrigins;
  }
}

// Always allow production frontends
const productionFrontends = [
  'https://rental-ac-frontend.vercel.app',
  'https://ashenterprises.in'
];

if (!allowedOrigins) {
  allowedOrigins = [];
}

productionFrontends.forEach(frontend => {
  if (!allowedOrigins.includes(frontend)) {
    allowedOrigins.push(frontend);
  }
});

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);

    // If no allowed origins specified, allow all (development mode)
    if (!allowedOrigins || allowedOrigins.length === 0) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Log the blocked origin for debugging
    console.warn(`CORS blocked origin: ${origin}`);
    console.warn(`Allowed origins: ${allowedOrigins.join(', ')}`);

    // Reject the request
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  maxAge: 86400
}));
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coolrentals')
  .then(async () => {
    console.log('Connected to MongoDB');

    // Initialize default settings
    try {
      const Settings = require('./models/Settings');
      await Settings.getSettings();
      console.log('✅ Default settings initialized (instantPaymentDiscount: 10%, advancePaymentDiscount: 5%)');
    } catch (error) {
      console.error('⚠️  Error initializing settings:', error);
    }
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Routes
app.use('/api/acs', acRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/vendor-listing-request', vendorRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/service-bookings', serviceBookingRoutes);
app.use('/api/admin', adminRoutes);

// New routes from BACKEND_UPDATES.md
app.use('/api/auth', authRoutes); // Unified authentication routes
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/users/orders', orderRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users/service-requests', serviceRequestRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api', settingsRoutes); // Settings routes (includes /settings and /admin/settings)

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API Base URL: http://localhost:${PORT}/api`);
});

module.exports = app;

