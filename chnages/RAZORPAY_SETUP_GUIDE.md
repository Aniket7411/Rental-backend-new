# Razorpay Setup Guide - Next Steps

## ✅ What You've Done
1. Added live Razorpay Key ID and Key Secret
2. Received a personalized payment link from Razorpay

## 📋 What to Do Next

### Step 1: Add Razorpay Credentials to `.env` File

Make sure your `.env` file in the root directory contains:

```env
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_live_key_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here (optional)
```

**Important:**
- Replace `rzp_live_xxxxxxxxxxxxx` with your actual live Key ID
- Replace `your_live_key_secret_here` with your actual live Key Secret
- The webhook secret is optional but recommended for better security

### Step 2: Understanding Payment Links vs Orders API

**Payment Link (What you received):**
- This is a static link you can share with customers
- Useful for manual payments or one-off transactions
- Example: `https://rzp.io/l/xxxxx`

**Orders API (What your app uses):**
- Creates dynamic payment orders when users checkout
- Integrated directly into your checkout flow
- More flexible and automated

**Your application uses the Orders API**, which means:
- ✅ Payment orders are created automatically when users checkout
- ✅ No need to manually share payment links
- ✅ Payments are tied to specific orders in your database
- ✅ Better tracking and automation

### Step 3: Verify Environment Variables

After adding the credentials, restart your backend server:

```bash
# Stop the server (Ctrl+C if running)
# Then restart it
npm start
# or for development
npm run dev
```

### Step 4: Test the Payment Flow

1. **Create a test order** through your application
2. **Proceed to checkout** and select a payment option (Pay Now or Pay Advance)
3. **The system will:**
   - Create a Razorpay order automatically
   - Return payment details to the frontend
   - Open Razorpay checkout
4. **Complete a test payment** using Razorpay test cards:
   - Card Number: `4111 1111 1111 1111`
   - CVV: Any 3 digits
   - Expiry: Any future date
   - Name: Any name

### Step 5: Set Up Webhooks (Recommended)

For better payment verification and handling:

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Add a webhook URL: `https://your-domain.com/api/payments/webhook/razorpay`
3. Select events:
   - `payment.captured`
   - `payment.failed`
   - `payment.authorized`
4. Copy the webhook secret and add to `.env` as `RAZORPAY_WEBHOOK_SECRET`

### Step 6: Frontend Configuration

Make sure your frontend also has the Razorpay Key ID:

```env
# In your frontend .env file
REACT_APP_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
```

## 🔍 Verification Checklist

- [ ] Added `RAZORPAY_KEY_ID` to backend `.env`
- [ ] Added `RAZORPAY_KEY_SECRET` to backend `.env`
- [ ] Restarted backend server
- [ ] Added `REACT_APP_RAZORPAY_KEY_ID` to frontend `.env` (if using React)
- [ ] Tested creating an order
- [ ] Tested payment checkout flow
- [ ] Verified payment appears in Razorpay Dashboard

## 🚨 Common Issues

### Issue: "Payment gateway not configured"
**Solution:** Check that both `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are in your `.env` file and restart the server.

### Issue: "Invalid key"
**Solution:** Make sure you're using the correct Key ID format (starts with `rzp_live_` for live mode or `rzp_test_` for test mode).

### Issue: Payment not verifying
**Solution:** Check that your webhook secret matches in Razorpay Dashboard and your `.env` file.

## 📞 Support

If you encounter issues:
1. Check Razorpay Dashboard → Logs for API errors
2. Check your backend console for error messages
3. Verify all environment variables are set correctly
4. Ensure you're using the correct mode (Live vs Test)

## 🎉 You're All Set!

Once the credentials are added and the server is restarted, your payment integration should work automatically. Users will be able to:
- ✅ Pay for orders using Razorpay
- ✅ Choose between Pay Now (full payment) or Pay Advance (partial payment)
- ✅ Complete secure payments through Razorpay checkout

The payment link you received can be kept for manual payments or customer support, but your main checkout flow will use the Orders API automatically.

