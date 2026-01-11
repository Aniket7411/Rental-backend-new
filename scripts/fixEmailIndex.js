/**
 * Database Migration Script: Fix Email Index to Sparse
 * 
 * This script fixes the email index in the users collection to be sparse,
 * allowing multiple users to have null email values.
 * 
 * Run this script once to fix the database index:
 * node scripts/fixEmailIndex.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const fixEmailIndex = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coolrentals');
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Get current indexes
    const indexes = await usersCollection.indexes();
    console.log('Current indexes:', indexes);

    // Check if email index exists and if it's sparse
    const emailIndex = indexes.find(idx => idx.key && idx.key.email);
    
    if (emailIndex) {
      console.log('Found email index:', emailIndex);
      
      // Drop the existing email index if it's not sparse
      if (!emailIndex.sparse) {
        console.log('⚠️  Email index is not sparse. Dropping existing index...');
        try {
          await usersCollection.dropIndex('email_1');
          console.log('✅ Dropped non-sparse email index');
        } catch (dropError) {
          // Index might have a different name
          console.log('Trying to drop index by key...');
          await usersCollection.dropIndex({ email: 1 });
          console.log('✅ Dropped email index');
        }
      } else {
        console.log('✅ Email index is already sparse. No changes needed.');
        await mongoose.disconnect();
        return;
      }
    }

    // Create new sparse unique index on email
    console.log('Creating sparse unique index on email...');
    await usersCollection.createIndex(
      { email: 1 },
      { 
        unique: true, 
        sparse: true,
        name: 'email_1_sparse'
      }
    );
    console.log('✅ Created sparse unique index on email');

    // Verify the new index
    const newIndexes = await usersCollection.indexes();
    const newEmailIndex = newIndexes.find(idx => idx.key && idx.key.email);
    console.log('New email index:', newEmailIndex);
    
    if (newEmailIndex && newEmailIndex.sparse) {
      console.log('✅ Email index is now sparse! Multiple users can have null email.');
    } else {
      console.log('⚠️  Warning: Email index might not be sparse. Please verify manually.');
    }

    await mongoose.disconnect();
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing email index:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run the migration
fixEmailIndex();

