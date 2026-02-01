# Order Cancellation Flow - Complete Documentation

## Overview
When an order is cancelled (via `POST /api/orders/:orderId/cancel`), the system performs several critical operations to handle payments, refunds, product availability, and service bookings.

---

## 1. **Payment & Refund Processing**

### Automatic Refund Processing
If the order has a completed payment, the system automatically processes a refund:

#### Refund Amount Calculation:
- **`payNow` orders**: Refunds **full `finalTotal`** amount
- **`payAdvance` orders**: Refunds only the **`advanceAmount`** (not the remaining amount)

#### Refund Process:
1. **Finds Payment Record**: Looks up the `Payment` document associated with the order
2. **Validates Payment**: Checks if:
   - `payment.status === 'Completed'`
   - Payment has `razorpayPaymentId` or `transactionId`
3. **Calculates Refund**: Determines refund amount based on `paymentOption`
4. **Processes Razorpay Refund**: 
   - Converts amount to paise (Razorpay uses paise)
   - Calls Razorpay API: `razorpay.payments.refund(paymentId, { amount, notes })`
   - Includes cancellation reason and order details in notes
5. **Creates Refund Record**: 
   - Creates a new `Refund` document in database
   - Stores: `refundId`, `razorpayRefundId`, `amount`, `status`, `reason`, `processedAt`
6. **Updates Payment Record**:
   - Sets `payment.refundId`
   - Sets `payment.refundStatus` ('processed' or 'pending')
   - Sets `payment.refundAmount`
   - Sets `payment.refundedAt`
7. **Updates Order Payment Status**: Sets `order.paymentStatus = 'refunded'`

#### Error Handling:
- If refund processing fails, the order is **still cancelled**
- Refund error is logged but doesn't block cancellation
- Payment record is marked with `refundStatus = 'failed'`
- Admin is notified that manual intervention may be required
- Response message indicates: "Order cancelled but refund processing failed. Please contact support."

---

## 2. **Order Status Update**

The order is updated with cancellation details:
- `order.status = 'cancelled'`
- `order.cancellationReason = <provided reason>`
- `order.cancelledAt = <current timestamp>`
- `order.cancelledBy = 'admin' or 'user'` (based on who cancelled)

**Validation Checks:**
- Cannot cancel an already cancelled order
- Cannot cancel `completed` or `delivered` orders
- Cancellation reason is required

---

## 3. **Product Status Restoration**

For **rental items** in the order:
- Product status is set back to **`'Available'`**
- This makes the product available for new orders
- Only applies to items with `type === 'rental'` and valid `productId`

**Code:**
```javascript
for (const item of order.items) {
  if (item.type === 'rental' && item.productId) {
    await Product.findByIdAndUpdate(item.productId, { status: 'Available' });
  }
}
```

---

## 4. **Service Bookings Cancellation**

All related service bookings are automatically cancelled:
- Finds all `ServiceBooking` documents with `orderId = order._id`
- Updates their status to **`'Cancelled'`**

**Code:**
```javascript
await ServiceBooking.updateMany(
  { orderId: order._id },
  { status: 'Cancelled' }
);
```

**Note:** Service bookings that were created as part of the order are cancelled, but standalone service bookings (not linked to orders) are not affected.

---

## 5. **Admin Notification**

An email notification is sent to the admin (non-blocking):
- **Subject**: `Order {orderId} Cancelled - {By Admin/By User}`
- **Content**: Includes:
  - Order ID
  - Customer name and email
  - Who cancelled it (admin/user)
  - Cancellation reason
  - Cancellation timestamp
  - Order total
  - Refund status (if applicable)

---

## 6. **Response Format**

### Success Response:
```json
{
  "success": true,
  "message": "Order cancelled and refund processed successfully" | 
             "Order cancelled but refund processing failed. Please contact support." |
             "Order cancelled successfully",
  "data": {
    "order": { /* formatted order object */ },
    "refund": { /* refund record or null */ }
  }
}
```

### Refund Data Structure:
```json
{
  "refundId": "rfnd_xxxxx",
  "razorpayRefundId": "rfnd_xxxxx",
  "paymentId": "payment_id",
  "orderId": "order_id",
  "amount": 2500.00,
  "amountInPaise": 250000,
  "status": "processed" | "pending" | "failed",
  "reason": "Order cancelled by user",
  "processedAt": "2025-01-15T10:30:00.000Z",
  "razorpayRefundData": { /* full Razorpay refund object */ }
}
```

---

## 7. **Important Notes**

### Payment Scenarios:
1. **No Payment Made**: Order is cancelled, no refund processing
2. **Payment Pending**: Order is cancelled, no refund processing (payment was never completed)
3. **Payment Completed**: Refund is automatically processed
4. **Refund Fails**: Order is still cancelled, but refund requires manual intervention

### Service Bookings:
- Only service bookings **linked to the order** (`orderId` field) are cancelled
- Standalone service bookings (created separately) are **not affected**
- Service booking status is set to `'Cancelled'` (capitalized, as per ServiceBooking model)

### Product Availability:
- Only **rental products** are restored to `'Available'` status
- Products purchased (not rented) are not affected
- Product status change happens **after** order cancellation is confirmed

### Refund Timing:
- Refunds are processed **synchronously** during cancellation
- Razorpay typically processes refunds within 5-7 business days
- Refund status is stored in both `Refund` and `Payment` records
- Use `GET /api/orders/:orderId/refund-status` to check refund status later

---

## 8. **API Endpoint**

**Endpoint:** `POST /api/orders/:orderId/cancel`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "cancellationReason": "Customer requested cancellation"
}
```

**Authorization:**
- **Admins**: Can cancel any order
- **Users**: Can only cancel their own orders

---

## 9. **Related Endpoints**

### Get Refund Status:
**Endpoint:** `GET /api/orders/:orderId/refund-status`

Returns the current refund status for a cancelled order, including latest status from Razorpay API.

---

## Summary Flow Diagram

```
Order Cancellation Request
    ↓
Validate Order & Permissions
    ↓
Check Payment Status
    ↓
┌─────────────────────────┐
│ Payment Completed?      │
└─────────────────────────┘
    │ YES                    │ NO
    ↓                        ↓
Process Refund          Skip Refund
    ↓                        ↓
Create Refund Record    ─────┘
    ↓
Update Payment Record
    ↓
Update Order Status → 'cancelled'
    ↓
Restore Product Status → 'Available' (rental items)
    ↓
Cancel Service Bookings → 'Cancelled'
    ↓
Send Admin Notification
    ↓
Return Response
```

---

## Testing Scenarios

1. **Cancel Order with PayNow Payment**: Should refund full amount
2. **Cancel Order with PayAdvance Payment**: Should refund only advance amount
3. **Cancel Order with No Payment**: Should cancel without refund
4. **Cancel Order with Failed Refund**: Should cancel but indicate refund failure
5. **Cancel Order with Rental Items**: Should restore product availability
6. **Cancel Order with Service Bookings**: Should cancel linked service bookings
