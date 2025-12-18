# Flower Emporium Backend

Production-ready Node.js backend for a B2B/B2C e-commerce platform supporting MOQ-based orders and bulk pricing.

## 🚀 Features

- **Dual Commerce Support**: Handles both B2B (MOQ-based) and B2C orders
- **Role-Based Access Control**: Four user roles (B2C_BUYER, B2B_BUYER, SELLER, ADMIN)
- **MOQ Validation**: Enforces minimum order quantities for B2B orders
- **Bulk Pricing**: Dynamic pricing based on quantity tiers
- **JWT Authentication**: Secure token-based authentication
- **Order Management**: Order approval workflow for B2B orders
- **Stock Management**: Real-time inventory tracking

## 📋 Prerequisites

- Node.js (>=18)
- MongoDB (local or cloud instance)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository** (if applicable) or navigate to the backend directory:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the `backend` directory:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/flower-emporium

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRE=7d

   # CORS Configuration
   CORS_ORIGIN=http://localhost:3000
   ```

4. **Start MongoDB**:
   Make sure MongoDB is running on your system. If using MongoDB Atlas, update the `MONGODB_URI` in your `.env` file.

5. **Run the server**:
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:5000` (or the port specified in your `.env` file).

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── db.js        # MongoDB connection
│   │   └── env.js       # Environment variables
│   │
│   ├── models/          # Mongoose models
│   │   ├── User.model.js
│   │   ├── Product.model.js
│   │   └── Order.model.js
│   │
│   ├── controllers/     # Route controllers
│   │   ├── auth.controller.js
│   │   ├── product.controller.js
│   │   └── order.controller.js
│   │
│   ├── routes/          # Express routes
│   │   ├── auth.routes.js
│   │   ├── product.routes.js
│   │   └── order.routes.js
│   │
│   ├── middlewares/     # Custom middlewares
│   │   ├── auth.middleware.js
│   │   └── role.middleware.js
│   │
│   ├── services/        # Business logic services
│   │   ├── moq.service.js
│   │   └── pricing.service.js
│   │
│   ├── utils/           # Utility functions
│   │   └── errorHandler.js
│   │
│   └── app.js           # Express app setup
│
├── server.js            # Server entry point
├── package.json
└── README.md
```

## 🔐 User Roles

- **B2C_BUYER**: Regular consumer, can place B2C orders (quantity >= 1)
- **B2B_BUYER**: Business buyer, can place B2B orders (quantity >= MOQ), requires company name
- **SELLER**: Can create/manage products and approve orders
- **ADMIN**: Full access to all features

## 📡 API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "B2C_BUYER",
    "companyName": "Optional for B2B"
  }
  ```

- `POST /api/auth/login` - Login user
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```

- `GET /api/auth/me` - Get current user (Protected)

### Products

- `GET /api/products` - Get all products (Public)
- `GET /api/products/:id` - Get single product (Public)
- `POST /api/products` - Create product (Seller/Admin only)
  ```json
  {
    "name": "Rose Bouquet",
    "description": "Beautiful red roses",
    "basePrice": 29.99,
    "moq": 10,
    "bulkPricing": [
      { "minQty": 50, "price": 24.99 },
      { "minQty": 100, "price": 19.99 }
    ],
    "stock": 500
  }
  ```
- `PUT /api/products/:id` - Update product (Seller/Admin only)
- `DELETE /api/products/:id` - Delete product (Seller/Admin only)

### Orders

- `POST /api/orders` - Create order (Protected)
  ```json
  {
    "products": [
      {
        "productId": "product_id_here",
        "quantity": 50
      }
    ],
    "orderType": "B2B",
    "notes": "Optional notes"
  }
  ```

- `GET /api/orders` - Get user's orders (Protected)
- `GET /api/orders/:id` - Get single order (Protected)
- `PUT /api/orders/:id/approve` - Approve order (Seller/Admin only)
- `PUT /api/orders/:id/status` - Update order status (Seller/Admin only)

## 🔒 Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## 💡 Business Logic

### B2C Orders
- Minimum quantity: 1
- Status: Auto-approved (APPROVED)
- Stock deducted immediately

### B2B Orders
- Minimum quantity: Must meet product MOQ
- Status: Pending (PENDING) - requires seller/admin approval
- Stock deducted only after approval
- Bulk pricing applied automatically based on quantity

### MOQ Validation
- B2B orders are rejected if quantity < MOQ
- Error message clearly indicates required MOQ

### Bulk Pricing
- Applied automatically when order quantity meets tier requirements
- Tiers must be in ascending order by minQty
- Highest applicable tier is used

## 🧪 Testing the API

### 1. Register a Seller
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Seller Name",
    "email": "seller@example.com",
    "password": "password123",
    "role": "SELLER"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seller@example.com",
    "password": "password123"
  }'
```

Save the token from the response.

### 3. Create a Product
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Premium Roses",
    "description": "High-quality red roses",
    "basePrice": 30.00,
    "moq": 10,
    "bulkPricing": [
      {"minQty": 50, "price": 25.00},
      {"minQty": 100, "price": 20.00}
    ],
    "stock": 1000
  }'
```

### 4. Register a B2B Buyer
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Business Buyer",
    "email": "b2b@example.com",
    "password": "password123",
    "role": "B2B_BUYER",
    "companyName": "ABC Company"
  }'
```

### 5. Create a B2B Order
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer B2B_BUYER_TOKEN" \
  -d '{
    "products": [
      {
        "productId": "PRODUCT_ID_HERE",
        "quantity": 50
      }
    ],
    "orderType": "B2B"
  }'
```

## 🐛 Error Handling

The API uses centralized error handling with appropriate HTTP status codes:

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

Error response format:
```json
{
  "success": false,
  "error": "Error message here"
}
```

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment (development/production) | development |
| `MONGODB_URI` | MongoDB connection string | Required |
| `JWT_SECRET` | Secret key for JWT tokens | Required |
| `JWT_EXPIRE` | JWT token expiration | 7d |
| `CORS_ORIGIN` | Allowed CORS origin | * |

## 📝 Notes

- Passwords are hashed using bcrypt (salt rounds: 10)
- JWT tokens expire after 7 days (configurable)
- Product deletion is soft delete (sets `isActive` to false)
- Stock is only deducted when order is approved
- Bulk pricing tiers must be in ascending order

## 🚀 Production Considerations

Before deploying to production:

1. Change `JWT_SECRET` to a strong, random string
2. Set `NODE_ENV=production`
3. Use a secure MongoDB connection (MongoDB Atlas recommended)
4. Configure proper CORS origins
5. Set up proper logging and monitoring
6. Use environment-specific configuration
7. Implement rate limiting
8. Add input validation middleware (e.g., express-validator)
9. Set up database backups
10. Use HTTPS in production

## 📄 License

ISC

## 👥 Support

For issues or questions, please refer to the project documentation or contact the development team.

