# Product Creation API Guide

Complete guide for creating a product with image uploads.

## 📋 Overview

The product creation process involves **2 steps**:
1. **Upload images** to Cloudinary (get image URLs)
2. **Create product** using the image URLs

---

## 🔐 Authentication

All endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

**To get a token:**
- Login: `POST /api/laptops/auth/login`
- Register: `POST /api/laptops/auth/register`

---

## Step 1: Upload Images

### Endpoints (Domain-Specific)

**For Laptops Domain:**
```
POST /api/laptops/upload/images
```

**For Flowers Domain:**
```
POST /api/flowers/upload/images
```

### Headers
```
Authorization: Bearer <your-jwt-token>
Content-Type: multipart/form-data
```

### Request Body (Form Data)
- `images`: (file) Image files (max 10 images)
- `folder`: (optional) Cloudinary folder path (default: `laptops/products`)

### cURL Examples

**Laptops Domain:**
```bash
curl -X POST http://localhost:5000/api/laptops/upload/images \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg" \
  -F "images=@/path/to/image3.jpg"
  # folder defaults to 'laptops/products' automatically
```

**Flowers Domain:**
```bash
curl -X POST http://localhost:5000/api/flowers/upload/images \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg"
  # folder defaults to 'flowers/products' automatically
```

### JavaScript/Fetch Examples

**Laptops Domain:**
```javascript
const uploadImages = async (imageFiles, token) => {
  const formData = new FormData();
  
  // Add all image files
  imageFiles.forEach(file => {
    formData.append('images', file);
  });
  
  // Optional: override default folder (defaults to 'laptops/products')
  // formData.append('folder', 'laptops/custom-folder');

  const response = await fetch('http://localhost:5000/api/laptops/upload/images', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
      // Don't set Content-Type header - browser will set it with boundary
    },
    body: formData
  });

  const data = await response.json();
  return data;
};

// Usage
const imageFiles = [file1, file2, file3]; // File objects from input
const result = await uploadImages(imageFiles, 'your-jwt-token');
console.log(result.data.images); // Array of uploaded image objects
```

**Flowers Domain:**
```javascript
const uploadImages = async (imageFiles, token) => {
  const formData = new FormData();
  imageFiles.forEach(file => {
    formData.append('images', file);
  });

  const response = await fetch('http://localhost:5000/api/flowers/upload/images', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  return await response.json();
};
```

### Response
```json
{
  "success": true,
  "count": 3,
  "data": {
    "images": [
      {
        "public_id": "laptops/products/xyz123abc",
        "secure_url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/laptops/products/xyz123abc.jpg",
        "url": "http://res.cloudinary.com/your-cloud/image/upload/v1234567890/laptops/products/xyz123abc.jpg",
        "width": 1920,
        "height": 1080,
        "format": "jpg"
      },
      {
        "public_id": "laptops/products/xyz456def",
        "secure_url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/laptops/products/xyz456def.jpg",
        "url": "http://res.cloudinary.com/your-cloud/image/upload/v1234567890/laptops/products/xyz456def.jpg",
        "width": 1920,
        "height": 1080,
        "format": "jpg"
      },
      {
        "public_id": "laptops/products/xyz789ghi",
        "secure_url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/laptops/products/xyz789ghi.jpg",
        "url": "http://res.cloudinary.com/your-cloud/image/upload/v1234567890/laptops/products/xyz789ghi.jpg",
        "width": 1920,
        "height": 1080,
        "format": "jpg"
      }
    ]
  }
}
```

**Important:** Extract the `secure_url` from each image object for use in product creation.

---

## Step 2: Create Product

### Endpoint
```
POST /api/laptops/products
```

### Headers
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

### Request Body (JSON)

#### Required Fields
- `name` (string): Product name
- `images` (array): Array of image URLs from Step 1
- `basePrice` (number): Base price
- `stock` (number): Stock quantity
- `category` (string): Product category

#### Optional Fields
- `description` (string): Product description
- `brand` (string): Brand name
- `condition` (string): "new" or "refurbished" (default: "new")
- `mrp` (number): Original MRP price
- `discountPercentage` (number): Discount percentage (0-100)
- `b2bPrice` (number): B2B price
- `gstIncluded` (boolean): Whether GST is included (default: true)
- `gstPercentage` (number): GST percentage (default: 18)
- `moq` (number): Minimum order quantity (default: 1)
- `bulkPricing` (array): Bulk pricing tiers
- `rating` (number): Average rating (0-5, default: 0)
- `reviewsCount` (number): Number of reviews (default: 0)
- `liveViewers` (number): Current viewers count (default: 0)
- `specifications` (object): Product specifications
- `configurationVariants` (array): RAM/Storage variants
- `defaultWarranty` (string): Default warranty (default: "12 months")
- `warrantyOptions` (array): Extra warranty options
- `shipping` (object): Shipping information
- `offers` (object): Offers and discounts

### cURL Example
```bash
curl -X POST http://localhost:5000/api/laptops/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dell Inspiron 15",
    "description": "Intel i7 12th Gen laptop",
    "images": [
      "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/laptops/products/xyz123abc.jpg",
      "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/laptops/products/xyz456def.jpg",
      "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/laptops/products/xyz789ghi.jpg"
    ],
    "brand": "Dell",
    "condition": "new",
    "basePrice": 72990,
    "mrp": 78990,
    "discountPercentage": 8,
    "b2bPrice": 62041.5,
    "gstIncluded": true,
    "gstPercentage": 18,
    "moq": 10,
    "stock": 50,
    "category": "windows",
    "rating": 4.8,
    "reviewsCount": 42,
    "liveViewers": 5,
    "specifications": {
      "screenSize": "15.6\" FHD",
      "processor": "Intel i7 12th Gen",
      "generation": "4th Gen",
      "ram": "16GB DDR4",
      "storage": "512GB SSD",
      "touch": false
    },
    "configurationVariants": [
      { "type": "RAM", "value": "8GB", "priceAdjustment": -5000 },
      { "type": "RAM", "value": "16GB", "priceAdjustment": 0 },
      { "type": "STORAGE", "value": "256GB", "priceAdjustment": -3000 }
    ],
    "defaultWarranty": "12 months",
    "warrantyOptions": [
      { "duration": "Extra 1 Year", "price": 1499 },
      { "duration": "Extra 2 Years", "price": 2499 }
    ],
    "shipping": {
      "freeShipping": true,
      "estimatedDeliveryDays": 7
    },
    "offers": {
      "exchangeOffer": true,
      "exchangeDiscountPercentage": 50,
      "noCostEMI": true,
      "bankOffers": true
    }
  }'
```

