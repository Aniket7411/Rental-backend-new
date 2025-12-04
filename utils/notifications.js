const nodemailer = require('nodemailer');

// Configure email transporter
// Update with your email service credentials
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Send notification email to admin
exports.notifyAdmin = async (subject, message, html = null) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@coolrentals.com';
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: adminEmail,
      subject: subject,
      text: message,
      html: html || message
    };

    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      await transporter.sendMail(mailOptions);
      console.log('Notification email sent to admin');
    } else {
      console.log('Email not configured. Notification:', subject, message);
    }
  } catch (error) {
    console.error('Error sending notification email:', error);
    // Don't throw error - notification failure shouldn't break the main flow
  }
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

