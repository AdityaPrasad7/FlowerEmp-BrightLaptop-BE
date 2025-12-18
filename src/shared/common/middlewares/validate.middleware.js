/**
 * Zod Validation Middleware
 * Validates request data using Zod schemas
 */
import { AppError } from '../utils/errorHandler.js';

/**
 * Validate request body using Zod schema
 * @param {z.ZodSchema} schema - Zod validation schema
 * @returns {Function} Express middleware function
 */
export const validate = (schema) => {
  return async (req, res, next) => {
    try {
      // Validate and parse request body
      const validatedData = await schema.parseAsync(req.body);
      
      // Replace req.body with validated and sanitized data
      req.body = validatedData;
      
      next();
    } catch (error) {
      // Handle Zod validation errors
      if (error.errors) {
        const errorMessages = error.errors.map((err) => {
          const path = err.path.join('.');
          return path ? `${path}: ${err.message}` : err.message;
        });
        return next(new AppError(errorMessages.join(', '), 400));
      }
      
      // Handle other errors
      return next(new AppError(error.message || 'Validation failed', 400));
    }
  };
};

/**
 * Validate request parameters using Zod schema
 * @param {z.ZodSchema} schema - Zod validation schema
 * @returns {Function} Express middleware function
 */
export const validateParams = (schema) => {
  return async (req, res, next) => {
    try {
      // Validate and parse request parameters
      const validatedParams = await schema.parseAsync(req.params);
      
      // Replace req.params with validated data
      req.params = validatedParams;
      
      next();
    } catch (error) {
      // Handle Zod validation errors
      if (error.issues && Array.isArray(error.issues)) {
        const errorMessages = error.issues.map((err) => {
          const path = err.path.length > 0 ? err.path.join('.') : '';
          return path ? `${path}: ${err.message}` : err.message;
        });
        return next(new AppError(errorMessages.join(', '), 400));
      }
      
      return next(new AppError(error.message || 'Invalid parameters', 400));
    }
  };
};

/**
 * Validate query parameters using Zod schema
 * @param {z.ZodSchema} schema - Zod validation schema
 * @returns {Function} Express middleware function
 */
export const validateQuery = (schema) => {
  return async (req, res, next) => {
    try {
      // Validate and parse query parameters
      const validatedQuery = await schema.parseAsync(req.query);
      
      // Replace req.query with validated data
      req.query = validatedQuery;
      
      next();
    } catch (error) {
      // Handle Zod validation errors
      if (error.issues && Array.isArray(error.issues)) {
        const errorMessages = error.issues.map((err) => {
          const path = err.path.length > 0 ? err.path.join('.') : '';
          return path ? `${path}: ${err.message}` : err.message;
        });
        return next(new AppError(errorMessages.join(', '), 400));
      }
      
      return next(new AppError(error.message || 'Invalid query parameters', 400));
    }
  };
};


