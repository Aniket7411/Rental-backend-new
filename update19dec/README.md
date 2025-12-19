# ASH Enterprises Backend API

Backend API for ASH Enterprises - AC Rental and Service Management System.

## Features

- AC Rental Management
- Service Request Management
- Rental Inquiry Management
- Lead Capture
- Admin Dashboard APIs
- JWT Authentication
- Image Upload Support
- Email Notifications
- Rate Limiting
- CORS Support

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- Multer (File Upload)
- Nodemailer (Email Notifications)

## Installation

1. Clone the repository
```bash
git clone <repository-url>
cd acb
```

2. Install dependencies
```bash
npm install
```

3. Create `.env` file in the root directory
```env
PORT=5000
BASE_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

MONGODB_URI=mongodb://localhost:27017/coolrentals

JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRE=24h

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-email-password
EMAIL_FROM=your-email@gmail.com
ADMIN_EMAIL=admin@coolrentals.com
```

4. Create uploads directory
```bash
mkdir uploads
```

5. Start MongoDB (if running locally)
```bash
mongod
```

6. Run the server
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Public Endpoints

- `GET /api/acs` - Get all ACs (with filters)
- `GET /api/acs/:id` - Get AC by ID
- `POST /api/acs/:id/inquiry` - Create rental inquiry
- `POST /api/service-requests` - Create service request
- `POST /api/leads` - Create lead
- `POST /api/contact` - Submit contact form
- `POST /api/vendor-listing-request` - Submit vendor listing request

### Admin Endpoints (Require Authentication)

- `POST /api/admin/login` - Admin login
- `GET /api/admin/acs` - Get all ACs (Admin)
- `POST /api/admin/acs` - Add new AC
- `PATCH /api/admin/acs/:id` - Update AC
- `DELETE /api/admin/acs/:id` - Delete AC
- `GET /api/admin/service-leads` - Get service leads
- `PATCH /api/admin/service-leads/:id` - Update lead status
- `GET /api/admin/rental-inquiries` - Get rental inquiries
- `PATCH /api/admin/rental-inquiries/:id` - Update inquiry status

## Authentication

Admin endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

## Image Upload

Image uploads are handled using Multer. Images are stored in the `uploads/` directory by default. For production, consider using Cloudinary or AWS S3.

To use Cloudinary:
1. Update `utils/upload.js` to use Cloudinary storage
2. Set Cloudinary environment variables
3. Uncomment Cloudinary configuration in `utils/upload.js`

## Notifications

The system sends email notifications to admin when:
- A rental inquiry is created
- A service request is created
- A lead is captured

Configure email settings in `.env` file. For production, consider using a service like SendGrid or AWS SES.

## Database Models

- **AC**: AC listings
- **ServiceRequest**: Service requests
- **RentalInquiry**: Rental inquiries
- **Lead**: Leads
- **Contact**: Contact form submissions
- **VendorListing**: Vendor listing requests
- **Admin**: Admin users

## Creating Admin User

To create an admin user, you can use MongoDB shell or create a script:

```javascript
const Admin = require('./models/Admin');
const admin = new Admin({
  name: 'Admin Name',
  email: 'admin@example.com',
  password: 'password123'
});
admin.save();
```

Or use MongoDB shell:
```javascript
use coolrentals
db.admins.insertOne({
  name: "Admin Name",
  email: "admin@example.com",
  password: "$2a$10$...", // bcrypt hash
  role: "admin",
  createdAt: new Date()
})
```

## Error Handling

All errors are returned in a consistent format:

```json
{
  "success": false,
  "message": "Error message here"
}
```

## Rate Limiting

Rate limiting is implemented for all endpoints:
- 100 requests per 15 minutes per IP

## CORS

CORS is configured to allow requests from the frontend URL specified in `.env`.

## Environment Variables

- `PORT`: Server port (default: 5000)
- `BASE_URL`: Base URL for the API
- `FRONTEND_URL`: Frontend URL for CORS
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_EXPIRE`: JWT token expiration time
- `EMAIL_HOST`: SMTP host
- `EMAIL_PORT`: SMTP port
- `EMAIL_USER`: SMTP username
- `EMAIL_PASSWORD`: SMTP password
- `EMAIL_FROM`: Email sender address
- `ADMIN_EMAIL`: Admin email for notifications

## Project Structure

```
.
├── config/
│   └── database.js
├── controllers/
│   ├── acController.js
│   ├── adminController.js
│   ├── contactController.js
│   ├── leadController.js
│   ├── rentalInquiryController.js
│   ├── serviceRequestController.js
│   └── vendorController.js
├── models/
│   ├── AC.js
│   ├── Admin.js
│   ├── Contact.js
│   ├── Lead.js
│   ├── RentalInquiry.js
│   ├── ServiceRequest.js
│   └── VendorListing.js
├── middleware/
│   ├── auth.js
│   ├── errorHandler.js
│   └── validation.js
├── routes/
│   ├── acs.js
│   ├── admin.js
│   ├── contact.js
│   ├── leads.js
│   ├── rentalInquiries.js
│   ├── serviceRequests.js
│   └── vendor.js
├── utils/
│   ├── jwt.js
│   ├── notifications.js
│   └── upload.js
├── uploads/
├── server.js
├── package.json
└── README.md
```

## License

ISC

