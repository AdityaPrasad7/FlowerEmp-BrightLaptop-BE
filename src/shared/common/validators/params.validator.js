/**
 * Parameter Validation Schemas
 * Zod schemas for URL parameters (like :id)
 */
import { z } from 'zod';
import { mongoIdSchema } from './common.validator.js';

/**
 * MongoDB ID parameter schema (for :id routes)
 */
export const mongoIdParamSchema = z.object({
  id: mongoIdSchema,
});

/**
 * Product ID parameter schema (for :productId routes)
 */
export const productIdParamSchema = z.object({
  productId: mongoIdSchema,
});


