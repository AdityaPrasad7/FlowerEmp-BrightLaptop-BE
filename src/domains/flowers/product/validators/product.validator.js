/**
 * Product Validation Schemas (Flowers Domain)
 * Zod schemas for product endpoints (simplified - no MOQ, bulk pricing, or B2B pricing)
 */
import { z } from 'zod';
import { positiveNumberSchema, positiveIntegerSchema } from '../../../../shared/common/validators/common.validator.js';

/**
 * Create product validation schema
 */
export const createProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Product name must be at least 2 characters')
    .max(200, 'Product name must not exceed 200 characters'),
  description: z
    .string()
    .trim()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional()
    .default(''),
  basePrice: positiveNumberSchema,
  stock: positiveIntegerSchema,
  category: z
    .string()
    .trim()
    .min(2, 'Category must be at least 2 characters')
    .max(50, 'Category must not exceed 50 characters'),
});

/**
 * Update product validation schema (all fields optional)
 */
export const updateProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Product name must be at least 2 characters')
    .max(200, 'Product name must not exceed 200 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional(),
  basePrice: positiveNumberSchema.optional(),
  stock: positiveIntegerSchema.optional(),
  isActive: z.boolean().optional(),
  category: z
    .string()
    .trim()
    .min(2, 'Category must be at least 2 characters')
    .max(50, 'Category must not exceed 50 characters')
    .optional(),
});


