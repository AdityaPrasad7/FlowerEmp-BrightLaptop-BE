/**
 * Authentication Validation Schemas (Laptops Domain)
 * Joi schemas for authentication endpoints
 */
import Joi from 'joi';
import { emailSchema, passwordSchema } from '../../../../shared/common/validators/common.validator.js';

/**
 * User roles enum
 */
const userRoleEnum = Joi.string().valid('B2C_BUYER', 'B2B_BUYER', 'SELLER', 'ADMIN').messages({
  'any.only': 'Invalid role. Must be one of: B2C_BUYER, B2B_BUYER, SELLER, ADMIN',
});

/**
 * Register validation schema
 */
export const registerSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name must not exceed 100 characters',
      'any.required': 'Name is required',
    }),
  email: emailSchema.required().messages({
    'any.required': 'Email is required',
  }),
  password: passwordSchema.required().messages({
    'any.required': 'Password is required',
  }),
  role: userRoleEnum.required().messages({
    'any.required': 'Role is required',
  }),
  companyName: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .when('role', {
      is: 'B2B_BUYER',
      then: Joi.required().messages({
        'any.required': 'Company name is required for B2B buyers',
      }),
      otherwise: Joi.optional(),
    })
    .messages({
      'string.min': 'Company name must be at least 2 characters',
      'string.max': 'Company name must not exceed 200 characters',
    }),
  gstNumber: Joi.string()
    .trim()
    .uppercase()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .when('role', {
      is: 'B2B_BUYER',
      then: Joi.required().messages({
        'any.required': 'GST number is required for B2B buyers',
      }),
      otherwise: Joi.optional(),
    })
    .messages({
      'string.pattern.base': 'Invalid GST number format. Format: 29AAJCK8673K1ZN',
    }),
  businessAddress: Joi.string()
    .trim()
    .when('role', {
      is: 'B2B_BUYER',
      then: Joi.required().messages({
        'any.required': 'Business address is required for B2B buyers',
      }),
      otherwise: Joi.optional(),
    }),
});

/**
 * Login validation schema
 */
export const loginSchema = Joi.object({
  email: emailSchema.required().messages({
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(1).required().messages({
    'string.min': 'Password is required',
    'any.required': 'Password is required',
  }),
});

