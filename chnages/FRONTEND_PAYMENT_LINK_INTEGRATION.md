# Frontend Payment Link Integration Guide

## Overview

This guide explains how to integrate the Razorpay Payment Link (`https://razorpay.me/@ashenterprises7526`) into your frontend application.

## Payment Link vs Orders API

Your application uses **two payment methods**:

1. **Orders API** (Primary) - Dynamic payment orders created automatically during checkout
2. **Payment Link** (Fallback/Alternative) - Static personalized link for manual payments

## Implementation Options

### Option 1: Use Payment Link as Fallback (Recommended)

Show the payment link as an alternative option when the Orders API fails or as a manual payment option.

#### Step 1: Fetch Payment Link from Backend

```javascript
// Fetch payment link from backend
const fetchPaymentLink = async () => {
  try {
    const response = await fetch('/api/payments/link', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      return data.data.paymentLink;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching payment link:', error);
    return null;
  }
};
```

#### Step 2: Display Payment Link Button

```jsx
// React Component Example
import React, { useState, useEffect } from 'react';

const PaymentOptions = ({ orderId, amount }) => {
  const [paymentLink, setPaymentLink] = useState(null);
  const [showPaymentLink, setShowPaymentLink] = useState(false);

  useEffect(() => {
    // Fetch payment link on component mount
    fetchPaymentLink().then(link => {
      setPaymentLink(link);
    });
  }, []);

  const handlePaymentLinkClick = () => {
    if (paymentLink) {
      // Open payment link in new tab
      window.open(paymentLink, '_blank');
      
      // Optional: Track that user clicked payment link
      // You can add analytics or logging here
    }
  };

  return (
    <div className="payment-options">
      {/* Primary: Orders API Payment */}
      <button 
        onClick={handleRazorpayCheckout}
        className="btn-primary"
      >
        Pay with Razorpay
      </button>

      {/* Fallback: Payment Link */}
      {paymentLink && (
        <>
          <div className="divider">OR</div>
          <button 
            onClick={handlePaymentLinkClick}
            className="btn-secondary"
          >
            Pay via Payment Link
          </button>
          <p className="text-sm text-gray-500">
            Click to open payment page in a new tab
          </p>
        </>
      )}
    </div>
  );
};
```

### Option 2: Direct Link Usage (Simple)

If you prefer to hardcode the link (not recommended for production):

```jsx
const PAYMENT_LINK = 'https://razorpay.me/@ashenterprises7526';

const PaymentButton = () => {
  const handleClick = () => {
    window.open(PAYMENT_LINK, '_blank');
  };

  return (
    <button onClick={handleClick}>
      Pay Now
    </button>
  );
};
```

### Option 3: Include in Payment Response

The backend now includes the payment link in the order creation response:

```javascript
// When creating a Razorpay order
const createOrder = async (orderId, amount) => {
  const response = await fetch('/api/payments/create-order', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ orderId, amount })
  });

  const data = await response.json();
  
  if (data.success) {
    // Primary: Use Orders API
    const { razorpayOrderId, key, paymentLink } = data.data;
    
    // Initialize Razorpay checkout
    const options = {
      key: key,
      amount: data.data.amount * 100, // Convert to paise
      currency: 'INR',
      name: 'Your Company Name',
      description: `Order ${data.data.orderId}`,
      order_id: razorpayOrderId,
      handler: function(response) {
        // Handle payment success
        verifyPayment(response);
      },
      prefill: {
        name: user.name,
        email: user.email,
        contact: user.phone
      },
      theme: {
        color: '#3399cc'
      }
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();

    // Store payment link for fallback
    if (paymentLink) {
      // You can show this as an alternative option
      console.log('Payment link available:', paymentLink);
    }
  }
};
```

## Complete Example: Payment Component