### JavaScript/Fetch Example
```javascript
const createProduct = async (productData, token) => {
  const response = await fetch('http://localhost:5000/api/laptops/products', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(productData)
  });

  const data = await response.json();
  return data;
};

// Usage
const productData = {
  name: "Dell Inspiron 15",
  description: "Intel i7 12th Gen laptop",
  images: [
    "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/laptops/products/xyz123abc.jpg",
    "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/laptops/products/xyz456def.jpg"
  ],
  brand: "Dell",
  condition: "new",
  basePrice: 72990,
  mrp: 78990,
  discountPercentage: 8,
  stock: 50,
  category: "windows",
  // ... other fields
};

const result = await createProduct(productData, 'your-jwt-token');
console.log(result.data.product);
```

### Response
```json
{
  "success": true,
  "data": {
    "product": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "name": "Dell Inspiron 15",
      "description": "Intel i7 12th Gen laptop",
      "images": [
        "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/laptops/products/xyz123abc.jpg",
        "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/laptops/products/xyz456def.jpg"
      ],
      "brand": "Dell",
      "condition": "new",
      "basePrice": 72990,
      "mrp": 78990,
      "discountPercentage": 8,
      "stock": 50,
      "category": "windows",
      "sellerId": "65a1b2c3d4e5f6g7h8i9j0k1",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

---

## 🔄 Complete Flow Example (React)

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Complete product creation flow
const createProductWithImages = async (productFormData, imageFiles, token) => {
  try {
    // Step 1: Upload images
    console.log('Step 1: Uploading images...');
    const uploadFormData = new FormData();
    imageFiles.forEach(file => {
      uploadFormData.append('images', file);
    });
    uploadFormData.append('folder', 'laptops/products');

    const uploadResponse = await axios.post(
      `${API_BASE_URL}/laptops/upload/images`, // Use domain-specific endpoint
      uploadFormData,
      {
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type - axios will set it automatically
        }
      }
    );

    // Extract image URLs
    const imageUrls = uploadResponse.data.data.images.map(img => img.secure_url);
    console.log('Images uploaded:', imageUrls);

    // Step 2: Create product with image URLs
    console.log('Step 2: Creating product...');
    const productData = {
      ...productFormData,
      images: imageUrls // Use uploaded image URLs
    };

    const productResponse = await axios.post(
      `${API_BASE_URL}/laptops/products`,
      productData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Product created:', productResponse.data.data.product);
    return productResponse.data.data.product;

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
};

// Usage in React component
const ProductForm = () => {
  const [imageFiles, setImageFiles] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: '',
    stock: '',
    category: '',
    // ... other fields
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (imageFiles.length === 0) {
      alert('Please select at least one image');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const product = await createProductWithImages(formData, imageFiles, token);
      alert('Product created successfully!');
      // Redirect or reset form
    } catch (error) {
      alert('Failed to create product: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => setImageFiles(Array.from(e.target.files))}
      />
      {/* Other form fields */}
      <button type="submit">Create Product</button>
    </form>
  );
};
```

---

## 📝 Minimal Example (Only Required Fields)

```javascript
// Step 1: Upload images
const formData = new FormData();
formData.append('images', imageFile1);
formData.append('images', imageFile2);

const uploadRes = await fetch('/api/laptops/upload/images', { // Use domain-specific endpoint
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});

const { data: uploadData } = await uploadRes.json();
const imageUrls = uploadData.images.map(img => img.secure_url);

// Step 2: Create product
const productRes = await fetch('/api/laptops/products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: "Dell Inspiron 15",
    images: imageUrls,
    basePrice: 72990,
    stock: 50,
    category: "windows"
  })
});

const { data: productData } = await productRes.json();
console.log('Product created:', productData.product);
```

---

## ⚠️ Important Notes

1. **Image URLs**: Always use `secure_url` from the upload response (HTTPS)
2. **File Size**: Maximum 5MB per image
3. **File Count**: Maximum 10 images per upload request
4. **File Types**: Only image files (jpg, png, gif, webp, etc.)
5. **Authentication**: Both endpoints require SELLER or ADMIN role
6. **Order**: Always upload images first, then create product with URLs

---

## 🐛 Error Handling

### Common Errors

**401 Unauthorized**
- Missing or invalid JWT token
- Solution: Login again to get a new token

**403 Forbidden**
- User doesn't have SELLER or ADMIN role
- Solution: Register/login as SELLER or ADMIN

**400 Bad Request**
- Missing required fields
- Invalid data format
- Solution: Check request body matches schema

**413 Payload Too Large**
- Image file exceeds 5MB
- Solution: Compress images before uploading

---

## 📚 Related Endpoints

- **Get Product**: `GET /api/laptops/products/:id`
- **Update Product**: `PUT /api/laptops/products/:id`
- **Delete Product**: `DELETE /api/laptops/products/:id`
- **Get All Products**: `GET /api/laptops/products`

