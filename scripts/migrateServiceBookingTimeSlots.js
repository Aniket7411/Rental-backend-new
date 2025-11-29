/**
 * Migration Script: Convert Service Booking Time Slots
 * 
 * This script migrates existing service bookings from old time formats
 * (e.g., "10:00 AM", "12:00 PM") to new time slot range formats
 * (e.g., "10-12", "12-2", "2-4", "4-6", "6-8")
 * 
 * Usage: node scripts/migrateServiceBookingTimeSlots.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ServiceBooking = require('../models/ServiceBooking');

// Time slot mapping from old format to new format
const timeSlotMapping = {
  // 10-12 slot (10 AM - 12 PM)
  '09:00 AM': '10-12',
  '09:00': '10-12',
  '9:00 AM': '10-12',
  '9:00': '10-12',
  '10:00 AM': '10-12',
  '10:00': '10-12',
  '10 AM': '10-12',
  '11:00 AM': '10-12',
  '11:00': '10-12',
  '11 AM': '10-12',
  'preferredTime': '10-12', // If preferredTime exists but doesn't match, default to 10-12
  
  // 12-2 slot (12 PM - 2 PM)
  '12:00 PM': '12-2',
  '12:00': '12-2',
  '12 PM': '12-2',
  '12:00': '12-2',
  '01:00 PM': '12-2',
  '01:00': '12-2',
  '1:00 PM': '12-2',
  '1:00': '12-2',
  '1 PM': '12-2',
  '13:00': '12-2',
  
  // 2-4 slot (2 PM - 4 PM)
  '02:00 PM': '2-4',
  '02:00': '2-4',
  '2:00 PM': '2-4',
  '2:00': '2-4',
  '2 PM': '2-4',
  '03:00 PM': '2-4',
  '03:00': '2-4',
  '3:00 PM': '2-4',
  '3:00': '2-4',
  '3 PM': '2-4',
  '14:00': '2-4',
  '15:00': '2-4',
  
  // 4-6 slot (4 PM - 6 PM)
  '04:00 PM': '4-6',
  '04:00': '4-6',
  '4:00 PM': '4-6',
  '4:00': '4-6',
  '4 PM': '4-6',
  '05:00 PM': '4-6',
  '05:00': '4-6',
  '5:00 PM': '4-6',
  '5:00': '4-6',
  '5 PM': '4-6',
  '16:00': '4-6',
  '17:00': '4-6',
  
  // 6-8 slot (6 PM - 8 PM)
  '06:00 PM': '6-8',
  '06:00': '6-8',
  '6:00 PM': '6-8',
  '6:00': '6-8',
  '6 PM': '6-8',
  '07:00 PM': '6-8',
  '07:00': '6-8',
  '7:00 PM': '6-8',
  '7:00': '6-8',
  '7 PM': '6-8',
  '08:00 PM': '6-8',
  '08:00': '6-8',
  '8:00 PM': '6-8',
  '8:00': '6-8',
  '8 PM': '6-8',
  '18:00': '6-8',
  '19:00': '6-8',
  '20:00': '6-8'
};

// Helper function to normalize time string
const normalizeTime = (time) => {
  if (!time) return null;
  return time.trim().replace(/\s+/g, ' ');
};

// Main migration function
const migrateTimeSlots = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coolrentals', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Find all bookings
    const bookings = await ServiceBooking.find({});
    console.log(`Found ${bookings.length} service bookings to migrate`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const booking of bookings) {
      try {
        let timeToMigrate = null;
        let needsMigration = false;

        // Check if booking has old time format (preferredTime or time field)
        if (booking.preferredTime) {
          timeToMigrate = normalizeTime(booking.preferredTime);
          needsMigration = true;
        } else if (booking.time && !['10-12', '12-2', '2-4', '4-6', '6-8'].includes(booking.time)) {
          timeToMigrate = normalizeTime(booking.time);
          needsMigration = true;
        }

        if (needsMigration && timeToMigrate) {
          // Find matching time slot
          const newTimeSlot = timeSlotMapping[timeToMigrate];
          
          if (newTimeSlot) {
            // Update booking
            booking.time = newTimeSlot;
            
            // Remove preferredTime if it exists (cleanup old field)
            if (booking.preferredTime) {
              booking.preferredTime = undefined;
            }
            
            // Also migrate preferredDate to date if needed
            if (booking.preferredDate && !booking.date) {
              booking.date = booking.preferredDate;
              booking.preferredDate = undefined;
            }

            await booking.save();
            migrated++;
            console.log(`✓ Migrated booking ${booking._id}: "${timeToMigrate}" → "${newTimeSlot}"`);
          } else {
            // No mapping found - set default or skip
            console.log(`⚠ No mapping found for "${timeToMigrate}" in booking ${booking._id}, skipping...`);
            skipped++;
          }
        } else {
          // Already in new format or no time field
          skipped++;
        }
      } catch (error) {
        console.error(`✗ Error migrating booking ${booking._id}:`, error.message);
        errors++;
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total bookings: ${bookings.length}`);
    console.log(`Migrated: ${migrated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log('========================\n');

    // Close connection
    await mongoose.connection.close();
    console.log('Migration completed. Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

// Run migration
if (require.main === module) {
  migrateTimeSlots();
}

module.exports = { migrateTimeSlots, timeSlotMapping };

