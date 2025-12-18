/**
 * Category Validation Schemas (Laptops Domain)
 * Zod schemas for category endpoints
 */
import { z } from 'zod';

/**
 * Category type enum
 */
const categoryTypeSchema = z.enum(['CONDITION', 'USE_CASE', 'BRAND'], {
  errorMap: () => ({ message: 'Category type must be CONDITION, USE_CASE, or BRAND' }),
});

/**
 * Create category validation schema
 */
export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name must not exceed 100 characters'),
  type: categoryTypeSchema,
  description: z
    .string()
    .trim()
    .max(500, 'Description must not exceed 500 characters')
    .optional()
    .default(''),
});

/**
 * Update category validation schema (all fields optional)
 */
export const updateCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name must not exceed 100 characters')
    .optional(),
  type: categoryTypeSchema.optional(),
  description: z
    .string()
    .trim()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
  isActive: z.boolean().optional(),
});

