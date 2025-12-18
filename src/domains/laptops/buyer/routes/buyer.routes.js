/**
 * Buyer Routes (Laptops Domain)
 * 
 * Public Buyer Endpoints:
 * - GET /api/laptops/buyer/navigation-categories - Get navigation categories for header
 * - GET /api/laptops/buyer/all-laptops - Get all laptops
 * - GET /api/laptops/buyer/new-arrivals - Get new arrivals
 * - GET /api/laptops/buyer/business - Get business laptops
 * - GET /api/laptops/buyer/gaming - Get gaming laptops
 * - GET /api/laptops/buyer/student - Get student laptops
 * - GET /api/laptops/buyer/creative - Get creative laptops
 * - GET /api/laptops/buyer/pre-owned - Get pre-owned laptops
 */
import express from 'express';
import {
  getNavigationCategories,
  getAllLaptops,
  getNewArrivals,
  getBusinessLaptops,
  getGamingLaptops,
  getStudentLaptops,
  getCreativeLaptops,
  getPreOwnedLaptops,
} from '../controllers/buyer.controller.js';

const router = express.Router();

// All routes are public (buyer endpoints)
router.get('/navigation-categories', getNavigationCategories);
router.get('/all-laptops', getAllLaptops);
router.get('/new-arrivals', getNewArrivals);
router.get('/business', getBusinessLaptops);
router.get('/gaming', getGamingLaptops);
router.get('/student', getStudentLaptops);
router.get('/creative', getCreativeLaptops);
router.get('/pre-owned', getPreOwnedLaptops);

export default router;

