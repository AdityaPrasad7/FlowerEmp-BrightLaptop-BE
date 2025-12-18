/**
 * Common Validation Schemas
 * Shared Zod schemas used across multiple validators
 */
import { z } from 'zod';

/**
 * MongoDB ObjectId validation schema
 */
export const mongoIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, {
  message: 'Invalid MongoDB ID format',
});

/**
 * Email validation schema
 */
export const emailSchema = z
  .string()
  .trim()
  .email('Please provide a valid email address')
  .toLowerCase();

/**
 * Password validation schema
 */
export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters');

/**
 * Positive number schema (for prices, etc.)
 * Accepts both number and string, converts string to number
 */
export const positiveNumberSchema = z.union([
  z.number().nonnegative('Value must be a positive number'),
  z.string().transform((val) => {
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) {
      throw new Error('Value must be a positive number');
    }
    return num;
  }),
]);

/**
 * Positive integer schema (for quantities, stock, etc.)
 * Accepts both number and string, converts string to integer
 */
export const positiveIntegerSchema = z.union([
  z.number().int('Value must be an integer').nonnegative('Value must be a non-negative integer'),
  z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
      throw new Error('Value must be a non-negative integer');
    }
    return num;
  }),
]);


