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
  selectedConfig: Joi.object({
    ram: Joi.string().allow('', null).optional(),
    storage: Joi.string().allow('', null).optional(),
  }).optional().allow(null),
  selectedWarranty: Joi.alternatives().try(
    Joi.string().allow('default', 'Default', ''),
    Joi.object({
      duration: Joi.string(),
      price: Joi.number(),
    })
  ).optional().allow(null),
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

