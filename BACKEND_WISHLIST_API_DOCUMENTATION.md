# Backend API Documentation: Wishlist Management

## Overview
The frontend has been updated to use backend API for wishlist management instead of localStorage. All wishlist operations are now stored in the user's database.

---

## API Endpoints

### 1. Get User's Wishlist
**GET** `/api/wishlist`

**Description:** Retrieves all items in the authenticated user's wishlist.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Wishlist retrieved successfully",
  "data": [
    {
      "_id": "wishlist_item_id",
      "userId": "user_id",
      "productId": "product_id",
      "product": {
        "_id": "product_id",
        "brand": "LG",
        "model": "2 Ton",
        "name": "LG 2 Ton",
        "capacity": "2 Ton",
        "type": "Split",
        "category": "AC",
        "location": "Patel Marg, Jaipur",
        "price": {
          "3": 3000,
          "6": 5000,
          "9": 7000,
          "11": 9000
        },
        "images": ["https://..."],
        "status": "Available"
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "message": "Unauthorized. Please login."
}
```

**Response (Error - 500):**
```json
{
  "success": false,
  "message": "Failed to fetch wishlist"
}
```

---

### 2. Add Product to Wishlist
**POST** `/api/wishlist`

**Description:** Adds a product to the authenticated user's wishlist.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "productId": "product_id_here"
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "Product added to wishlist",
  "data": {
    "_id": "wishlist_item_id",
    "userId": "user_id",
    "productId": "product_id",
    "product": {
      "_id": "product_id",
      "brand": "LG",
      "model": "2 Ton",
      "name": "LG 2 Ton",
      "capacity": "2 Ton",
      "type": "Split",
      "category": "AC",
      "location": "Patel Marg, Jaipur",
      "price": {
        "3": 3000,
        "6": 5000,
        "9": 7000,
        "11": 9000
      },
      "images": ["https://..."],
      "status": "Available"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Product already in wishlist"
}
```

**Response (Error - 404):**
```json
{
  "success": false,
  "message": "Product not found"
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "message": "Unauthorized. Please login."
}
```

---

### 3. Remove Product from Wishlist
**DELETE** `/api/wishlist/:productId`

**Description:** Removes a product from the authenticated user's wishlist.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `productId` (string, required): The ID of the product to remove from wishlist

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Product removed from wishlist"
}
```

**Response (Error - 404):**
```json
{
  "success": false,
  "message": "Product not found in wishlist"
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "message": "Unauthorized. Please login."
}
```

---

### 4. Check if Product is in Wishlist
**GET** `/api/wishlist/check/:productId`

**Description:** Checks if a specific product is in the authenticated user's wishlist.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `productId` (string, required): The ID of the product to check

**Response (Success - 200):**
```json
{
  "success": true,
  "isInWishlist": true
}
```

**Response (Success - 200 - Not in wishlist):**
```json
{
  "success": true,
  "isInWishlist": false
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "message": "Unauthorized. Please login."
}
```

---

## Database Schema

### Wishlist Model
```javascript
{
  _id: ObjectId,              // Wishlist item ID
  userId: ObjectId,           // Reference to User model (required)
  productId: ObjectId,        // Reference to Product model (required)
  product: {                  // Populated product data (optional, for convenience)
    _id: ObjectId,
    brand: String,
    model: String,
    name: String,
    capacity: String,
    type: String,
    category: String,
    location: String,
    price: {
      3: Number,
      6: Number,
      9: Number,
      11: Number
    },
    images: [String],
    status: String
  },
  createdAt: Date,            // Auto-generated
  updatedAt: Date             // Auto-generated
}
```

**Indexes:**
- Unique compound index on `userId` and `productId` to prevent duplicates
- Index on `userId` for faster queries

---

## Implementation Notes

### 1. Authentication
- All endpoints require authentication via JWT token
- Token should be sent in `Authorization` header as `Bearer <token>`
- If token is missing or invalid, return 401 Unauthorized

### 2. Product Population
- When returning wishlist items, populate the `product` field with full product details
- This allows frontend to display product information without additional API calls

### 3. Duplicate Prevention
- Use unique compound index on `userId` and `productId`
- Return appropriate error if user tries to add same product twice

### 4. Error Handling
- Return consistent error format: `{ success: false, message: "error message" }`
- Use appropriate HTTP status codes:
  - 200: Success
  - 201: Created
  - 400: Bad Request (validation errors, duplicates)
  - 401: Unauthorized
  - 404: Not Found
  - 500: Server Error

### 5. Response Format
- Always return `success` boolean field
- Include `message` for user-friendly messages
- Include `data` field with actual data

---

## Example Implementation (MongoDB/Mongoose)

```javascript
// Wishlist Schema
const wishlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Unique compound index
wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });

