/**
 * Order Validation Schemas (Laptops Domain)
 * Joi schemas for order endpoints
 */
import Joi from 'joi';
import { mongoIdSchema } from '../../../../shared/common/validators/common.validator.js';

/**
 * Order status enum
 */
const orderStatusEnum = Joi.string().valid('PENDING', 'APPROVED', 'SHIPPED', 'CANCELLED').messages({
  'any.only': 'Status must be one of: PENDING, APPROVED, SHIPPED, CANCELLED',
});

/**
 * Order item schema (product in order)
 */
const orderItemSchema = Joi.object({
  productId: mongoIdSchema.required().messages({
    'any.required': 'Product ID is required',
  }),
  quantity: Joi.alternatives().try(
    Joi.number().integer().min(1).messages({
      'number.base': 'Quantity must be an integer >= 1',
      'number.integer': 'Quantity must be an integer',
      'number.min': 'Quantity must be at least 1',
    }),
    Joi.string().custom((value, helpers) => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1 || !Number.isInteger(num)) {
        return helpers.error('number.base');
      }
      return num;
    }).messages({
      'number.base': 'Quantity must be an integer >= 1',
    })
  ).required(),
});

/**
 * Create order validation schema
 */
export const createOrderSchema = Joi.object({
  products: Joi.array()
    .items(orderItemSchema)
    .min(1)
    .required()
    .messages({
      'array.min': 'Products array must contain at least one product',
      'any.required': 'Products array is required',
    }),
  notes: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .optional()
    .default('')
    .messages({
      'string.max': 'Notes must not exceed 500 characters',
    }),
});

/**
 * Update order status validation schema
 */
export const updateOrderStatusSchema = Joi.object({
  status: orderStatusEnum.required().messages({
    'any.required': 'Status is required',
  }),
});

/**
 * Payment status enum
 */
const paymentStatusEnum = Joi.string().valid('PENDING', 'PAID', 'FAILED', 'REFUNDED').messages({
  'any.only': 'Payment status must be one of: PENDING, PAID, FAILED, REFUNDED',
});

/**
 * Update payment status validation schema
 */
export const updatePaymentStatusSchema = Joi.object({
  paymentStatus: paymentStatusEnum.required().messages({
    'any.required': 'Payment status is required',
  }),
});
