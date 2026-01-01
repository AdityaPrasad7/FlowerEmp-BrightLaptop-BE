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
  category: z.enum(['Flowers', 'Cakes', 'Chocolates'], {
    errorMap: () => ({ message: 'Category must be Flowers, Cakes, or Chocolates' })
  }),
  occasions: z.array(
    z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Occasion must be a valid ID')
  ).min(1, 'At least one occasion is required'),
  vip: z.boolean().optional().default(false),
  flowerType: z.enum([
    'Tulips', 'Lilies', 'Spray Roses', 'Mixed Flowers', 'Orchids',
    'Carnations', 'Hydrangeas', 'Gerbera', 'Ranunculus', 'Peony',
    'Roses', 'Sunflowers', 'Forever Rose'
  ]).or(z.literal('')).optional(),
  flowerArrangement: z.enum(['Flower Basket', 'Flower Bouquets', 'Flower Box', 'Flower Vase']).or(z.literal('')).optional(),
  flowerColor: z.enum([
    'Blue Flowers', 'Purple Flowers', 'Pink Flowers', 'Red Flowers',
    'Yellow Flowers', 'White Flowers', 'Mixed Flowers'
  ]).or(z.literal('')).optional(),
}).refine((data) => {
  if (data.category === 'Flowers') {
    // Optional: Add strict validation if needed, for now just allow optional
    return true;
  }
  return true;
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
  category: z.enum(['Flowers', 'Cakes', 'Chocolates']).optional(),
  occasions: z.array(
    z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Occasion must be a valid ID')
  ).optional(),
  vip: z.boolean().optional(),
  flowerType: z.enum([
    'Tulips', 'Lilies', 'Spray Roses', 'Mixed Flowers', 'Orchids',
    'Carnations', 'Hydrangeas', 'Gerbera', 'Ranunculus', 'Peony',
    'Roses', 'Sunflowers', 'Forever Rose'
  ]).or(z.literal('')).optional(),
  flowerArrangement: z.enum(['Flower Basket', 'Flower Bouquets', 'Flower Box', 'Flower Vase']).or(z.literal('')).optional(),
  flowerColor: z.enum([
    'Blue Flowers', 'Purple Flowers', 'Pink Flowers', 'Red Flowers',
    'Yellow Flowers', 'White Flowers', 'Mixed Flowers'
  ]).or(z.literal('')).optional(),
});


