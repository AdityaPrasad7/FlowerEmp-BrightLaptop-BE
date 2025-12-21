/**
 * Checkout Validation Schemas (Laptops Domain)
 * Joi schemas for checkout endpoint with delivery scheduling
 */
import Joi from 'joi';
import { emailSchema } from '../../../../shared/common/validators/common.validator.js';

/**
 * Address schema (reusable for shipping and billing)
 */
const addressSchema = Joi.object({
  fullName: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Full name is required',
      'string.max': 'Full name cannot exceed 100 characters',
      'any.required': 'Full name is required',
    }),
  addressLine1: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.min': 'Address line 1 is required',
      'string.max': 'Address line 1 cannot exceed 200 characters',
      'any.required': 'Address line 1 is required',
    }),
  addressLine2: Joi.string()
    .trim()
    .max(200)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Address line 2 cannot exceed 200 characters',
    }),
  city: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'City is required',
      'string.max': 'City cannot exceed 100 characters',
      'any.required': 'City is required',
    }),
  state: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'State is required',
      'string.max': 'State cannot exceed 100 characters',
      'any.required': 'State is required',
    }),
  postalCode: Joi.string()
    .trim()
    .min(1)
    .max(20)
    .required()
    .messages({
      'string.min': 'Postal code is required',
      'string.max': 'Postal code cannot exceed 20 characters',
      'any.required': 'Postal code is required',
    }),
  country: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Country is required',
      'string.max': 'Country cannot exceed 100 characters',
      'any.required': 'Country is required',
    }),
  phone: Joi.string()
    .trim()
    .min(1)
    .max(20)
    .required()
    .messages({
      'string.min': 'Phone number is required',
      'string.max': 'Phone number cannot exceed 20 characters',
      'any.required': 'Phone number is required',
    }),
});

/**
 * Payment method enum
 */
const paymentMethodEnum = Joi.string()
  .valid('COD', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'NET_BANKING', 'WALLET', 'OTHER')
  .messages({
    'any.only': 'Payment method must be one of: COD, CREDIT_CARD, DEBIT_CARD, UPI, NET_BANKING, WALLET, OTHER',
  });

/**
 * Checkout validation schema with delivery scheduling
 */
export const checkoutSchema = Joi.object({
  // Shipping Address (required)
  shippingAddress: addressSchema.required().messages({
    'any.required': 'Shipping address is required',
  }),
  
  // Billing Address (optional - if not provided, uses shipping address)
  billingAddress: addressSchema.optional(),
  
  // Contact Information
  contactEmail: emailSchema.required().messages({
    'any.required': 'Contact email is required',
  }),
  contactPhone: Joi.string()
    .trim()
    .min(1)
    .max(20)
    .required()
    .messages({
      'string.min': 'Contact phone is required',
      'string.max': 'Contact phone cannot exceed 20 characters',
      'any.required': 'Contact phone is required',
    }),
  
  // Payment Information
  paymentMethod: paymentMethodEnum.required().messages({
    'any.required': 'Payment method is required',
  }),
  
  // Delivery Preferences (Delivery Scheduling)
  deliveryDate: Joi.string()
    .optional()
    .custom((value, helpers) => {
      if (!value) return undefined;
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return helpers.error('date.base');
      }
      return date;
    })
    .messages({
      'date.base': 'Invalid delivery date format',
    }),
  deliveryTime: Joi.string()
    .trim()
    .max(50)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Delivery time cannot exceed 50 characters',
    }),
  
  // Special Instructions/Notes
  notes: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .optional()
    .default('')
    .messages({
      'string.max': 'Notes cannot exceed 500 characters',
    }),
});

