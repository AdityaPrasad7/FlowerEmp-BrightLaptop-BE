/**
 * Authentication Validation Schemas (Flowers Domain)
 * Zod schemas for authentication endpoints
 */
import { z } from 'zod';
import { emailSchema, passwordSchema } from '../../../../shared/common/validators/common.validator.js';

/**
 * User roles enum
 */
const userRoleEnum = z.enum(['B2C_BUYER', 'B2B_BUYER', 'SELLER', 'ADMIN'], {
  errorMap: () => ({
    message: 'Invalid role. Must be one of: B2C_BUYER, B2B_BUYER, SELLER, ADMIN',
  }),
});

/**
 * Register validation schema
 */
export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must not exceed 100 characters'),
    email: emailSchema,
    password: passwordSchema,
    role: userRoleEnum,
    companyName: z
      .string()
      .trim()
      .min(2, 'Company name must be at least 2 characters')
      .max(200, 'Company name must not exceed 200 characters')
      .optional(),
  })
  .refine(
    (data) => {
      // Company name is required for B2B_BUYER
      if (data.role === 'B2B_BUYER' && !data.companyName) {
        return false;
      }
      return true;
    },
    {
      message: 'Company name is required for B2B buyers',
      path: ['companyName'],
    }
  );

/**
 * Login validation schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});