```jsx
import React, { useState, useEffect } from 'react';

const CheckoutPayment = ({ order, user }) => {
  const [paymentLink, setPaymentLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch payment link
    fetchPaymentLink().then(link => setPaymentLink(link));
  }, []);

  const handleRazorpayCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: order.orderId,
          amount: order.finalTotal
        })
      });

      const data = await response.json();

      if (data.success) {
        const options = {
          key: data.data.key,
          amount: data.data.amount * 100,
          currency: 'INR',
          name: 'ASH Enterprises',
          description: `Order ${data.data.orderId}`,
          order_id: data.data.razorpayOrderId,
          handler: async function(response) {
            await verifyPayment(response, data.data.paymentId);
          },
          prefill: {
            name: user.name,
            email: user.email,
            contact: user.phone
          },
          theme: {
            color: '#3399cc'
          },
          modal: {
            ondismiss: function() {
              setLoading(false);
            }
          }
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to initialize payment. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentLinkClick = () => {
    if (paymentLink) {
      window.open(paymentLink, '_blank');
      
      // Optional: Show message to user
      alert('Payment page opened in new tab. Please complete payment and return to this page.');
    }
  };

  return (
    <div className="checkout-payment">
      <h3>Payment Options</h3>
      
      {error && (
        <div className="error-message">{error}</div>
      )}

      {/* Primary Payment Method */}
      <button
        onClick={handleRazorpayCheckout}
        disabled={loading}
        className="btn-primary btn-large"
      >
        {loading ? 'Processing...' : 'Pay Now (₹' + order.finalTotal + ')'}
      </button>

      {/* Alternative Payment Link */}
      {paymentLink && (
        <div className="payment-link-option">
          <div className="divider">
            <span>OR</span>
          </div>
          
          <button
            onClick={handlePaymentLinkClick}
            className="btn-secondary"
          >
            Pay via Payment Link
          </button>
          
          <p className="help-text">
            Use this option if the payment gateway is not working. 
            The payment page will open in a new tab.
          </p>
        </div>
      )}

      {/* Order Summary */}
      <div className="order-summary">
        <h4>Order Summary</h4>
        <p>Order ID: {order.orderId}</p>
        <p>Amount: ₹{order.finalTotal}</p>
      </div>
    </div>
  );
};

export default CheckoutPayment;
```

## Styling Example

```css
.checkout-payment {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
}

.btn-primary {
  width: 100%;
  padding: 12px 24px;
  background-color: #3399cc;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  margin-bottom: 16px;
}

.btn-primary:hover {
  background-color: #2a7ba0;
}

.btn-primary:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  width: 100%;
  padding: 12px 24px;
  background-color: #f0f0f0;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

.divider {
  text-align: center;
  margin: 20px 0;
  position: relative;
}

.divider::before,
.divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 45%;
  height: 1px;
  background-color: #ddd;
}

.divider::before {
  left: 0;
}

.divider::after {
  right: 0;
}

.divider span {
  background-color: white;
  padding: 0 10px;
  position: relative;
  color: #666;
}

.help-text {
  font-size: 12px;
  color: #666;
  margin-top: 8px;
  text-align: center;
}

.error-message {
  background-color: #fee;
  color: #c33;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
}
```

## Environment Variable (Frontend)

If you want to hardcode the link in your frontend (not recommended):

```env
# .env file (frontend)
REACT_APP_RAZORPAY_PAYMENT_LINK=https://razorpay.me/@ashenterprises7526
```

Then use it:

```javascript
const PAYMENT_LINK = process.env.REACT_APP_RAZORPAY_PAYMENT_LINK;
```

## Best Practices

1. **Use as Fallback**: Show payment link only when Orders API fails or as an alternative
2. **Track Usage**: Log when users click the payment link for analytics
3. **User Communication**: Clearly explain what the payment link is and when to use it
4. **Security**: Never expose sensitive information in the payment link URL
5. **Testing**: Test both payment methods to ensure they work correctly

## API Endpoint

**GET** `/api/payments/link`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentLink": "https://razorpay.me/@ashenterprises7526",
    "message": "Use this link for manual payments or as a fallback option"
  }
}
```

## Notes

- The payment link is a **static link** - it doesn't include order-specific information
- Users will need to manually enter the amount and order details when using the link
- For better tracking, prefer using the Orders API which automatically links payments to orders
- The payment link is useful for:
  - Customer support scenarios
  - Manual payments
  - Fallback when Orders API fails
  - Quick payments without going through checkout

