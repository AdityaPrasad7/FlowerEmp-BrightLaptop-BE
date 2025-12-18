/**
 * Category Routes (Flowers Domain)
 * Routes for product categories
 */
import express from 'express';
import { getProductsByCategory } from '../../product/controllers/product.controller.js';

const router = express.Router();

// Public routes
router.get('/:categoryName/products', getProductsByCategory);

export default router;

