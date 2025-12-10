const nodemailer = require('nodemailer');

// Configure email transporter
// Update with your email service credentials
let transporter = null;

// Create transporter only if credentials are available
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        // Do not fail on invalid certs
        rejectUnauthorized: false
      },
      connectionTimeout: 10000, // 10 seconds timeout for connection
      greetingTimeout: 10000, // 10 seconds timeout for greeting
      socketTimeout: 10000, // 10 seconds timeout for socket
      // Add retry logic
      pool: true,
      maxConnections: 1,
      maxMessages: 3
    });
  }

  return transporter;
};

// Send notification email to admin (with timeout protection)
exports.notifyAdmin = async (subject, message, html = null) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'ashenterprises148@gmail.com';

    const emailTransporter = createTransporter();
    if (!emailTransporter) {
      console.log('Email not configured. Notification:', subject, message);
      return;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: adminEmail,
      subject: subject,
      text: message,
      html: html || message
    };

    // Add timeout wrapper to prevent hanging
    const sendEmailWithTimeout = async () => {
      return Promise.race([
        emailTransporter.sendMail(mailOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Email send timeout after 10 seconds')), 10000)
        )
      ]);
    };

    await sendEmailWithTimeout();
    console.log('Notification email sent to admin');
  } catch (error) {
    console.error('Error sending notification email:', error);
    // Don't throw error - notification failure shouldn't break the main flow
  }
};

// Non-blocking version that runs in background (fire and forget)
exports.notifyAdminAsync = (subject, message, html = null) => {
  // Run in background without blocking
  exports.notifyAdmin(subject, message, html).catch(error => {
    console.error('Background email notification failed:', error);
  });
};

// Notify admin about rental inquiry
exports.notifyRentalInquiry = async (inquiry) => {
  const subject = 'New Rental Inquiry Received';
  const message = `
    A new rental inquiry has been received:
    
    Name: ${inquiry.name}
    Email: ${inquiry.email}
    Phone: ${inquiry.phone}
    Message: ${inquiry.message || 'N/A'}
    AC ID: ${inquiry.acId}
    
    Please check the admin panel for details.
  `;

  const html = `
    <h2>New Rental Inquiry Received</h2>
    <p><strong>Name:</strong> ${inquiry.name}</p>
    <p><strong>Email:</strong> ${inquiry.email}</p>
    <p><strong>Phone:</strong> ${inquiry.phone}</p>
    <p><strong>Message:</strong> ${inquiry.message || 'N/A'}</p>
    <p><strong>AC ID:</strong> ${inquiry.acId}</p>
    <p>Please check the admin panel for details.</p>
  `;

  await exports.notifyAdmin(subject, message, html);
};

// Notify admin about service request
exports.notifyServiceRequest = async (serviceRequest) => {
  const subject = 'New Service Request Received';
  const user = serviceRequest.userId || {};
  const message = `
    A new service request has been received:
    
    User: ${user.name || 'N/A'} (${user.email || 'N/A'})
    Service Type: ${serviceRequest.serviceType}
    Product Type: ${serviceRequest.productType}
    Brand: ${serviceRequest.brand || 'N/A'}
    Model: ${serviceRequest.model || 'N/A'}
    Description: ${serviceRequest.description}
    Address: ${serviceRequest.address}
    Preferred Date: ${serviceRequest.preferredDate || 'N/A'}
    Preferred Time: ${serviceRequest.preferredTime || 'N/A'}
    
    Please check the admin panel for details.
  `;

  const html = `
    <h2>New Service Request Received</h2>
    <p><strong>User:</strong> ${user.name || 'N/A'} (${user.email || 'N/A'})</p>
    <p><strong>Service Type:</strong> ${serviceRequest.serviceType}</p>
    <p><strong>Product Type:</strong> ${serviceRequest.productType}</p>
    <p><strong>Brand:</strong> ${serviceRequest.brand || 'N/A'}</p>
    <p><strong>Model:</strong> ${serviceRequest.model || 'N/A'}</p>
    <p><strong>Description:</strong> ${serviceRequest.description}</p>
    <p><strong>Address:</strong> ${serviceRequest.address}</p>
    <p><strong>Preferred Date:</strong> ${serviceRequest.preferredDate || 'N/A'}</p>
    <p><strong>Preferred Time:</strong> ${serviceRequest.preferredTime || 'N/A'}</p>
    <p>Please check the admin panel for details.</p>
  `;

  await exports.notifyAdmin(subject, message, html);
};

