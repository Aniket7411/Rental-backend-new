/**
 * Migration Script: Add 12 and 24 Months Pricing to Existing Products
 * 
 * This script adds 12 and 24 months pricing to existing products that don't have them.
 * 
 * Usage:
 *   node scripts/migrate-12-24-months-pricing.js
 * 
 * Options:
 *   - Calculate 12 months as 10% increase from 11 months
 *   - Calculate 24 months as 80% of (12 months * 2), offering discount
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import Product model
const Product = require('../models/Product');

async function migratePrices() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/coolrentals';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Find products missing 12 or 24 months pricing
    const products = await Product.find({
      $or: [
        { 'price.12': { $exists: false } },
        { 'price.12': null },
        { 'price.24': { $exists: false } },
        { 'price.24': null }
      ]
    });
    
    console.log(`Found ${products.length} products to update`);
    
    if (products.length === 0) {
      console.log('No products need updating. Migration complete.');
      await mongoose.disconnect();
      return;
    }
    
    let updated = 0;
    let skipped = 0;
    
    for (const product of products) {
      const hasPrice11 = product.price && product.price[11] && product.price[11] > 0;
      
      if (!hasPrice11) {
        console.warn(`Product ${product._id} (${product.name || 'Unnamed'}) missing 11 months price, skipping`);
        skipped++;
        continue;
      }
      
      let needsUpdate = false;
      
      // Calculate 12 months price (10% increase from 11 months)
      if (!product.price[12] || product.price[12] <= 0) {
        product.price[12] = Math.round(product.price[11] * 1.1);
        needsUpdate = true;
        console.log(`  - Setting 12 months price: ₹${product.price[12]} (10% increase from 11 months)`);
      }
      
      // Calculate 24 months price (80% of 12 months * 2, offering discount)
      if (!product.price[24] || product.price[24] <= 0) {
        const calculated24 = Math.round(product.price[12] * 1.8);
        product.price[24] = calculated24;
        needsUpdate = true;
        console.log(`  - Setting 24 months price: ₹${product.price[24]} (80% of 12 months * 2)`);
      }
      
      if (needsUpdate) {
        try {
          await product.save();
          updated++;
          console.log(`✓ Updated product: ${product.name || product._id}`);
        } catch (error) {
          console.error(`✗ Failed to update product ${product._id}:`, error.message);
          skipped++;
        }
      }
    }
    
    console.log('\n=== Migration Summary ===');
    console.log(`Total products found: ${products.length}`);
    console.log(`Successfully updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log('Migration complete!');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration
migratePrices();