// GET /api/wishlist
router.get('/', authenticate, async (req, res) => {
  try {
    const wishlist = await Wishlist.find({ userId: req.user.id })
      .populate('productId', 'brand model name capacity type category location price images status')
      .sort({ createdAt: -1 });
    
    // Transform to match frontend expectations
    const formattedWishlist = wishlist.map(item => ({
      _id: item._id,
      userId: item.userId,
      productId: item.productId._id,
      product: item.productId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));
    
    res.json({
      success: true,
      message: 'Wishlist retrieved successfully',
      data: formattedWishlist
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wishlist'
    });
  }
});

// POST /api/wishlist
router.post('/', authenticate, async (req, res) => {
  try {
    const { productId } = req.body;
    
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Check if already in wishlist
    const existing = await Wishlist.findOne({
      userId: req.user.id,
      productId: productId
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }
    
    // Add to wishlist
    const wishlistItem = new Wishlist({
      userId: req.user.id,
      productId: productId
    });
    
    await wishlistItem.save();
    
    // Populate product for response
    await wishlistItem.populate('productId', 'brand model name capacity type category location price images status');
    
    res.status(201).json({
      success: true,
      message: 'Product added to wishlist',
      data: {
        _id: wishlistItem._id,
        userId: wishlistItem.userId,
        productId: wishlistItem.productId._id,
        product: wishlistItem.productId,
        createdAt: wishlistItem.createdAt,
        updatedAt: wishlistItem.updatedAt
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to add to wishlist'
    });
  }
});

// DELETE /api/wishlist/:productId
router.delete('/:productId', authenticate, async (req, res) => {
  try {
    const { productId } = req.params;
    
    const deleted = await Wishlist.findOneAndDelete({
      userId: req.user.id,
      productId: productId
    });
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in wishlist'
      });
    }
    
    res.json({
      success: true,
      message: 'Product removed from wishlist'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove from wishlist'
    });
  }
});

// GET /api/wishlist/check/:productId
router.get('/check/:productId', authenticate, async (req, res) => {
  try {
    const { productId } = req.params;
    
    const exists = await Wishlist.findOne({
      userId: req.user.id,
      productId: productId
    });
    
    res.json({
      success: true,
      isInWishlist: !!exists
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check wishlist status'
    });
  }
});
```

---

## Frontend Changes Summary

### Files Updated:
1. **`src/services/api.js`** - Added wishlist API endpoints
2. **`src/context/WishlistContext.js`** - New context for wishlist management
3. **`src/App.js`** - Added WishlistProvider
4. **`src/components/ACCard.js`** - Updated to use WishlistContext
5. **`src/pages/user/Wishlist.js`** - Updated to use WishlistContext
6. **`src/components/Header.js`** - Updated to use WishlistContext for count
7. **`src/pages/user/UserDashboard.js`** - Updated to use WishlistContext

### Key Changes:
- ✅ Removed all `localStorage` wishlist operations
- ✅ All wishlist operations now use backend API
- ✅ Wishlist persists across devices and sessions
- ✅ Real-time wishlist count in header
- ✅ Proper error handling and loading states

---

## Testing Checklist

- [ ] GET `/api/wishlist` - Returns user's wishlist with populated products
- [ ] POST `/api/wishlist` - Adds product to wishlist (prevents duplicates)
- [ ] DELETE `/api/wishlist/:productId` - Removes product from wishlist
- [ ] GET `/api/wishlist/check/:productId` - Returns correct wishlist status
- [ ] Authentication required for all endpoints
- [ ] Proper error handling for invalid product IDs
- [ ] Proper error handling for duplicate additions
- [ ] Product population works correctly
- [ ] Unique constraint prevents duplicate entries

---

## Notes

- The frontend expects the `product` field to be populated in wishlist responses
- Product data structure should match the Product model schema
- All endpoints require JWT authentication
- Wishlist items are user-specific (filtered by userId)

