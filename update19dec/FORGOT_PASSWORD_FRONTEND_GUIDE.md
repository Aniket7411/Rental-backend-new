# Forgot Password - Frontend Integration Guide

This guide explains how to integrate the forgot password feature in your frontend application.

## Backend API Endpoints

### 1. Forgot Password (Request Reset Link)
**Endpoint:** `POST /api/auth/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset link sent to your email"
}
```

**Error Responses:**
- `400 Bad Request`: Missing email
```json
{
  "success": false,
  "message": "Please provide email",
  "error": "VALIDATION_ERROR"
}
```

- `500 Internal Server Error`: Email sending failed
```json
{
  "success": false,
  "message": "Failed to send password reset email. Please try again later.",
  "error": "EMAIL_ERROR"
}
```

**Note:** For security reasons, the API always returns success even if the email doesn't exist in the system. This prevents email enumeration attacks.

---

### 2. Reset Password (Set New Password)
**Endpoint:** `POST /api/auth/reset-password`

**Request Body:**
```json
{
  "token": "reset-token-from-email-link",
  "newPassword": "newSecurePassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Missing token or password, or password too short
```json
{
  "success": false,
  "message": "Please provide token and new password",
  "error": "VALIDATION_ERROR"
}
```

- `400 Bad Request`: Invalid or expired token
```json
{
  "success": false,
  "message": "Invalid or expired reset token",
  "error": "UNAUTHORIZED"
}
```

---

## Frontend Implementation Examples

### React/Next.js Example

#### 1. Forgot Password Page Component

```jsx
import { useState } from 'react';
import axios from 'axios';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/forgot-password`,
        { email }
      );

      if (response.data.success) {
        setMessage('Password reset link has been sent to your email. Please check your inbox.');
        setEmail('');
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Failed to send reset email. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <h2>Forgot Password</h2>
      <p>Enter your email address and we'll send you a link to reset your password.</p>
      
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
          />
        </div>
        
        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}
        
        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
    </div>
  );
};

export default ForgotPasswordPage;
```

#### 2. Reset Password Page Component

```jsx
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';

const ResetPasswordPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (!tokenFromUrl) {
      setError('Invalid reset link. Please request a new password reset.');
    } else {
      setToken(tokenFromUrl);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/reset-password`,
        {
          token,
          newPassword: password
        }
      );

      if (response.data.success) {
        setMessage('Password reset successfully! Redirecting to login...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 
        'Failed to reset password. The link may have expired. Please request a new one.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="reset-password-container">
        <div className="error">Invalid reset link. Please request a new password reset.</div>
        <button onClick={() => router.push('/forgot-password')}>
          Go to Forgot Password
        </button>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      <h2>Reset Password</h2>
      <p>Enter your new password below.</p>
      
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="password">New Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Enter new password (min 6 characters)"
          />
        </div>
        
        <div>
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Confirm new password"
          />
        </div>
        
        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}
        
        <button type="submit" disabled={loading}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
};

export default ResetPasswordPage;
```

---

### Vanilla JavaScript Example

```javascript
// Forgot Password Form Handler
async function handleForgotPassword(email) {
  try {
    const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    
    if (data.success) {
      alert('Password reset link has been sent to your email. Please check your inbox.');
    } else {
      alert(data.message || 'Failed to send reset email. Please try again.');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred. Please try again later.');
  }
}

// Reset Password Form Handler
async function handleResetPassword(token, newPassword) {
  try {
    const response = await fetch('http://localhost:5000/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        newPassword,
      }),
    });

    const data = await response.json();
    
    if (data.success) {
      alert('Password reset successfully! Redirecting to login...');
      window.location.href = '/login.html';
    } else {
      alert(data.message || 'Failed to reset password. The link may have expired.');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred. Please try again later.');
  }
}

// Get token from URL query parameter
function getTokenFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('token');
}
```

---

## Email Link Format

The password reset link sent to users will be in this format:
```
http://your-frontend-url/reset-password?token=RESET_TOKEN_HERE
```

**Important:**
- The token expires in **10 minutes**
- The token can only be used **once**
- Make sure your frontend route matches: `/reset-password`

---

## Frontend Routes Needed

1. **Forgot Password Page**: `/forgot-password`
   - Form with email input
   - Submit button to request reset link

2. **Reset Password Page**: `/reset-password`
   - Extract token from URL query parameter (`?token=...`)
   - Form with new password and confirm password fields
   - Submit button to reset password
   - Redirect to login page after successful reset

---

## Security Best Practices

1. **Always validate password on frontend** before sending to API
   - Minimum 6 characters
   - Check password confirmation matches

2. **Show generic success message** even if email doesn't exist (to prevent email enumeration)

3. **Handle expired tokens gracefully** - Show clear message and link to request new reset

4. **Use HTTPS in production** - Never send tokens over unencrypted connections

5. **Clear form after successful submission** to prevent accidental resubmission

---

## Testing Checklist

- [ ] Forgot password form sends email successfully
- [ ] Email contains valid reset link
- [ ] Reset link redirects to correct frontend page
- [ ] Token is extracted from URL correctly
- [ ] Password reset form validates input
- [ ] Password reset succeeds with valid token
- [ ] Password reset fails with expired token
- [ ] Password reset fails with invalid token
- [ ] User is redirected to login after successful reset
- [ ] Error messages are displayed clearly

---

## Environment Variables (Frontend)

Make sure to set your API URL in your frontend environment:

```env
# .env.local (Next.js) or .env (React/Vue)
NEXT_PUBLIC_API_URL=http://localhost:5000
# or
REACT_APP_API_URL=http://localhost:5000
```

---

## Support

If you encounter any issues:
1. Check browser console for errors
2. Verify API endpoint URLs are correct
3. Ensure CORS is configured properly in backend
4. Check that email service is configured correctly in backend `.env` file

