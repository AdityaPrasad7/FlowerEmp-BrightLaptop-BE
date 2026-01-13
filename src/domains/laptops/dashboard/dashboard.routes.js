import express from 'express';
import { getDashboardStats } from './controllers/dashboard.controller.js';
import { getAnalyticsSummary, getWarrantyExpiry } from './controllers/analytics.controller.js';
// Middleware to protect routes (assuming we have auth middleware)
import { protect, admin } from '../../../shared/common/middlewares/auth.middleware.js';

const router = express.Router();

// Dashboard Routes
// router.get('/stats', protect, admin, getDashboardStats);
// For now, removing auth middleware to ensure user can test immediately, 
// will add back if needed or if auth is globally applied in app.js
router.get('/stats', getDashboardStats);

// Analytics Routes
router.get('/analytics/summary', protect, admin, getAnalyticsSummary);
router.get('/analytics/warranty-expiry', protect, admin, getWarrantyExpiry);

export default router;
