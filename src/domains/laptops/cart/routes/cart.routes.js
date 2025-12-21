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
import { productIdParamSchema } from '../../../../shared/common/validators/params.validator.js';
import { checkoutSchema } from '../../checkout/validators/checkout.validator.js';
import { addToCartSchema, updateCartItemSchema } from '../validators/cart.validator.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Cart routes
router.post('/add', validate(addToCartSchema), addToCart);
router.get('/', getCart);
router.put('/update', validate(updateCartItemSchema), updateCartItem);
router.delete('/remove/:productId', validateParams(productIdParamSchema), removeFromCart);
router.delete('/clear', clearCart);

// Checkout route
router.post('/checkout', validate(checkoutSchema), checkout);

export default router;

