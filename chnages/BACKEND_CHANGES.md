# Backend Changes Required

## Critical Changes

### 1. Image Upload Handling - **IMPORTANT**

**CHANGE:** Frontend now uploads images to Cloudinary before sending to backend.

**What to change:**
- ❌ **REMOVE** file upload handling (multer, multipart/form-data)
- ✅ **ACCEPT** JSON requests with image URLs (strings)
- ✅ **STORE** image URLs directly in database

**Endpoints affected:**
- `POST /admin/acs` - Accept JSON, images as array of URLs
- `PATCH /admin/acs/:id` - Accept JSON, images as array of URLs  
- `POST /service-requests` - Accept JSON, images as array of URLs

**Before (WRONG):**
```javascript
// Don't use multipart/form-data
app.post('/admin/acs', upload.array('images', 5), ...)
```

**After (CORRECT):**
```javascript
// Accept JSON
app.post('/admin/acs', express.json(), (req, res) => {
  const { brand, model, images, ... } = req.body;
  // images is already an array of URLs: ["https://cloudinary.com/img1.jpg", ...]
  // Just store it directly
})
```

---

### 2. Content-Type Headers

**CHANGE:** Image endpoints now use `application/json` instead of `multipart/form-data`

**Endpoints:**
- `POST /admin/acs` → `Content-Type: application/json`
- `PATCH /admin/acs/:id` → `Content-Type: application/json`
- `POST /service-requests` → `Content-Type: application/json`

---

### 3. Request Body Format

**CHANGE:** Images come as array of URL strings, not files

**Example Request:**
```json
{
  "brand": "LG",
  "model": "LG 1.5 Ton",
  "images": ["https://res.cloudinary.com/defgskoxv/image/upload/v123/STJ/abc.jpg"]
}
```

**NOT:**
```javascript
// Don't expect files
req.files // ❌ Don't use this
req.body.images // ✅ This is an array of strings
```

---

### 4. Database Schema

**NO CHANGE NEEDED** - Just store URLs as strings:
```javascript
{
  images: [String] // Array of URL strings
}
```

---

## Summary

1. ✅ Remove all file upload middleware (multer, etc.)
2. ✅ Change image endpoints to accept `application/json`
3. ✅ Store image URLs directly (they're already uploaded to Cloudinary)
4. ✅ No image processing/validation needed (frontend handles it)

**That's it!** Backend just needs to accept and store the image URLs that frontend sends.

