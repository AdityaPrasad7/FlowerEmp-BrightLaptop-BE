/**
 * Navigation Category Validation Schemas (Laptops Domain)
 * Zod schemas for navigation category endpoints
 */
import { z } from 'zod';

/**
 * Navigation category type enum
 */
const navigationCategoryTypeSchema = z.enum(['ALL_PRODUCTS', 'NEW_ARRIVALS', 'CATEGORY'], {
  errorMap: () => ({ message: 'Navigation category type must be ALL_PRODUCTS, NEW_ARRIVALS, or CATEGORY' }),
});

/**
 * MongoDB ObjectId schema
 */
const mongoIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId');

/**
 * Create navigation category validation schema
 */
export const createNavigationCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Navigation category name must be at least 2 characters')
    .max(100, 'Navigation category name must not exceed 100 characters'),
  type: navigationCategoryTypeSchema,
  categoryId: mongoIdSchema
    .optional()
    .refine(
      (val, ctx) => {
        const type = ctx.parent.type;
        if (type === 'CATEGORY' && !val) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'categoryId is required when type is CATEGORY',
          });
          return false;
        }
        if (type !== 'CATEGORY' && val) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'categoryId should only be provided when type is CATEGORY',
          });
          return false;
        }
        return true;
      },
      { message: 'categoryId validation failed' }
    ),
  displayOrder: z.number().int().min(0).optional().default(0),
  icon: z.string().trim().max(100, 'Icon must not exceed 100 characters').optional().default(''),
  description: z
    .string()
    .trim()
    .max(500, 'Description must not exceed 500 characters')
    .optional()
    .default(''),
}).refine(
  (data) => {
    if (data.type === 'CATEGORY' && !data.categoryId) {
      return false;
    }
    if (data.type !== 'CATEGORY' && data.categoryId) {
      return false;
    }
    return true;
  },
  {
    message: 'categoryId is required when type is CATEGORY, and should not be provided otherwise',
    path: ['categoryId'],
  }
);

/**
 * Update navigation category validation schema (all fields optional)
 */
export const updateNavigationCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Navigation category name must be at least 2 characters')
    .max(100, 'Navigation category name must not exceed 100 characters')
    .optional(),
  type: navigationCategoryTypeSchema.optional(),
  categoryId: mongoIdSchema.optional(),
  displayOrder: z.number().int().min(0).optional(),
  icon: z.string().trim().max(100, 'Icon must not exceed 100 characters').optional(),
  description: z
    .string()
    .trim()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
  isActive: z.boolean().optional(),
}).refine(
  (data) => {
    // If type is being set to CATEGORY, categoryId must be provided
    if (data.type === 'CATEGORY' && data.categoryId === undefined) {
      // Allow if categoryId is not being changed (existing value will be used)
      return true;
    }
    // If type is being set to something other than CATEGORY, categoryId should not be provided
    if (data.type && data.type !== 'CATEGORY' && data.categoryId !== undefined) {
      return false;
    }
    return true;
  },
  {
    message: 'categoryId validation failed based on type',
    path: ['categoryId'],
  }
);

/**
 * Reorder navigation category validation schema
 */
export const reorderNavigationCategorySchema = z.object({
  displayOrder: z.number().int().min(0, 'Display order must be a non-negative integer'),
});

/**
 * Bulk reorder navigation categories validation schema
 */
export const bulkReorderNavigationCategoriesSchema = z.object({
  orders: z.array(
    z.object({
      id: mongoIdSchema,
      displayOrder: z.number().int().min(0, 'Display order must be a non-negative integer'),
    })
  ).min(1, 'At least one order item is required'),
});

