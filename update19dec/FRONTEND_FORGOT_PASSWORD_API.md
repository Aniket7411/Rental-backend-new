# Forgot Password - Frontend API Integration

## API Endpoints

### 1. Request Password Reset
**POST** `https://rental-backend-new.onrender.com/api/auth/forgot-password`

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
- `400`: Missing email
```json
{
  "success": false,
  "message": "Please provide email",
  "error": "VALIDATION_ERROR"
}
```

- `500`: Email sending failed
```json
{
  "success": false,
  "message": "Failed to send password reset email. Please try again later.",
  "error": "EMAIL_ERROR"
}
```

---

### 2. Reset Password
**POST** `https://rental-backend-new.onrender.com/api/auth/reset-password`

**Request Body:**
```json
{
  "token": "reset-token-from-email-query-param",
  "newPassword": "newpassword123"
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
- `400`: Missing fields or invalid password
```json
{
  "success": false,
  "message": "Please provide token and new password",
  "error": "VALIDATION_ERROR"
}
```

- `400`: Invalid/expired token
```json
{
  "success": false,
  "message": "Invalid or expired reset token",
  "error": "UNAUTHORIZED"
}
```

---

## Implementation

### Forgot Password Page

```javascript
const handleForgotPassword = async (email) => {
  try {
    const response = await fetch('https://rental-backend-new.onrender.com/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();
    
    if (data.success) {
      // Show success message
      return { success: true, message: data.message };
    } else {
      // Show error message
      return { success: false, message: data.message };
    }
  } catch (error) {
    return { success: false, message: 'Network error. Please try again.' };
  }
};
```

### Reset Password Page

```javascript
// Get token from URL: /reset-password?token=abc123
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

const handleResetPassword = async (newPassword) => {
  if (!token) {
    return { success: false, message: 'Invalid reset link' };
  }

  if (newPassword.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters' };
  }

  try {
    const response = await fetch('https://rental-backend-new.onrender.com/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: token,
        newPassword: newPassword
      })
    });

    const data = await response.json();
    
    if (data.success) {
      // Redirect to login page
      return { success: true, message: data.message };
    } else {
      return { success: false, message: data.message };
    }
  } catch (error) {
    return { success: false, message: 'Network error. Please try again.' };
  }
};
```

---

## React Example

### ForgotPassword.jsx
```jsx
import { useState } from 'react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const response = await fetch('https://rental-backend-new.onrender.com/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();
    setMessage(data.message);
    setLoading(false);
    
    if (data.success) {
      setEmail('');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Reset Link'}
      </button>
      {message && <div>{message}</div>}
    </form>
  );
};
```

### ResetPassword.jsx
```jsx
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setMessage('Invalid reset link');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    setLoading(true);
    setMessage('');

    const response = await fetch('https://rental-backend-new.onrender.com/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: password })
    });

    const data = await response.json();
    setMessage(data.message);
    setLoading(false);

    if (data.success) {
      setTimeout(() => navigate('/login'), 2000);
    }
  };

  if (!token) {
    return <div>Invalid reset link</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password (min 6 characters)"
        required
        minLength={6}
      />
      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm password"
        required
        minLength={6}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Resetting...' : 'Reset Password'}
      </button>
      {message && <div>{message}</div>}
    </form>
  );
};
```

---

## Routes Required

1. **Forgot Password**: `/forgot-password`
2. **Reset Password**: `/reset-password` (with `?token=...` query param)

---

## Email Link Format

The reset link in email will be:
```
https://rental-ac-frontend.vercel.app/reset-password?token=RESET_TOKEN
```

Extract token from URL query parameter.

---

## Validation Rules

- Email: Required, valid email format
- Password: Minimum 6 characters
- Token: Must be present in URL for reset page

---

## Error Handling

- Network errors: Show "Network error. Please try again."
- 400 errors: Show API error message
- 500 errors: Show API error message
- Invalid token: Show "Invalid or expired reset link"

---

## Flow

1. User enters email → POST `/api/auth/forgot-password`
2. User receives email with reset link
3. User clicks link → Opens `/reset-password?token=...`
4. User enters new password → POST `/api/auth/reset-password`
5. On success → Redirect to login page

---

## Notes

- Token expires in 10 minutes
- Token can only be used once
- API always returns success for forgot-password (even if email doesn't exist) for security
- Frontend should validate password length before sending to API

