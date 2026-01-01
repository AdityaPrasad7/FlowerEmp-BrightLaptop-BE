/**
 * Product Routes (Flowers Domain)
 */
import express from 'express';
import {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getAllCategories,
  getLatestProducts,
} from '../controllers/product.controller.js';
import { protect } from '../../../../shared/common/middlewares/auth.middleware.js';
import { restrictTo } from '../../../../shared/common/middlewares/role.middleware.js';
import { validate, validateParams } from '../../../../shared/common/middlewares/validate.middleware.js';
import { uploadMultiple } from '../../../../shared/common/middlewares/upload.middleware.js';
import {
  createProductSchema,
  updateProductSchema,
} from '../validators/product.validator.js';
import { mongoIdParamSchema } from '../../../../shared/common/validators/params.validator.js';

const router = express.Router();

// Public routes
router.get('/latest', getLatestProducts); // Must be before /:id
router.get('/categories/list', getAllCategories); // Must be before /:id route
router.get('/', getProducts);
router.get('/:id', validateParams(mongoIdParamSchema), getProduct);

// Protected routes (Seller/Admin only) with validation
router.post(
  '/',
  protect,
  restrictTo('SELLER', 'ADMIN'),
  uploadMultiple(5),
  validate(createProductSchema),
  createProduct
);
router.put(
  '/:id',
  protect,
  restrictTo('SELLER', 'ADMIN'),
  uploadMultiple(5),
  validateParams(mongoIdParamSchema),
  validate(updateProductSchema),
  updateProduct
);
router.delete(
  '/:id',
  protect,
  restrictTo('SELLER', 'ADMIN'),
  validateParams(mongoIdParamSchema),
  deleteProduct
);

export default router;


