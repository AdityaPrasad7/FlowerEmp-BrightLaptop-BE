/**
 * Common Validation Schemas
 * Shared Joi schemas used across multiple validators
 */
import Joi from 'joi';

/**
 * MongoDB ObjectId validation schema
 */
export const mongoIdSchema = Joi.string().regex(/^[0-9a-fA-F]{24}$/).messages({
  'string.pattern.base': 'Invalid MongoDB ID format',
});

/**
 * Email validation schema
 */
export const emailSchema = Joi.string()
  .trim()
  .email({ tlds: { allow: false } })
  .lowercase()
  .messages({
    'string.email': 'Please provide a valid email address',
  });

/**
 * Password validation schema
 */
export const passwordSchema = Joi.string()
  .min(6)
  .messages({
    'string.min': 'Password must be at least 6 characters',
  });

/**
 * Positive number schema (for prices, etc.)
 * Accepts both number and string, converts string to number
 */
export const positiveNumberSchema = Joi.alternatives().try(
  Joi.number().min(0).messages({
    'number.min': 'Value must be a positive number',
  }),
  Joi.string().custom((value, helpers) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) {
      return helpers.error('number.base');
    }
    return num;
  }).messages({
    'number.base': 'Value must be a positive number',
  })
);

/**
 * Positive integer schema (for quantities, stock, etc.)
 * Accepts both number and string, converts string to integer
 */
export const positiveIntegerSchema = Joi.alternatives().try(
  Joi.number().integer().min(0).messages({
    'number.base': 'Value must be a non-negative integer',
    'number.integer': 'Value must be an integer',
    'number.min': 'Value must be a non-negative integer',
  }),
  Joi.string().custom((value, helpers) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
      return helpers.error('number.base');
    }
    return num;
  }).messages({
    'number.base': 'Value must be a non-negative integer',
  })
);


