/**
 * Order Validation Schemas (Flowers Domain)
 * Zod schemas for order endpoints
 */
import { z } from 'zod';
import { mongoIdSchema, positiveIntegerSchema } from '../../../../shared/common/validators/common.validator.js';

/**
 * Order status enum
 */
const orderStatusEnum = z.enum(['PENDING', 'APPROVED', 'SHIPPED', 'CANCELLED'], {
  errorMap: () => ({
    message: 'Status must be one of: PENDING, APPROVED, SHIPPED, CANCELLED',
  }),
});

/**
 * Order item schema (product in order)
 */
const orderItemSchema = z.object({
  productId: mongoIdSchema,
  quantity: z.union([
    z.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1'),
    z.string().transform((val) => {
      const num = parseInt(val, 10);
      if (isNaN(num) || num < 1 || !Number.isInteger(num)) {
        throw new Error('Quantity must be an integer >= 1');
      }
      return num;
    }),
  ]),
});

/**
 * Create order validation schema
 */
export const createOrderSchema = z.object({
  products: z
    .array(orderItemSchema)
    .min(1, 'Products array must contain at least one product'),
  notes: z
    .string()
    .trim()
    .max(500, 'Notes must not exceed 500 characters')
    .optional()
    .default(''),
});

/**
 * Update order status validation schema
 */
export const updateOrderStatusSchema = z.object({
  status: orderStatusEnum,
});


