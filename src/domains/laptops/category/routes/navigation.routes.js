/**
 * Navigation Category Routes (Laptops Domain)
 * 
 * Buyer Endpoints (Public):
 * - GET /api/laptops/navigation-categories/types/list - Get navigation category types
 * - GET /api/laptops/navigation-categories/active - Get active navigation categories for header
 * - GET /api/laptops/navigation-categories/:slug/products - Get products filtered by navigation category
 * - GET /api/laptops/navigation-categories - Get all navigation categories
 * - GET /api/laptops/navigation-categories/slug/:slug - Get navigation category by slug
 * - GET /api/laptops/navigation-categories/:id - Get navigation category by ID
 * 
 * Seller/Admin Endpoints (Protected):
 * - POST /api/laptops/navigation-categories - Create navigation category
 * - PUT /api/laptops/navigation-categories/:id - Update navigation category
 * - PUT /api/laptops/navigation-categories/:id/reorder - Reorder single navigation category
 * - PUT /api/laptops/navigation-categories/reorder - Bulk reorder navigation categories
 * - DELETE /api/laptops/navigation-categories/:id - Delete navigation category (soft delete)
 */
import express from 'express';
import {
  createNavigationCategory,
  getNavigationCategories,
  getActiveNavigationCategories,
  getNavigationCategory,
  getNavigationCategoryBySlug,
  updateNavigationCategory,
  reorderNavigationCategory,
  bulkReorderNavigationCategories,
  deleteNavigationCategory,
  getNavigationCategoryTypes,
  getProductsByNavigationCategory,
} from '../controllers/navigation.controller.js';
import { protect } from '../../../../shared/common/middlewares/auth.middleware.js';
import { restrictTo } from '../../../../shared/common/middlewares/role.middleware.js';
import { validate, validateParams } from '../../../../shared/common/middlewares/validate.middleware.js';
import {
  createNavigationCategorySchema,
  updateNavigationCategorySchema,
  reorderNavigationCategorySchema,
  bulkReorderNavigationCategoriesSchema,
} from '../validators/navigation.validator.js';
import { mongoIdParamSchema } from '../../../../shared/common/validators/params.validator.js';

const router = express.Router();

// Public routes (Buyer endpoints)
router.get('/types/list', getNavigationCategoryTypes);
router.get('/active', getActiveNavigationCategories);
router.get('/:slug/products', getProductsByNavigationCategory); // Buyer: Get products by navigation category
router.get('/', getNavigationCategories);
router.get('/slug/:slug', getNavigationCategoryBySlug);
router.get('/:id', validateParams(mongoIdParamSchema), getNavigationCategory);

// Protected routes (Admin/Seller only) with validation
router.post(
  '/',
  protect,
  restrictTo('SELLER', 'ADMIN'),
  validate(createNavigationCategorySchema),
  createNavigationCategory
);
router.put(
  '/:id',
  protect,
  restrictTo('SELLER', 'ADMIN'),
  validateParams(mongoIdParamSchema),
  validate(updateNavigationCategorySchema),
  updateNavigationCategory
);
router.put(
  '/:id/reorder',
  protect,
  restrictTo('SELLER', 'ADMIN'),
  validateParams(mongoIdParamSchema),
  validate(reorderNavigationCategorySchema),
  reorderNavigationCategory
);
router.put(
  '/reorder',
  protect,
  restrictTo('SELLER', 'ADMIN'),
  validate(bulkReorderNavigationCategoriesSchema),
  bulkReorderNavigationCategories
);
router.delete(
  '/:id',
  protect,
  restrictTo('SELLER', 'ADMIN'),
  validateParams(mongoIdParamSchema),
  deleteNavigationCategory
);

export default router;

