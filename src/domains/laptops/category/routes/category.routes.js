/**
 * Category Routes (Laptops Domain)
 */
import express from 'express';
import {
  createCategory,
  getCategories,
  getCategory,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
  deleteCategoryByName,
  getCategoryTypes,
} from '../controllers/category.controller.js';
import { getProductsByCategory } from '../../product/controllers/product.controller.js';
import { protect } from '../../../../shared/common/middlewares/auth.middleware.js';
import { restrictTo } from '../../../../shared/common/middlewares/role.middleware.js';
import { validate, validateParams } from '../../../../shared/common/middlewares/validate.middleware.js';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../validators/category.validator.js';
import { mongoIdParamSchema } from '../../../../shared/common/validators/params.validator.js';

const router = express.Router();

// Protected DELETE routes (must be before parameterized GET routes)
// Delete by category name (string) - for products that use category strings
router.delete(
  '/name/:categoryName',
  protect,
  restrictTo('SELLER', 'ADMIN'), // SELLER and ADMIN can delete categories and products
  deleteCategoryByName
);

// Delete by category ID (from Category model)
router.delete(
  '/:id',
  protect,
  restrictTo('SELLER', 'ADMIN'), // SELLER and ADMIN can delete categories and products
  validateParams(mongoIdParamSchema),
  deleteCategory
);

// Public routes
router.get('/types/list', getCategoryTypes);
router.get('/:categoryName/products', getProductsByCategory); // Must be before /:id route
router.get('/', getCategories);
router.get('/slug/:slug', getCategoryBySlug);
router.get('/:id', validateParams(mongoIdParamSchema), getCategory);

// Protected routes (Admin/Seller only) with validation
router.post(
  '/',
  protect,
  restrictTo('SELLER', 'ADMIN'),
  validate(createCategorySchema),
  createCategory
);
router.put(
  '/:id',
  protect,
  restrictTo('SELLER', 'ADMIN'),
  validateParams(mongoIdParamSchema),
  validate(updateCategorySchema),
  updateCategory
);

export default router;

