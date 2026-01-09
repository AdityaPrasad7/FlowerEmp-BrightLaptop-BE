/**
 * Express Application Setup
 * Main application configuration and middleware setup
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import env from './shared/infrastructure/config/env.js';
import { errorHandler } from './shared/common/utils/errorHandler.js';
import { apiLimiter } from './shared/common/middlewares/rateLimiter.middleware.js';

// Import flowers domain routes (including auth)
import flowersAuthRoutes from './domains/flowers/auth/routes/auth.routes.js';
import flowersProductRoutes from './domains/flowers/product/routes/product.routes.js';
import flowersOrderRoutes from './domains/flowers/order/routes/order.routes.js';
import flowersCartRoutes from './domains/flowers/cart/routes/cart.routes.js';
import flowersCategoryRoutes from './domains/flowers/category/routes/category.routes.js';
import flowersUploadRoutes from './domains/flowers/upload/routes/upload.routes.js';
import flowersUserRoutes from './domains/flowers/user/routes/user.routes.js';
import flowersPaymentRoutes from './domains/flowers/payment/routes/payment.routes.js';
import flowersOccasionRoutes from './domains/flowers/occasion/routes/occasion.routes.js';
import flowersReviewRoutes from './domains/flowers/reviews/routes/review.routes.js';
import flowersNotificationRoutes from './domains/flowers/notification/routes/notification.routes.js';
import flowersBannerRoutes from './domains/flowers/banner/routes/banner.routes.js';
import flowersTestimonialRoutes from './domains/flowers/testimonial/routes/testimonial.routes.js';

// Import laptops domain routes (including auth)
import laptopsAuthRoutes from './domains/laptops/auth/routes/auth.routes.js';
import laptopsProductRoutes from './domains/laptops/product/routes/product.routes.js';
import laptopsOrderRoutes from './domains/laptops/order/routes/order.routes.js';
import laptopsCartRoutes from './domains/laptops/cart/routes/cart.routes.js';
import laptopsCategoryRoutes from './domains/laptops/category/routes/category.routes.js';
import laptopsUploadRoutes from './domains/laptops/upload/routes/upload.routes.js';
import laptopsContactRoutes from './domains/laptops/contact/routes/contact.routes.js';
import laptopsUserRoutes from './domains/laptops/user/routes/user.routes.js';
import laptopsPaymentRoutes from './domains/laptops/payment/routes/payment.routes.js';
import laptopsComplaintRoutes from './domains/laptops/support/routes/complaint.routes.js';
import laptopsWarehouseRoutes from './domains/laptops/warehouse/routes/warehouse.routes.js';


// ... (existing imports)

// Laptops domain routes


const app = express();

// 🔒 Security Middleware
// Helmet helps secure Express apps by setting various HTTP headers
app.use(helmet());

// CORS configuration
// Allow multiple origins for development (Vite runs on 5173, React on 3000)

const corsOrigin = env.cors.origin || '*';
const corsOriginsList = corsOrigin === '*'
  ? ['*']
  : corsOrigin.split(',').map(origin => origin.trim()).filter(Boolean);

const allowedOrigins = [
  'http://localhost:5173', // Vite default port
  'http://localhost:3000', // React default port
  'http://localhost:5174', // Vite alternative port
  ...corsOriginsList, // Add all origins from CORS_ORIGIN
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list or if '*' is set
    if (corsOrigin === '*' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In development, allow any localhost origin
      if (env.nodeEnv === 'development' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting - apply to all routes
// app.use('/api', apiLimiter);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
// ✅ Explicit domain-based paths only (no backward compatibility for security)
// This ensures clear domain separation and prevents cross-domain confusion

// Flowers domain routes
app.use('/api/flowers/auth', flowersAuthRoutes);
app.use('/api/flowers/products', flowersProductRoutes);
app.use('/api/flowers/orders', flowersOrderRoutes);
app.use('/api/flowers/cart', flowersCartRoutes);
app.use('/api/flowers/categories', flowersCategoryRoutes);
app.use('/api/flowers/upload', flowersUploadRoutes);
// app.use('/api/flowers/users', flowersUserRoutes);
app.use('/api/flowers/users', flowersUserRoutes);
app.use('/api/flowers/payment', flowersPaymentRoutes);
app.use('/api/flowers/occasions', flowersOccasionRoutes);
app.use('/api/flowers/reviews', flowersReviewRoutes);
app.use('/api/flowers/notifications', flowersNotificationRoutes);
app.use('/api/flowers/banners', flowersBannerRoutes);
app.use('/api/flowers/testimonials', flowersTestimonialRoutes);

// Laptops domain routes
app.use('/api/laptops/auth', laptopsAuthRoutes);
app.use('/api/laptops/products', laptopsProductRoutes);
app.use('/api/laptops/orders', laptopsOrderRoutes);
app.use('/api/laptops/cart', laptopsCartRoutes);
app.use('/api/laptops/categories', laptopsCategoryRoutes);
app.use('/api/laptops/upload', laptopsUploadRoutes);
app.use('/api/laptops/contact', laptopsContactRoutes);
app.use('/api/laptops/user', laptopsUserRoutes);
app.use('/api/laptops/payment', laptopsPaymentRoutes);
app.use('/api/laptops/support/complaints', laptopsComplaintRoutes);
app.use('/api/laptops/warehouses', laptopsWarehouseRoutes);
//
// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ⏰ Schedulers
import { startAbandonedOrderScheduler } from './shared/common/schedulers/abandonedOrderScheduler.js';
import { startAbandonedCartScheduler } from './shared/common/schedulers/abandonedCartScheduler.js';

// Start background jobs
startAbandonedOrderScheduler();
// startAbandonedCartScheduler();

// Global error handler (must be last)
app.use(errorHandler);

export default app;
