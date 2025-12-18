/**
 * Product Validation Schemas (Laptops Domain)
 * Zod schemas for product endpoints
 */
import { z } from 'zod';
import { positiveNumberSchema, positiveIntegerSchema } from '../../../../shared/common/validators/common.validator.js';

/**
 * Bulk pricing tier schema
 */
const bulkPricingTierSchema = z.object({
  minQty: z.union([
    z.number().int('minQty must be an integer').min(1, 'minQty must be at least 1'),
    z.string().transform((val) => {
      const num = parseInt(val, 10);
      if (isNaN(num) || num < 1 || !Number.isInteger(num)) {
        throw new Error('minQty must be an integer >= 1');
      }
      return num;
    }),
  ]),
  price: positiveNumberSchema,
});

/**
 * Bulk pricing array schema with ascending order validation
 */
const bulkPricingSchema = z
  .array(bulkPricingTierSchema)
  .refine(
    (tiers) => {
      // Validate ascending order
      for (let i = 1; i < tiers.length; i++) {
        if (tiers[i].minQty <= tiers[i - 1].minQty) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'Bulk pricing tiers must be in ascending order by minQty',
    }
  )
  .optional()
  .default([]);

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
  b2bPrice: positiveNumberSchema.optional(),
  moq: z.union([
    z.number().int('MOQ must be an integer').min(1, 'MOQ must be at least 1'),
    z.string().transform((val) => {
      const num = parseInt(val, 10);
      if (isNaN(num) || num < 1 || !Number.isInteger(num)) {
        throw new Error('MOQ must be an integer >= 1');
      }
      return num;
    }),
  ]).optional().default(1),
  bulkPricing: bulkPricingSchema,
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
  b2bPrice: positiveNumberSchema.optional(),
  moq: z.union([
    z.number().int('MOQ must be an integer').min(1, 'MOQ must be at least 1'),
    z.string().transform((val) => {
      const num = parseInt(val, 10);
      if (isNaN(num) || num < 1 || !Number.isInteger(num)) {
        throw new Error('MOQ must be an integer >= 1');
      }
      return num;
    }),
  ]).optional(),
  bulkPricing: bulkPricingSchema,
  stock: positiveIntegerSchema.optional(),
  isActive: z.boolean().optional(),
  category: z
    .string()
    .trim()
    .min(2, 'Category must be at least 2 characters')
    .max(50, 'Category must not exceed 50 characters')
    .optional(),
});

