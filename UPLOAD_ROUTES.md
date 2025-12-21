# Image Upload Routes - Domain-Specific

Image upload functionality has been split into domain-specific routes for better organization and separation.

## 📍 Upload Endpoints

### Laptops Domain

**Upload Single Image:**
```
POST /api/laptops/upload/image
```

**Upload Multiple Images:**
```
POST /api/laptops/upload/images
```

**Default Folder:** `laptops/products`

---

### Flowers Domain

**Upload Single Image:**
```
POST /api/flowers/upload/image
```

**Upload Multiple Images:**
```
POST /api/flowers/upload/images
```

**Default Folder:** `flowers/products`

---

## 🔑 Benefits of Domain-Specific Routes

1. **Clear Separation**: Each domain has its own upload endpoints
2. **Automatic Folder Organization**: Images are automatically organized by domain in Cloudinary
3. **Domain-Specific Authentication**: Uses the correct User model for each domain
4. **Consistency**: Matches the pattern of other domain-specific routes
5. **Future Flexibility**: Each domain can have custom upload logic if needed

---

## 📝 Usage Examples

### Laptops Domain

```javascript
// Upload images for laptops
const formData = new FormData();
formData.append('images', file1);
formData.append('images', file2);

const response = await fetch('http://localhost:5000/api/laptops/upload/images', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${laptopsToken}`
  },
  body: formData
});

const { data } = await response.json();
// Images are stored in 'laptops/products' folder
```

### Flowers Domain

```javascript
// Upload images for flowers
const formData = new FormData();
formData.append('images', file1);
formData.append('images', file2);

const response = await fetch('http://localhost:5000/api/flowers/upload/images', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${flowersToken}`
  },
  body: formData
});

const { data } = await response.json();
// Images are stored in 'flowers/products' folder
```

---

## 🔄 Migration from Shared Route

If you were using the old shared route `/api/upload/images`, update to:

- **Laptops**: `/api/laptops/upload/images`
- **Flowers**: `/api/flowers/upload/images`

---

## 📁 Cloudinary Folder Structure

Images are automatically organized:

```
cloudinary/
├── laptops/
│   ├── products/
│   │   ├── image1.jpg
│   │   └── image2.jpg
│   └── categories/
└── flowers/
    ├── products/
    │   ├── image1.jpg
    │   └── image2.jpg
    └── categories/
```

---

## ⚙️ Override Default Folder

You can still specify a custom folder:

```javascript
const formData = new FormData();
formData.append('images', file1);
formData.append('folder', 'laptops/custom-folder'); // Override default

const response = await fetch('/api/laptops/upload/images', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

