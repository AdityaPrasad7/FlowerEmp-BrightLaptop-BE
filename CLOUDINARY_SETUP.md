# Cloudinary Image Upload Setup Guide

This guide explains how to set up and use Cloudinary for image uploads in the backend.

## 📋 Prerequisites

1. A Cloudinary account (free tier available at [cloudinary.com](https://cloudinary.com))
2. Cloudinary credentials (Cloud Name, API Key, API Secret)

## 🔧 Setup Steps

### 1. Create a Cloudinary Account

1. Go to [https://cloudinary.com](https://cloudinary.com)
2. Sign up for a free account
3. After signing up, you'll be taken to your dashboard

### 2. Get Your Cloudinary Credentials

1. In your Cloudinary dashboard, go to **Settings** → **Security**
2. You'll find:
   - **Cloud Name**: Your cloud name (e.g., `dxyz123`)
   - **API Key**: Your API key
   - **API Secret**: Your API secret (keep this secure!)

### 3. Add Credentials to Environment Variables

Add these to your `.env` file:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## 📤 Image Upload Endpoints

### Domain-Specific Routes

**Laptops Domain:**
- Single Image: `POST /api/laptops/upload/image`
- Multiple Images: `POST /api/laptops/upload/images`
- Default Folder: `laptops/products`

**Flowers Domain:**
- Single Image: `POST /api/flowers/upload/image`
- Multiple Images: `POST /api/flowers/upload/images`
- Default Folder: `flowers/products`

### Upload Single Image (Laptops Domain)

**Endpoint:** `POST /api/laptops/upload/image`

**Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: multipart/form-data
```

**Body (form-data):**
- `image`: (file) The image file to upload
- `folder`: (optional) Folder path in Cloudinary (default: `laptops/products`)

**Example using cURL (Laptops Domain):**
```bash
curl -X POST http://localhost:5000/api/laptops/upload/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/image.jpg"
  # folder defaults to 'laptops/products' automatically
```

**Example using cURL (Flowers Domain):**
```bash
curl -X POST http://localhost:5000/api/flowers/upload/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/image.jpg"
  # folder defaults to 'flowers/products' automatically
```

**Response:**
```json
{
  "success": true,
  "data": {
    "image": {
      "public_id": "laptops/products/xyz123",
      "secure_url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/laptops/products/xyz123.jpg",
      "url": "http://res.cloudinary.com/your-cloud/image/upload/v1234567890/laptops/products/xyz123.jpg",
      "width": 1920,
      "height": 1080,
      "format": "jpg"
    }
  }
}
```

### Upload Multiple Images (Laptops Domain)

**Endpoint:** `POST /api/laptops/upload/images`

**Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: multipart/form-data
```

**Body (form-data):**
- `images`: (files) Multiple image files (max 10)
- `folder`: (optional) Folder path in Cloudinary (default: `laptops/products`)

**Example using cURL (Laptops Domain):**
```bash
curl -X POST http://localhost:5000/api/laptops/upload/images \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg" \
  -F "images=@/path/to/image3.jpg"
  # folder defaults to 'laptops/products' automatically
```

**Example using cURL (Flowers Domain):**
```bash
curl -X POST http://localhost:5000/api/flowers/upload/images \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg"
  # folder defaults to 'flowers/products' automatically
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": {
    "images": [
      {
        "public_id": "laptops/products/xyz123",
        "secure_url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/laptops/products/xyz123.jpg",
        "url": "http://res.cloudinary.com/your-cloud/image/upload/v1234567890/laptops/products/xyz123.jpg",
        "width": 1920,
        "height": 1080,
        "format": "jpg"
      },
      // ... more images
    ]
  }
}
```

## 💡 Usage in Product Creation

### Step 1: Upload Images First

```javascript
// Upload multiple images (Laptops Domain)
const formData = new FormData();
formData.append('images', file1);
formData.append('images', file2);
formData.append('images', file3);

const uploadResponse = await fetch('http://localhost:5000/api/laptops/upload/images', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const { data } = await uploadResponse.json();
const imageUrls = data.images.map(img => img.secure_url);
```

### Step 2: Use Image URLs in Product Creation

```javascript
// Create product with image URLs
const productData = {
  name: "Dell Inspiron 15",
  description: "Intel i7 12th Gen laptop",
  images: imageUrls, // Use the secure_urls from upload response
  brand: "Dell",
  condition: "new",
  basePrice: 72990,
  // ... other fields
};

const productResponse = await fetch('http://localhost:5000/api/laptops/products', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(productData)
});
```

## 📝 Complete Example (Frontend)

```javascript
// React example
const handleProductSubmit = async (formData, imageFiles) => {
  try {
    // Step 1: Upload images
    const uploadFormData = new FormData();
    imageFiles.forEach(file => {
      uploadFormData.append('images', file);
    });

    const uploadRes = await axios.post(
      '/api/upload/images',
      uploadFormData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    // Step 2: Extract image URLs
    const imageUrls = uploadRes.data.data.images.map(img => img.secure_url);

    // Step 3: Create product with image URLs
    const productData = {
      ...formData,
      images: imageUrls
    };

    const productRes = await axios.post(
      '/api/laptops/products',
      productData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Product created:', productRes.data);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

## 🔒 Security

- Only **SELLER** and **ADMIN** roles can upload images
- Images are validated (only image files allowed)
- Maximum file size: **5MB** per image
- Maximum images per request: **10**

## 📁 File Organization

Images are organized in Cloudinary folders:
- Default folder: `laptops/products`
- You can specify a custom folder in the upload request

## 🎨 Image Transformations

Cloudinary automatically provides:
- Automatic format optimization
- Responsive image delivery
- Image transformations (resize, crop, etc.) via URL parameters

Example transformation URL:
```
https://res.cloudinary.com/your-cloud/image/upload/w_500,h_500,c_fill/laptops/products/xyz123.jpg
```

## ⚠️ Important Notes

1. **Free Tier Limits**: Cloudinary free tier includes:
   - 25 GB storage
   - 25 GB bandwidth/month
   - Unlimited transformations

2. **Image URLs**: Always use `secure_url` (HTTPS) in production

3. **Error Handling**: If Cloudinary credentials are not configured, uploads will fail with a clear error message

4. **File Types**: Only image files are accepted (jpg, png, gif, webp, etc.)

## 🐛 Troubleshooting

**Issue**: "Cloudinary credentials not provided"
- **Solution**: Make sure you've added Cloudinary credentials to your `.env` file

**Issue**: "File size too large"
- **Solution**: Maximum file size is 5MB. Compress images before uploading

**Issue**: "Only image files are allowed"
- **Solution**: Make sure you're uploading actual image files (jpg, png, etc.)

**Issue**: "Not authorized"
- **Solution**: Make sure you're logged in as SELLER or ADMIN role

