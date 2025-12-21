# How to Add Service Images

The image field shows `null` because no image was provided when adding the service. You can now add images in **two ways**:

## Option 1: Paste Image URL (Recommended for Quick Setup)

1. Go to **Admin Panel** → **Manage Services**
2. Click **Edit** on the service you want to add an image to
3. In the **Service Image** section, you'll see:
   - File upload option (for uploading images)
   - **OR** separator
   - **URL input field** (paste your image URL here)
4. Paste the image URL from `SERVICE_SEED_DATA.json` into the URL input field
5. You'll see a preview of the image below
6. Click **Save Service**

### Image URLs from Seed Data:

- **Water Leakage Repair:** `https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800&q=80`
- **AC Gas Refilling:** `https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&q=80`
- **AC Foam Wash:** `https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80`
- **AC Jet Wash Service:** `https://images.unsplash.com/photo-1581605405669-fcdf81165afa?w=800&q=80`
- **AC Repair Inspection:** `https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800&q=80`
- **Split AC Installation:** `https://images.unsplash.com/photo-1631549925853-6ec943d5ee41?w=800&q=80`

## Option 2: Upload Image File

1. Go to **Admin Panel** → **Manage Services**
2. Click **Edit** on the service you want to add an image to
3. Click **Choose File** in the **Service Image** section
4. Select an image file from your computer
5. The image will automatically upload to Cloudinary
6. Click **Save Service**

## Quick Steps to Add All Images:

1. Open `SERVICE_SEED_DATA.json` (you have this file)
2. For each service, copy the `image` URL value
3. Edit the corresponding service in the admin panel
4. Paste the URL in the URL input field
5. Save

**Note:** The image URL field is now available in both the **Add Service** and **Edit Service** forms!

