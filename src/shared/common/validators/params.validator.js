/**
 * Parameter Validation Schemas
 * Joi schemas for URL parameters (like :id)
 */
import Joi from 'joi';
import { mongoIdSchema } from './common.validator.js';

/**
 * MongoDB ID parameter schema (for :id routes)
 */
export const mongoIdParamSchema = Joi.object({
  id: mongoIdSchema.required().messages({
    'any.required': 'ID is required',
  }),
});

/**
 * Product ID parameter schema (for :productId routes)
 */
export const productIdParamSchema = Joi.object({
  productId: mongoIdSchema.required().messages({
    'any.required': 'Product ID is required',
  }),
});


