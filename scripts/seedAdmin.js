const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Load environment variables
dotenv.config();

/**
 * Seed admin user with default credentials
 * Creates admin user in User model (not Admin model)
 * Default credentials:
 * - Email: admin@example.com
 * - Password: password123
 * - Role: admin
 */
async function seedAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coolrentals');

    console.log('✅ Connected to MongoDB');

    // Default admin credentials
    const adminEmail = 'admin@example.com';
    const adminPassword = 'password123';
    const adminName = 'Admin User';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists with email:', adminEmail);
      console.log('   If you want to reset the password, delete the user first or update manually.');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Create admin user
    // Note: Phone is required in User model, so we'll use a placeholder
    // In production, you should set a valid phone number
    // Password will be automatically hashed by the User model's pre-save hook
    const admin = await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword, // Pass plain password - will be hashed by pre-save hook
      phone: '0000000000', // Placeholder phone number (required field)
      role: 'admin'
    });

    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('📋 Admin Credentials:');
    console.log('   Email:', admin.email);
    console.log('   Password:', adminPassword);
    console.log('   Role:', admin.role);
    console.log('');
    console.log('⚠️  IMPORTANT: Change the default password immediately after first login in production!');
    console.log('⚠️  Note: Phone number is set to placeholder (0000000000). Update it in production.');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error);

    if (error.code === 11000) {
      console.error('   Duplicate key error - admin user may already exist');
    }

    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run seed function
seedAdmin();

