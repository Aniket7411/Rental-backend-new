# Razorpay Payment Integration - Frontend Guide

This document provides a comprehensive guide for integrating Razorpay payment gateway in the frontend application.

## Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [API Endpoints](#api-endpoints)
4. [Frontend Implementation](#frontend-implementation)
5. [Error Handling](#error-handling)
6. [Payment Flow](#payment-flow)
7. [Notifications](#notifications)
8. [Testing](#testing)

---

## Overview

The Razorpay integration allows users to make secure payments for orders. The integration includes:

- **Order Creation**: Create Razorpay order before payment
- **Payment Processing**: Handle payment success/failure
- **Payment Verification**: Verify payment signature on backend
- **Webhook Support**: Handle payment status updates via webhooks
- **Error Handling**: Comprehensive error handling with user notifications

---

## Setup

### 1. Install Razorpay Checkout

```bash
npm install razorpay
```

Or include via CDN in your HTML:

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

### 2. Environment Variables

Add Razorpay Key ID to your frontend environment (public key is safe to expose):

```env
REACT_APP_RAZORPAY_KEY_ID=your_razorpay_key_id
```

**Note**: The Razorpay Key ID is public and safe to expose in frontend code. The secret key is only used on the backend.

### 3. Backend Configuration

Ensure backend has these environment variables:

```env
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret (optional, falls back to key_secret)
```

### 4. Webhook Configuration (Backend)

To enable automatic payment status updates via webhooks:

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Add webhook URL: `https://your-backend-url.com/api/payments/webhook/razorpay`
3. Select events:
   - `payment.captured`
   - `payment.failed`
   - `payment.authorized`
4. Copy the webhook secret and add to backend `.env` as `RAZORPAY_WEBHOOK_SECRET`

**Note**: Webhooks are optional but recommended for production. The frontend payment flow works without webhooks.

---

## API Endpoints

### Base URL

```
Production: https://rental-backend-new.onrender.com
Development: http://localhost:5000
```

### 1. Create Razorpay Order

**POST** `/api/payments/create-order`

**Headers:**
```
Authorization: Bearer <user_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "orderId": "ORD-2025-001",
  "amount": 5000.00
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Razorpay order created successfully",
  "data": {
    "paymentId": "PAY-1234567890-1234",
    "orderId": "ORD-2025-001",
    "amount": 5000.00,
    "currency": "INR",
    "razorpayOrderId": "order_ABC123xyz",
    "key": "rzp_test_xxxxx"
  }
}
```

**Error Responses:**

- `400`: Validation Error
```json
{
  "success": false,
  "message": "Order ID and amount are required",
  "error": "VALIDATION_ERROR"
}
```

- `404`: Order Not Found
```json
{
  "success": false,
  "message": "Order not found",
  "error": "NOT_FOUND"
}
```

- `500`: Payment Gateway Error
```json
{
  "success": false,
  "message": "Failed to create payment order. Please try again.",
  "error": "PAYMENT_GATEWAY_ERROR"
}
```

---

### 2. Verify Payment

**POST** `/api/payments/verify`

**Headers:**
```
Authorization: Bearer <user_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "razorpay_order_id": "order_ABC123xyz",
  "razorpay_payment_id": "pay_XYZ789abc",
  "razorpay_signature": "signature_hash_here",
  "paymentId": "PAY-1234567890-1234"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "paymentId": "PAY-1234567890-1234",
    "status": "Completed",
    "orderId": "ORD-2025-001",
    "transactionId": "pay_XYZ789abc"
  }
}
```

**Error Responses:**

- `400`: Signature Mismatch
```json
{
  "success": false,
  "message": "Invalid payment signature. Payment verification failed.",
  "error": "SIGNATURE_MISMATCH"
}
```

---

### 3. Process Payment (Alternative - Verifies and Processes)

**POST** `/api/payments/process`

**Headers:**
```
Authorization: Bearer <user_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "orderId": "ORD-2025-001",
  "amount": 5000.00,
  "paymentMethod": "razorpay",
  "paymentDetails": {
    "razorpay_order_id": "order_ABC123xyz",
    "razorpay_payment_id": "pay_XYZ789abc",
    "razorpay_signature": "signature_hash_here"
  }
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "paymentId": "PAY-1234567890-1234",
    "orderId": "ORD-2025-001",
    "amount": 5000.00,
    "status": "Completed",
    "transactionId": "pay_XYZ789abc",
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

---

### 4. Get Payment Status

**GET** `/api/payments/:paymentId`

**Headers:**
```
Authorization: Bearer <user_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "payment_mongodb_id",
    "paymentId": "PAY-1234567890-1234",
    "orderId": "ORD-2025-001",
    "amount": 5000.00,
    "status": "Completed",
    "paymentMethod": "razorpay",
    "transactionId": "pay_XYZ789abc",
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

---

## Frontend Implementation

### Step 1: Create Razorpay Order Service

```javascript
// services/paymentService.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://rental-backend-new.onrender.com';

export const createRazorpayOrder = async (orderId, amount, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/payments/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ orderId, amount })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create payment order');
    }

    return data.data;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw error;
  }
};

export const verifyPayment = async (paymentDetails, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/payments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(paymentDetails)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Payment verification failed');
    }

    return data.data;
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
};
```

---

### Step 2: Razorpay Checkout Component

```jsx
// components/PaymentCheckout.jsx
import { useState, useEffect } from 'react';
import { createRazorpayOrder, verifyPayment } from '../services/paymentService';
import { toast } from 'react-toastify'; // or your notification library

const PaymentCheckout = ({ orderId, amount, onPaymentSuccess, onPaymentFailure, userToken }) => {
  const [loading, setLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    // Load Razorpay checkout script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => {
      toast.error('Failed to load payment gateway. Please refresh the page.');
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = async () => {
    if (!razorpayLoaded) {
      toast.error('Payment gateway is loading. Please wait...');
      return;
    }

    if (!window.Razorpay) {
      toast.error('Payment gateway not available. Please refresh the page.');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create Razorpay order on backend
      const orderData = await createRazorpayOrder(orderId, amount, userToken);

      // Step 2: Initialize Razorpay checkout
      const options = {
        key: orderData.key || process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: Math.round(orderData.amount * 100), // Convert to paise
        currency: orderData.currency || 'INR',
        name: 'CoolRentals & Services',
        description: `Payment for Order ${orderData.orderId}`,
        order_id: orderData.razorpayOrderId,
        handler: async function (response) {
          // Step 3: Verify payment on backend
          try {
            setLoading(true);
            
            const verificationData = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentId: orderData.paymentId
            }, userToken);

            // Payment successful
            toast.success('Payment successful! Your order has been confirmed.');
            
            if (onPaymentSuccess) {
              onPaymentSuccess(verificationData);
            }
          } catch (error) {
            // Payment verification failed
            console.error('Payment verification error:', error);
            toast.error(error.message || 'Payment verification failed. Please contact support.');
            
            if (onPaymentFailure) {
              onPaymentFailure(error);
            }
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: '', // Get from user profile
          email: '', // Get from user profile
          contact: '' // Get from user profile
        },
        theme: {
          color: '#3498db' // Your brand color
        },
        modal: {
          ondismiss: function() {
            // User closed the payment modal
            setLoading(false);
            toast.info('Payment cancelled');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      
      razorpay.on('payment.failed', function (response) {
        // Payment failed
        const errorMessage = response.error?.description || 'Payment failed. Please try again.';
        console.error('Payment failed:', response.error);
        toast.error(errorMessage);
        setLoading(false);
        
        if (onPaymentFailure) {
          onPaymentFailure(new Error(errorMessage));
        }
      });

      // Open Razorpay checkout
      razorpay.open();
      
    } catch (error) {
      console.error('Payment initiation error:', error);
      toast.error(error.message || 'Failed to initiate payment. Please try again.');
      setLoading(false);
      
      if (onPaymentFailure) {
        onPaymentFailure(error);
      }
    }
  };

  return (
    <div>
      <button
        onClick={handlePayment}
        disabled={loading || !razorpayLoaded}
        className="payment-button"
      >
        {loading ? 'Processing...' : `Pay ₹${amount.toFixed(2)}`}
      </button>
    </div>
  );
};

export default PaymentCheckout;
```

---

### Step 3: Complete Payment Page Example

```jsx
// pages/PaymentPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PaymentCheckout from '../components/PaymentCheckout';
import { toast } from 'react-toastify';

const PaymentPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const userToken = localStorage.getItem('token'); // Get from your auth context

  useEffect(() => {
    // Fetch order details
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/orders/${orderId}`,
        {
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        }
      );

      const data = await response.json();
      
      if (data.success) {
        setOrder(data.data);
      } else {
        toast.error('Order not found');
        navigate('/orders');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (paymentData) => {
    // Redirect to success page or order details
    navigate(`/orders/${orderId}?payment=success`);
  };

  const handlePaymentFailure = (error) => {
    // Stay on payment page or redirect to order details
    console.error('Payment failed:', error);
  };

  if (loading) {
    return <div>Loading order details...</div>;
  }

  if (!order) {
    return <div>Order not found</div>;
  }

  if (order.paymentStatus === 'paid') {
    return (
      <div>
        <h2>Order Already Paid</h2>
        <p>This order has already been paid.</p>
        <button onClick={() => navigate(`/orders/${orderId}`)}>
          View Order Details
        </button>
      </div>
    );
  }

  return (
    <div className="payment-page">
      <h1>Complete Payment</h1>
      
      <div className="order-summary">
        <h2>Order Summary</h2>
        <p><strong>Order ID:</strong> {order.orderId}</p>
        <p><strong>Total Amount:</strong> ₹{order.total.toFixed(2)}</p>
        {order.discount > 0 && (
          <p><strong>Discount:</strong> -₹{order.discount.toFixed(2)}</p>
        )}
        <p><strong>Final Amount:</strong> ₹{order.finalTotal.toFixed(2)}</p>
      </div>

      <PaymentCheckout
        orderId={orderId}
        amount={order.finalTotal}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentFailure={handlePaymentFailure}
        userToken={userToken}
      />
    </div>
  );
};

export default PaymentPage;
```

---

## Error Handling

### Common Error Scenarios

#### 1. Network Errors

```javascript
try {
  await createRazorpayOrder(orderId, amount, token);
} catch (error) {
  if (error.message.includes('fetch') || error.message.includes('network')) {
    toast.error('Network error. Please check your internet connection and try again.');
  } else {
    toast.error(error.message || 'An error occurred. Please try again.');
  }
}
```

#### 2. Payment Gateway Errors

```javascript
razorpay.on('payment.failed', function (response) {
  const error = response.error;
  
  let errorMessage = 'Payment failed. ';
  
  if (error.code === 'BAD_REQUEST_ERROR') {
    errorMessage += 'Invalid payment details.';
  } else if (error.code === 'GATEWAY_ERROR') {
    errorMessage += 'Payment gateway error. Please try again.';
  } else if (error.code === 'NETWORK_ERROR') {
    errorMessage += 'Network error. Please check your connection.';
  } else {
    errorMessage += error.description || 'Please try again.';
  }
  
  toast.error(errorMessage);
});
```

#### 3. Signature Verification Errors

```javascript
try {
  await verifyPayment(paymentDetails, token);
} catch (error) {
  if (error.message.includes('signature')) {
    toast.error('Payment verification failed. Please contact support with your payment ID.');
    // Log payment details for support
    console.error('Payment verification failed:', paymentDetails);
  } else {
    toast.error(error.message || 'Payment verification failed.');
  }
}
```

---

## Payment Flow

### Complete Payment Flow Diagram

```
1. User clicks "Pay Now"
   ↓
2. Frontend calls: POST /api/payments/create-order
   ↓
3. Backend creates Razorpay order and returns order details
   ↓
4. Frontend initializes Razorpay checkout with order details
   ↓
5. User completes payment on Razorpay checkout
   ↓
6. Razorpay returns payment response (order_id, payment_id, signature)
   ↓
7. Frontend calls: POST /api/payments/verify
   ↓
8. Backend verifies signature and updates payment/order status
   ↓
9. Frontend shows success message and redirects
```

### Payment States

- **Pending**: Payment order created, waiting for user payment
- **Completed**: Payment successful and verified
- **Failed**: Payment failed or verification failed

---

## Notifications

### Success Notification

```javascript
toast.success('Payment successful! Your order has been confirmed.', {
  position: 'top-right',
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true
});
```

### Failure Notification

```javascript
toast.error('Payment failed. Please try again.', {
  position: 'top-right',
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true
});
```

### Loading State

```javascript
toast.info('Processing payment...', {
  position: 'top-right',
  autoClose: false,
  hideProgressBar: true
});
```

---

## Testing

### Test Mode

Razorpay provides test credentials for development:

1. Use test key ID and secret from Razorpay dashboard
2. Test cards:
   - **Success**: `4111 1111 1111 1111`
   - **Failure**: `4000 0000 0000 0002`
   - **3D Secure**: `4012 0010 3714 1112`

### Test Payment Flow

1. Create a test order
2. Initiate payment with test amount
3. Use test card: `4111 1111 1111 1111`
4. Use any future expiry date (e.g., 12/25)
5. Use any CVV (e.g., 123)
6. Complete payment
7. Verify payment status

---

## Best Practices

### 1. Always Verify Payment on Backend

Never trust frontend payment data. Always verify payment signature on backend.

### 2. Handle All Error Cases

- Network failures
- Payment gateway errors
- Signature verification failures
- User cancellation

### 3. Show Clear Loading States

- Show loading indicator during payment processing
- Disable payment button during processing
- Show clear error messages

### 4. Store Payment ID

Store payment ID for reference and support queries.

### 5. Handle Webhooks

Backend automatically handles webhooks for payment status updates. Frontend can poll payment status if needed.

---

## Support

For payment-related issues:

1. Check payment status: `GET /api/payments/:paymentId`
2. Contact support with:
   - Payment ID
   - Order ID
   - Transaction ID (if available)
   - Error message

---

## Additional Resources

- [Razorpay Documentation](https://razorpay.com/docs/)
- [Razorpay Checkout Integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/)
- [Razorpay Test Cards](https://razorpay.com/docs/payments/test-cards/)

---

## Quick Reference

### API Endpoints Summary

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/payments/create-order` | POST | Yes | Create Razorpay order |
| `/api/payments/verify` | POST | Yes | Verify payment signature |
| `/api/payments/process` | POST | Yes | Process and verify payment |
| `/api/payments/:paymentId` | GET | Yes | Get payment status |
| `/api/payments/webhook/razorpay` | POST | No | Webhook handler (backend only) |

### Payment Status Values

- `Pending`: Payment order created, awaiting payment
- `Completed`: Payment successful and verified
- `Failed`: Payment failed or verification failed

---

**Last Updated**: January 2025

