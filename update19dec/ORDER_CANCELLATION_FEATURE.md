# Order Cancellation Feature Documentation

## Overview
This feature allows users to cancel their orders with a reason, similar to e-commerce websites. Admins can view cancellation details including the reason and who cancelled the order.

## Features Implemented

### 1. User Cancellation
- Users can cancel orders that are not already cancelled, completed, or delivered
- Users must provide a cancellation reason
- Predefined common reasons available with option for custom reason
- Cancellation is tracked with timestamp and reason

### 2. Admin Visibility
- Admins can see cancellation information in:
  - Order list view (AdminOrders.js)
  - Order detail view (AdminOrderDetail.js)
- Displays:
  - Cancellation reason
  - Cancellation date/time
  - Who cancelled (user or admin)

## Files Modified/Created

### New Files
1. **src/components/CancelOrderModal.js**
   - Modal component for order cancellation
   - Predefined reasons: "Changed my mind", "Found a better deal", "Product/service no longer needed", "Delivery time too long", "Payment issues", "Duplicate order", "Other"
   - Custom reason textarea when "Other" is selected
   - Validation to ensure reason is provided

### Modified Files

1. **src/services/api.js**
   - Added `cancelOrder(orderId, cancellationReason)` method
   - Endpoint: `PATCH /orders/:orderId/cancel`
   - Sends cancellation reason to backend

2. **src/pages/user/Orders.js**
   - Added cancel button for cancellable orders
   - Integrated CancelOrderModal
   - Shows cancellation reason and date if order is cancelled
   - Added toast notifications for success/error
   - Added `canCancelOrder()` helper function

3. **src/pages/user/OrderDetail.js**
   - Added cancel button in order header
   - Integrated CancelOrderModal
   - Displays cancellation details prominently if cancelled
   - Shows who cancelled the order (user/admin)

4. **src/pages/admin/AdminOrders.js**
   - Added cancellation info display in order cards
   - Shows cancellation reason, date, and who cancelled
   - Red highlight for cancelled orders

5. **src/pages/admin/AdminOrderDetail.js**
   - Added dedicated cancellation details section
   - Shows full cancellation information in sidebar
   - Clear visual indication of cancelled orders

## API Endpoint

### PATCH `/api/orders/:orderId/cancel`
**Request Body:**
```json
{
  "cancellationReason": "Changed my mind"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "_id": "order_id",
    "orderId": "ORD-2024-001",
    "status": "cancelled",
    "cancellationReason": "Changed my mind",
    "cancelledAt": "2024-12-19T10:30:00.000Z",
    "cancelledBy": "user",
    ...
  }
}
```

## Backend Requirements

The backend should:
1. Accept `PATCH /api/orders/:orderId/cancel` with `cancellationReason` in request body
2. Update order status to "cancelled"
3. Store:
   - `cancellationReason` (string)
   - `cancelledAt` (Date/timestamp)
   - `cancelledBy` (string: "user" or "admin")
4. Return updated order object
5. Optionally send notification to admin about cancellation

## Order Model Updates Needed

The Order model should include:
```javascript
{
  // ... existing fields
  cancellationReason: String,
  cancelledAt: Date,
  cancelledBy: String, // "user" or "admin"
}
```

## User Experience Flow

1. User views their orders
2. For cancellable orders, "Cancel Order" button is visible
3. User clicks "Cancel Order"
4. Modal opens with predefined reasons
5. User selects reason (or "Other" for custom)
6. User confirms cancellation
7. Order status updates to "cancelled"
8. Cancellation details are displayed
9. Admin is notified (backend implementation)

## Admin Experience Flow

1. Admin views orders list
2. Cancelled orders show red highlight with cancellation info
3. Admin clicks on order to view details
4. Cancellation section shows:
   - Reason
   - Date/time
   - Who cancelled
5. Admin can see all cancellation details for tracking

## UI/UX Features

- **Visual Indicators:**
  - Red color scheme for cancelled orders
  - Clear cancellation badges
  - Prominent display of cancellation reason

- **User-Friendly:**
  - Predefined common reasons for quick selection
  - Option for custom reason
  - Confirmation modal to prevent accidental cancellation
  - Loading states during cancellation
  - Toast notifications for feedback

- **Admin-Friendly:**
  - Clear visibility of cancelled orders
  - All cancellation details in one place
  - Easy to identify who cancelled and why

## Testing Checklist

- [ ] User can cancel pending order
- [ ] User can cancel processing order
- [ ] User cannot cancel completed order
- [ ] User cannot cancel delivered order
- [ ] User cannot cancel already cancelled order
- [ ] Cancellation reason is required
- [ ] Custom reason works when "Other" is selected
- [ ] Admin sees cancellation info in order list
- [ ] Admin sees cancellation info in order detail
- [ ] Cancellation date/time is displayed correctly
- [ ] Toast notifications work correctly
- [ ] API error handling works

## Notes

- Cancellation is only allowed for orders that are not completed/delivered
- Once cancelled, order cannot be uncancelled (would need admin intervention)
- Cancellation reason helps with analytics and customer service
- Admin can still manually cancel orders through status update dropdown

---

**Last Updated:** 2024-12-19  
**Version:** 1.0.0

