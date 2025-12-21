/**
 * Cart Validation Schemas (Laptops Domain)
 * Joi schemas for cart operations
 */
import Joi from 'joi';
import { mongoIdSchema } from '../../../../shared/common/validators/common.validator.js';

/**
 * Add to cart validation schema
 */
export const addToCartSchema = Joi.object({
  productId: mongoIdSchema.required().messages({
    'any.required': 'Product ID is required',
    'string.pattern.base': 'Invalid product ID format',
  }),
  quantity: Joi.number().integer().min(1).required().messages({
    'number.base': 'Quantity must be a number',
    'number.integer': 'Quantity must be an integer',
    'number.min': 'Quantity must be at least 1',
    'any.required': 'Quantity is required',
  }),
});

/**
 * Update cart item validation schema
 */
export const updateCartItemSchema = Joi.object({
  productId: mongoIdSchema.required().messages({
    'any.required': 'Product ID is required',
    'string.pattern.base': 'Invalid product ID format',
  }),
  quantity: Joi.number().integer().min(1).required().messages({
    'number.base': 'Quantity must be a number',
    'number.integer': 'Quantity must be an integer',
    'number.min': 'Quantity must be at least 1',
    'any.required': 'Quantity is required',
  }),
});

