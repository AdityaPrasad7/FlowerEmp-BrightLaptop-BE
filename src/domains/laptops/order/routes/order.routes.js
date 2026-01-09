/**
 * Order Routes (Laptops Domain)
 */
import express from 'express';
import {
  createOrder,
  getOrders,
  getOrder,
  approveOrder,
  updateOrderStatus,
  updatePaymentStatus,
  getInvoice,
} from '../controllers/order.controller.js';
import { protect } from '../../../../shared/common/middlewares/auth.middleware.js';
import { restrictTo } from '../../../../shared/common/middlewares/role.middleware.js';
import { validate, validateParams } from '../../../../shared/common/middlewares/validate.middleware.js';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
} from '../validators/order.validator.js';
import { mongoIdParamSchema } from '../../../../shared/common/validators/params.validator.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// User routes with validation
router.post('/', validate(createOrderSchema), createOrder);
router.get('/', getOrders);
// More specific routes must come before generic /:id route
router.get('/:id/invoice', validateParams(mongoIdParamSchema), getInvoice);
router.get('/:id', validateParams(mongoIdParamSchema), getOrder);

// Seller/Admin routes with validation
router.put(
  '/:id/approve',
  restrictTo('SELLER', 'ADMIN'),
  validateParams(mongoIdParamSchema),
  approveOrder
);
router.put(
  '/:id/status',
  restrictTo('SELLER', 'ADMIN'),
  validateParams(mongoIdParamSchema),
  validate(updateOrderStatusSchema),
  updateOrderStatus
);
router.put(
  '/:id/payment-status',
  restrictTo('SELLER', 'ADMIN'),
  validateParams(mongoIdParamSchema),
  validate(updatePaymentStatusSchema),
  updatePaymentStatus
);

export default router;

