const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

// Load environment variables
dotenv.config();

// Create admin user in User collection
const createUserAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coolrentals', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Get admin details from command line arguments or use defaults
    const name = process.argv[2] || 'Admin';
    const email = process.argv[3] || 'admin@example.com';
    const password = process.argv[4] || 'password123';
    const phone = process.argv[5] || '1234567890';

    // Check if admin already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists with this email:', email);
      if (existingUser.role === 'admin') {
        console.log('Admin user already exists. Updating password...');
        existingUser.password = password;
        existingUser.name = name;
        existingUser.phone = phone;
        await existingUser.save();
        console.log('Admin user updated successfully!');
        console.log('Email:', existingUser.email);
        console.log('Password:', password);
        console.log('Role:', existingUser.role);
        process.exit(0);
      } else {
        console.log('User exists but is not an admin. Exiting...');
        process.exit(1);
      }
    }

    // Create admin user
    const admin = await User.create({
      name,
      email,
      password,
      phone,
      role: 'admin',
      homeAddress: '',
      interestedIn: []
    });

    console.log('\n✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:    ', admin.email);
    console.log('Password: ', password);
    console.log('Role:     ', admin.role);
    console.log('Name:     ', admin.name);
    console.log('Phone:    ', admin.phone);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
};

createUserAdmin();

