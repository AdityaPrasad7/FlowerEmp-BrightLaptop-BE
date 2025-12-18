/**
 * Product Validation Schemas (Laptops Domain)
 * Zod schemas for product endpoints
 */
import { z } from 'zod';
import {
  positiveNumberSchema,
  positiveIntegerSchema,
  mongoIdSchema,
} from '../../../../shared/common/validators/common.validator.js';

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
  conditionCategory: mongoIdSchema.optional(),
  useCaseCategories: z.array(mongoIdSchema).optional().default([]),
  brandCategory: mongoIdSchema.optional(),
  images: z.array(z.string().url('Each image must be a valid URL')).optional().default([]),
  rating: z
    .union([
      z.number().min(0, 'Rating must be at least 0').max(5, 'Rating must be at most 5'),
      z.string().transform((val) => {
        const num = parseFloat(val);
        if (isNaN(num) || num < 0 || num > 5) {
          throw new Error('Rating must be between 0 and 5');
        }
        return num;
      }),
    ])
    .optional()
    .default(0),
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
  conditionCategory: mongoIdSchema.optional().nullable(),
  useCaseCategories: z.array(mongoIdSchema).optional(),
  brandCategory: mongoIdSchema.optional().nullable(),
  images: z.array(z.string().url('Each image must be a valid URL')).optional(),
  rating: z
    .union([
      z.number().min(0, 'Rating must be at least 0').max(5, 'Rating must be at most 5'),
      z.string().transform((val) => {
        const num = parseFloat(val);
        if (isNaN(num) || num < 0 || num > 5) {
          throw new Error('Rating must be between 0 and 5');
        }
        return num;
      }),
    ])
    .optional(),
});