// Notify admin about new lead
exports.notifyLead = async (lead) => {
  const subject = 'New Lead Captured';
  const message = `
    A new lead has been captured:
    
    Name: ${lead.name}
    Phone: ${lead.phone}
    Interest: ${lead.interest}
    Source: ${lead.source}
    
    Please contact the lead soon.
  `;

  const html = `
    <h2>New Lead Captured</h2>
    <p><strong>Name:</strong> ${lead.name}</p>
    <p><strong>Phone:</strong> ${lead.phone}</p>
    <p><strong>Interest:</strong> ${lead.interest}</p>
    <p><strong>Source:</strong> ${lead.source}</p>
    <p>Please contact the lead soon.</p>
  `;

  await exports.notifyAdmin(subject, message, html);
};
// Send password reset email to user
exports.sendPasswordResetEmail = async (email, resetUrl, userName = 'User') => {
  try {
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      const errorMsg = 'Email service not configured. Please set EMAIL_USER and EMAIL_PASSWORD in environment variables';
      console.error('❌ Email credentials not configured.');
      console.error('📧 EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'NOT SET');
      console.error('📧 EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? 'Set' : 'NOT SET');
      console.error('📝 See chnages/ENV_SETUP.md for instructions on setting up Gmail App Password');
      throw new Error(errorMsg);
    }

    // Create/get transporter
    const emailTransporter = createTransporter();
    if (!emailTransporter) {
      throw new Error('Failed to create email transporter. Check email credentials.');
    }

    const subject = 'Password Reset Request - ASH Enterprises';

    const text = `
Hello ${userName},

You requested to reset your password for your ASH Enterprises account.

Click the following link to reset your password:
${resetUrl}

This link will expire in 10 minutes.

If you did not request this password reset, please ignore this email and your password will remain unchanged.

Best regards,
ASH Enterprises Team
    `;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Password Reset Request</h2>
    
    <p>Hello ${userName},</p>
    
    <p>You requested to reset your password for your ASH Enterprises account.</p>
    
    <p style="margin: 30px 0;">
      <a href="${resetUrl}" 
         style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Reset Password
      </a>
    </p>
    
    <p style="color: #7f8c8d; font-size: 14px;">
      Or copy and paste this link into your browser:<br>
      <a href="${resetUrl}" style="color: #3498db; word-break: break-all;">${resetUrl}</a>
    </p>
    
    <p style="color: #e74c3c; font-size: 14px; font-weight: bold;">
      ⚠️ This link will expire in 10 minutes.
    </p>
    
    <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      If you did not request this password reset, please ignore this email and your password will remain unchanged.
    </p>
    
    <p style="margin-top: 30px;">
      Best regards,<br>
      <strong>ASH Enterprises Team</strong>
    </p>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `"ASH Enterprises" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      text: text,
      html: html
    };

    // Verify transporter connection before sending
    try {
      await emailTransporter.verify();
      console.log('✅ Email transporter verified successfully');
    } catch (verifyError) {
      console.error('❌ Email transporter verification failed:', verifyError.message);
      console.error('Full error:', verifyError);
      throw new Error(`Email service connection failed: ${verifyError.message}`);
    }

    // Send the email
    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email}`);
    console.log('Email message ID:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset email:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error response:', error.response);
    console.error('Full error:', error);

    // Provide more specific error messages
    if (error.code === 'EAUTH') {
      throw new Error('Email authentication failed. Please check EMAIL_USER and EMAIL_PASSWORD.');
    } else if (error.code === 'ECONNECTION') {
      throw new Error('Failed to connect to email server. Check EMAIL_HOST and EMAIL_PORT.');
    } else if (error.message.includes('not configured')) {
      throw error;
    } else {
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }
};

// SMS notification (placeholder - integrate with SMS service like Twilio)
exports.sendSMS = async (phone, message) => {
  try {
    // Implement SMS sending logic here
    // Example with Twilio:
    /*
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });
    */
    console.log('SMS notification (not implemented):', phone, message);
  } catch (error) {
    console.error('Error sending SMS:', error);
  }
};

