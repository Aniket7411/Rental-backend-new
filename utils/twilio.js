const twilio = require('twilio');

// Initialize Twilio client
let twilioClient = null;

const initializeTwilio = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.warn('⚠️  Twilio credentials not found. OTP functionality will be disabled.');
    return null;
  }

  try {
    twilioClient = twilio(accountSid, authToken);
    console.log('✅ Twilio client initialized successfully');
    return twilioClient;
  } catch (error) {
    console.error('❌ Error initializing Twilio client:', error.message);
    return null;
  }
};

// Initialize on module load
if (!twilioClient) {
  initializeTwilio();
}

/**
 * Send OTP via SMS using Twilio
 * @param {string} phoneNumber - Phone number (10 digits, without country code)
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<Object>} - Twilio message object
 */
const sendOTP = async (phoneNumber, otp) => {
  // Ensure Twilio is initialized
  if (!twilioClient) {
    twilioClient = initializeTwilio();
  }

  if (!twilioClient) {
    throw new Error('Twilio client not initialized. Please check your environment variables.');
  }

  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!twilioPhoneNumber) {
    throw new Error('TWILIO_PHONE_NUMBER environment variable is not set');
  }

  // Normalize Twilio phone number to E.164 format
  // Remove any spaces, dashes, or parentheses
  let normalizedTwilioNumber = twilioPhoneNumber.trim().replace(/[\s\-\(\)]/g, '');

  // Ensure it starts with +
  if (!normalizedTwilioNumber.startsWith('+')) {
    // If it starts with a country code without +, add it
    if (normalizedTwilioNumber.startsWith('91')) {
      normalizedTwilioNumber = '+' + normalizedTwilioNumber;
    } else if (normalizedTwilioNumber.length === 10) {
      // If it's 10 digits, assume it's a US number and add +1
      normalizedTwilioNumber = '+1' + normalizedTwilioNumber;
    } else {
      // Otherwise, just add +
      normalizedTwilioNumber = '+' + normalizedTwilioNumber;
    }
  }

  // Format recipient phone number: add +91 country code for India
  const formattedPhone = phoneNumber.startsWith('+')
    ? phoneNumber
    : `+91${phoneNumber}`;

  try {
    const message = await twilioClient.messages.create({
      body: `Your OTP is ${otp}. Valid for 10 minutes. Do not share this code with anyone.`,
      from: normalizedTwilioNumber,
      to: formattedPhone
    });

    console.log(`✅ OTP sent to ${formattedPhone}. Message SID: ${message.sid}`);
    return message;
  } catch (error) {
    console.error(`❌ Error sending OTP to ${formattedPhone}:`, error.message);

    // Provide helpful error messages for common issues
    if (error.message.includes('not a Twilio phone number')) {
      const helpfulMessage = `The phone number ${normalizedTwilioNumber} is not a valid Twilio phone number. Please:
1. Go to Twilio Console → Phone Numbers → Buy a number
2. Purchase a phone number for your account
3. Update TWILIO_PHONE_NUMBER in your .env file with the exact number from Twilio
4. Restart your server`;
      console.error(`\n💡 ${helpfulMessage}\n`);
      throw new Error(`Failed to send OTP: ${error.message}. ${helpfulMessage}`);
    }

    throw new Error(`Failed to send OTP: ${error.message}`);
  }
};

/**
 * Generate a 6-digit OTP
 * @returns {string} - 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generate a unique session ID
 * @returns {string} - Unique session ID
 */
const generateSessionId = () => {
  return require('crypto').randomBytes(32).toString('hex');
};

module.exports = {
  sendOTP,
  generateOTP,
  generateSessionId,
  initializeTwilio
};

