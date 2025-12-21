/**
 * Category Validation Schemas (Laptops Domain)
 * Joi schemas for category endpoints
 */
import Joi from 'joi';

/**
 * Category type enum
 */
const categoryTypeSchema = Joi.string().valid('CONDITION', 'USE_CASE', 'BRAND').messages({
  'any.only': 'Category type must be CONDITION, USE_CASE, or BRAND',
});

/**
 * Create category validation schema
 */
export const createCategorySchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Category name must be at least 2 characters',
      'string.max': 'Category name must not exceed 100 characters',
      'any.required': 'Category name is required',
    }),
  type: categoryTypeSchema.required().messages({
    'any.required': 'Category type is required',
  }),
  description: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .optional()
    .default('')
    .messages({
      'string.max': 'Description must not exceed 500 characters',
    }),
});

/**
 * Update category validation schema (all fields optional)
 */
export const updateCategorySchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Category name must be at least 2 characters',
      'string.max': 'Category name must not exceed 100 characters',
    }),
  type: categoryTypeSchema.optional(),
  description: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Description must not exceed 500 characters',
    }),
  isActive: Joi.boolean().optional(),
});

