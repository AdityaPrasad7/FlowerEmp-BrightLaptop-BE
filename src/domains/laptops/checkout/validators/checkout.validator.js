/**
 * Checkout Validation Schemas (Laptops Domain)
 * Zod schemas for checkout endpoint with delivery scheduling
 */
import { z } from 'zod';
import { emailSchema } from '../../../../shared/common/validators/common.validator.js';

/**
 * Address schema (reusable for shipping and billing)
 */
const addressSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Full name is required')
    .max(100, 'Full name cannot exceed 100 characters'),
  addressLine1: z
    .string()
    .trim()
    .min(1, 'Address line 1 is required')
    .max(200, 'Address line 1 cannot exceed 200 characters'),
  addressLine2: z
    .string()
    .trim()
    .max(200, 'Address line 2 cannot exceed 200 characters')
    .optional(),
  city: z
    .string()
    .trim()
    .min(1, 'City is required')
    .max(100, 'City cannot exceed 100 characters'),
  state: z
    .string()
    .trim()
    .min(1, 'State is required')
    .max(100, 'State cannot exceed 100 characters'),
  postalCode: z
    .string()
    .trim()
    .min(1, 'Postal code is required')
    .max(20, 'Postal code cannot exceed 20 characters'),
  country: z
    .string()
    .trim()
    .min(1, 'Country is required')
    .max(100, 'Country cannot exceed 100 characters'),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone number is required')
    .max(20, 'Phone number cannot exceed 20 characters'),
});

/**
 * Payment method enum
 */
const paymentMethodEnum = z.enum(
  ['COD', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'NET_BANKING', 'WALLET', 'OTHER'],
  {
    errorMap: () => ({
      message: 'Payment method must be one of: COD, CREDIT_CARD, DEBIT_CARD, UPI, NET_BANKING, WALLET, OTHER',
    }),
  }
);

/**
 * Checkout validation schema with delivery scheduling
 */
export const checkoutSchema = z.object({
  // Shipping Address (required)
  shippingAddress: addressSchema,
  
  // Billing Address (optional - if not provided, uses shipping address)
  billingAddress: addressSchema.optional(),
  
  // Contact Information
  contactEmail: emailSchema,
  contactPhone: z
    .string()
    .trim()
    .min(1, 'Contact phone is required')
    .max(20, 'Contact phone cannot exceed 20 characters'),
  
  // Payment Information
  paymentMethod: paymentMethodEnum,
  
  // Delivery Preferences (Delivery Scheduling)
  deliveryDate: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const date = new Date(val);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid delivery date format');
      }
      return date;
    }),
  deliveryTime: z
    .string()
    .trim()
    .max(50, 'Delivery time cannot exceed 50 characters')
    .optional(),
  
  // Special Instructions/Notes
  notes: z
    .string()
    .trim()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional()
    .default(''),
});

