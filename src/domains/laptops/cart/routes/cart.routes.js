/**
 * Cart Routes (Laptops Domain)
 */
import express from 'express';
import {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from '../controllers/cart.controller.js';
import { checkout } from '../../checkout/controllers/checkout.controller.js';
import { protect } from '../../../../shared/common/middlewares/auth.middleware.js';
import { validate, validateParams } from '../../../../shared/common/middlewares/validate.middleware.js';
import { z } from 'zod';
import { productIdParamSchema } from '../../../../shared/common/validators/params.validator.js';
import { checkoutSchema } from '../../checkout/validators/checkout.validator.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Cart validation schemas
const addToCartSchema = z.object({
  productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),
  quantity: z.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1'),
});

const updateCartItemSchema = z.object({
  productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),
  quantity: z.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1'),
});

// Cart routes
router.post('/add', validate(addToCartSchema), addToCart);
router.get('/', getCart);
router.put('/update', validate(updateCartItemSchema), updateCartItem);
router.delete('/remove/:productId', validateParams(productIdParamSchema), removeFromCart);
router.delete('/clear', clearCart);

// Checkout route
router.post('/checkout', validate(checkoutSchema), checkout);

export default router;

