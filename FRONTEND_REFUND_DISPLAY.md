# Frontend: Show "Amount has been refunded" for Cancelled Orders

## Purpose

When a user cancels an order and receives a refund in their account, the website should clearly show that the **amount has been refunded**. Previously, users saw the refund in their bank but had no indication on the site. This document describes the backend data and how to display it on the frontend.

---

## Backend Change (Done)

The API now returns a **user-facing message** for cancelled orders that have refund data:

- **`refundDisplayMessage`** – Ready-to-show text you can display as-is when the order was cancelled and a refund exists.

You get this in:

- **`GET /api/orders/:orderId`** – Single order (order detail page).
- **`GET /api/users/:userId/orders`** – List of user orders (orders list / my orders).

---

## Response Fields for Refund Display

### 1. `refundDisplayMessage` (use this for the main message)

| Value | When |
|--------|------|
| `"Amount has been refunded to your account."` | Refund completed (`refundStatus === 'processed'`) |
| `"Refund is being processed. You will receive the amount shortly."` | Refund in progress (`refundStatus === 'pending'`) |
| `"Refund could not be processed. Please contact support."` | Refund failed (`refundStatus === 'failed'`) |
| `null` | Order not cancelled, or no refund (e.g. unpaid order) |

**Use this field directly** for the main line of text (e.g. banner or status line) so the user sees “Amount has been refunded” when the refund is done.

### 2. Other useful fields (optional)

- **`refundAmount`** – Refund amount (number, 2 decimals). Use to show “₹X,XXX.XX has been refunded” if you want to include the amount.
- **`refundStatus`** – `'processed' | 'pending' | 'failed'`.
- **`refund.processedAt`** – When the refund was processed (ISO date string).
- **`refund.refundId`** – Refund reference (e.g. for support).

---

## Where to Show the Message

### 1. Order detail page (`GET /api/orders/:orderId`)

When the user opens a **cancelled** order:

- If **`order.refundDisplayMessage`** is present (non-null), show it prominently, e.g.:
  - A short status/banner: **“Amount has been refunded to your account.”**
  - Optionally add: “Refund amount: ₹{order.refundAmount}” and “Processed on {order.refund.processedAt}”.

Example logic:

```js
// Order detail – show refund message when present
if (order.status === 'cancelled' && order.refundDisplayMessage) {
  // Show banner/alert with order.refundDisplayMessage
  // e.g. "Amount has been refunded to your account."
  showRefundBanner(order.refundDisplayMessage, order.refundAmount, order.refund?.processedAt);
}
```

### 2. Orders list / My Orders (`GET /api/users/:userId/orders`)

For each **cancelled** order in the list:

- If **`order.refundDisplayMessage`** is present, show it on the order card (e.g. under status “Cancelled”):
  - e.g. “Amount has been refunded to your account.” or “Refund is being processed…”

Example logic:

```js
// Order card in list
{order.status === 'cancelled' && order.refundDisplayMessage && (
  <div className="refund-message">
    {order.refundDisplayMessage}
    {order.refundAmount != null && (
      <span> (₹{formatCurrency(order.refundAmount)})</span>
    )}
  </div>
)}
```

---

## Example API Response (relevant part)

```json
{
  "success": true,
  "data": {
    "_id": "order_id",
    "status": "cancelled",
    "paymentStatus": "refunded",
    "refundDisplayMessage": "Amount has been refunded to your account.",
    "refundAmount": 2500.00,
    "refundStatus": "processed",
    "refund": {
      "refundId": "rfnd_xxxxx",
      "amount": 2500.00,
      "status": "processed",
      "processedAt": "2025-01-15T10:30:00.000Z"
    }
  }
}
```

When **`refundDisplayMessage`** is `null`, do not show any refund message (e.g. order not cancelled or no refund).

---

## Summary Checklist for Frontend

- [ ] On **order detail** for cancelled orders: if `order.refundDisplayMessage` is set, show it (e.g. “Amount has been refunded to your account.”).
- [ ] On **orders list**: for cancelled orders with `order.refundDisplayMessage`, show the same message on the card.
- [ ] Optionally show `order.refundAmount` and `order.refund.processedAt` for extra clarity.
- [ ] Do not show a refund message when `refundDisplayMessage` is `null`.

After these updates, users who cancel an order and get a refund will see on the website that the amount has been refunded.
