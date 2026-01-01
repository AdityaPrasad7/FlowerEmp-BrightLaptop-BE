/**
 * Checkout Validation Schemas (Flowers Domain)
 * Zod schemas for checkout endpoint
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
 * Checkout validation schema
 */
export const checkoutSchema = z.object({
  // Shipping Address (optional for flowers)
  shippingAddress: addressSchema.optional(),

  // Billing Address (optional)
  billingAddress: addressSchema.optional(),

  // Payment Information
  paymentMethod: paymentMethodEnum,

  // Special Instructions/Notes
  notes: z
    .string()
    .trim()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional()
    .default(''),

  // Delivery Details
  deliveryDate: z.coerce.date({ invalid_type_error: "Invalid delivery date" }),
  timeSlot: z.string().min(1, 'Time slot is required'),
});


