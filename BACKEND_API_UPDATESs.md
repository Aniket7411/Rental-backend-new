# Backend API Updates

## Wishlist Endpoints (Requires Authentication)

All wishlist endpoints require `Authorization: Bearer <token>` header.

### 1. GET `/api/wishlist`
Get user's wishlist items.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "wishlist_item_id",
      "userId": "user_id",
      "productId": "product_id",
      "product": {
        "_id": "product_id",
        "brand": "LG",
        "model": "Model Name",
        "capacity": "2 Ton",
        "type": "Split",
        "price": { "3": 3000, "6": 5000, "9": 7000, "11": 9000 },
        "images": ["url1", "url2"],
        "status": "Available"
      },
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### 2. POST `/api/wishlist`
Add product to wishlist.

**Body:**
```json
{
  "productId": "product_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product added to wishlist",
  "data": {
    "_id": "wishlist_item_id",
    "userId": "user_id",
    "productId": "product_id",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### 3. DELETE `/api/wishlist/:productId`
Remove product from wishlist.

**Response:**
```json
{
  "success": true,
  "message": "Product removed from wishlist"
}
```

### 4. GET `/api/wishlist/check/:productId`
Check if product is in user's wishlist.

**Response:**
```json
{
  "success": true,
  "isInWishlist": true
}
```

---

## Filter Updates - Product Search

### GET `/api/acs` (Updated Query Parameters)

Support **comma-separated values** for multiple filter selections:

**Query Parameters:**
- `capacity` - **Comma-separated values** (e.g., `capacity=1 Ton,2 Ton,2.5 Ton`)
- `type` - **Comma-separated values** (e.g., `type=Split,Window`)
- `condition` - **Comma-separated values** (e.g., `condition=New,Refurbished`)
- `category` - Single value (AC, Refrigerator, Washing Machine)
- `search` - Text search (brand, model, location)
- `location` - Location filter
- `duration` - Single value (3, 6, 9, 11)

**Example Request:**
```
GET /api/acs?category=AC&capacity=1 Ton,2 Ton&type=Split,Window&condition=New&duration=3
```

**Backend should:**
- Split comma-separated values and filter products matching **any** of the values (OR logic)
- Return products that match at least one capacity, one type, and one condition from the provided lists

---

## Data Structure

### Wishlist Schema
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  productId: ObjectId (ref: Product/AC),
  createdAt: Date
}
```

### Product Filter Logic
When multiple values are provided (comma-separated):
- **capacity**: Product capacity must match one of the provided values
- **type**: Product type must match one of the provided values  
- **condition**: Product condition must match one of the provided values

Example: If `capacity=1 Ton,2 Ton`, return products where `product.capacity` is either "1 Ton" OR "2 Ton".

