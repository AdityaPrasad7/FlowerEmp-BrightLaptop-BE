# Laptop Product Creation JSON Examples

Complete examples for creating laptop products via the API.

## 📋 Required Fields Only (Minimal)

```json
{
  "name": "Dell Inspiron 15",
  "description": "Intel i7 12th Gen laptop with 16GB RAM and 512GB SSD",
  "images": [
    "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/laptops/products/image1.jpg",
    "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/laptops/products/image2.jpg"
  ],
  "basePrice": 72990,
  "stock": 50,
  "category": "windows"
}
```

---

## 🎯 Complete Example (All Fields)

```json
{
  "name": "Dell Inspiron 15 | Intel i7 12th Gen | 16GB RAM | 512GB SSD | New",
  "description": "The Dell Inspiron 15 features an Intel i7 12th Gen processor, 16GB DDR4 RAM, and 512GB SSD storage. Perfect for professionals and students. Comes with Windows 11 and a 12-months warranty. Lightweight, durable, and shipped free across India.",
  "images": [
    "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/laptops/products/dell-inspiron-15-1.jpg",
    "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/laptops/products/dell-inspiron-15-2.jpg",
    "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/laptops/products/dell-inspiron-15-3.jpg",
    "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/laptops/products/dell-inspiron-15-4.jpg"
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
  "bulkPricing": [
    {
      "minQty": 20,
      "price": 62041.5
    },
    {
      "minQty": 50,
      "price": 58990
    },
    {
      "minQty": 100,
      "price": 55990
    }
  ],
  "stock": 50,
  "category": "windows",
  "rating": 4.8,
  "reviewsCount": 42,
  "liveViewers": 5,
  "specifications": {
    "screenSize": "15.6\" FHD",
    "resolution": "1920x1080",
    "screenType": "IPS",
    "processor": "Intel i7 12th Gen",
    "generation": "12th Gen",
    "ram": "16GB DDR4",
    "storage": "512GB SSD",
    "touch": false,
    "battery": "Upto 8 hours",
    "adapter": "65W USB-C Adapter"
  },
  "configurationVariants": [
    {
      "type": "RAM",
      "value": "8GB",
      "priceAdjustment": -5000
    },
    {
      "type": "RAM",
      "value": "16GB",
      "priceAdjustment": 0
    },
    {
      "type": "RAM",
      "value": "32GB",
      "priceAdjustment": 15000
    },
    {
      "type": "STORAGE",
      "value": "256GB",
      "priceAdjustment": -3000
    },
    {
      "type": "STORAGE",
      "value": "512GB",
      "priceAdjustment": 0
    },
    {
      "type": "STORAGE",
      "value": "1TB",
      "priceAdjustment": 8000
    }
  ],
  "defaultWarranty": "12 months",
  "warrantyOptions": [
    {
      "duration": "Extra 1 Year",
      "price": 1499
    },
    {
      "duration": "Extra 2 Years",
      "price": 2499
    }
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
}
```

---

## 📝 Field Descriptions

### Required Fields
- **name** (string): Product name
- **images** (array): Array of image URLs (at least 1 required)
- **basePrice** (number): Base selling price
- **stock** (number): Available stock quantity
- **category** (string): Product category (e.g., "windows", "macbooks", "gaming")

### Optional Fields

#### Basic Information
- **description** (string): Product description
- **brand** (string): Brand name (e.g., "Dell", "HP", "Apple")
- **condition** (string): "new" or "refurbished" (default: "new")

#### Pricing
- **mrp** (number): Original MRP price
- **discountPercentage** (number): Discount percentage (0-100)
- **b2bPrice** (number): B2B price (for bulk orders)
- **gstIncluded** (boolean): Whether GST is included (default: true)
- **gstPercentage** (number): GST percentage (default: 18)
- **moq** (number): Minimum order quantity (default: 1)
- **bulkPricing** (array): Bulk pricing tiers

#### Ratings & Reviews
- **rating** (number): Average rating (0-5, default: 0)
- **reviewsCount** (number): Number of reviews (default: 0)
- **liveViewers** (number): Current viewers count (default: 0)

#### Specifications
- **specifications** (object): Product specifications
  - screenSize, resolution, screenType
  - processor, generation
  - ram, storage
  - touch (boolean)
  - battery, adapter

#### Configuration Variants
- **configurationVariants** (array): RAM/Storage options with price adjustments
  - type: "RAM" or "STORAGE"
  - value: Variant value (e.g., "8GB", "256GB")
  - priceAdjustment: Price difference from base

#### Warranty
- **defaultWarranty** (string): Default warranty duration (default: "12 months")
- **warrantyOptions** (array): Extra warranty options with pricing

#### Shipping
- **shipping** (object):
  - freeShipping (boolean)
  - estimatedDeliveryDays (number)

#### Offers
- **offers** (object):
  - exchangeOffer (boolean)
  - exchangeDiscountPercentage (number)
  - noCostEMI (boolean)
  - bankOffers (boolean)

---

## 🔄 Complete Flow Example

### Step 1: Upload Images
```bash
curl -X POST http://localhost:5000/api/laptops/upload/images \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "images": [
      {
        "secure_url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/laptops/products/image1.jpg"
      },
      {
        "secure_url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/laptops/products/image2.jpg"
      }
    ]
  }
}
```

### Step 2: Create Product with Image URLs
```bash
curl -X POST http://localhost:5000/api/laptops/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @LAPTOP_PRODUCT_JSON_EXAMPLE.json
```

Or use the minimal example:
```bash
curl -X POST http://localhost:5000/api/laptops/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @LAPTOP_PRODUCT_MINIMAL_EXAMPLE.json
```

---

## 💡 Quick Reference

**Endpoint:** `POST /api/laptops/products`

**Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Minimal Required Fields:**
- name
- images (array with at least 1 URL)
- basePrice
- stock
- category

**Note:** Replace image URLs with actual `secure_url` values from the upload response!

