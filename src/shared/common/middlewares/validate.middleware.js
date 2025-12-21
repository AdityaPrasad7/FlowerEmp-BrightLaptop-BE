/**
 * Joi Validation Middleware
 * Validates request data using Joi schemas
 */
import Joi from 'joi';
import { AppError } from '../utils/errorHandler.js';

/**
 * Validate request body using Joi schema
 * @param {Joi.ObjectSchema} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
export const validate = (schema) => {
  return async (req, res, next) => {
    try {
      // Validate and parse request body
      const { error, value } = schema.validate(req.body, {
        abortEarly: false, // Return all validation errors, not just the first one
        stripUnknown: true, // Remove unknown fields
      });
      
      if (error) {
        // Handle Joi validation errors
        const errorMessages = error.details.map((detail) => {
          const path = detail.path.join('.');
          return path ? `${path}: ${detail.message}` : detail.message;
        });
        return next(new AppError(errorMessages.join(', '), 400));
      }
      
      // Replace req.body with validated and sanitized data
      req.body = value;
      
      next();
    } catch (err) {
      // Handle other errors
      return next(new AppError(err.message || 'Validation failed', 400));
    }
  };
};

/**
 * Validate request parameters using Joi schema
 * @param {Joi.ObjectSchema} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
export const validateParams = (schema) => {
  return async (req, res, next) => {
    try {
      // Validate and parse request parameters
      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true,
      });
      
      if (error) {
        // Handle Joi validation errors
        const errorMessages = error.details.map((detail) => {
          const path = detail.path.join('.');
          return path ? `${path}: ${detail.message}` : detail.message;
        });
        return next(new AppError(errorMessages.join(', '), 400));
      }
      
      // Replace req.params with validated data
      req.params = value;
      
      next();
    } catch (err) {
      return next(new AppError(err.message || 'Invalid parameters', 400));
    }
  };
};

/**
 * Validate query parameters using Joi schema
 * @param {Joi.ObjectSchema} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
export const validateQuery = (schema) => {
  return async (req, res, next) => {
    try {
      // Validate and parse query parameters
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
      });
      
      if (error) {
        // Handle Joi validation errors
        const errorMessages = error.details.map((detail) => {
          const path = detail.path.join('.');
          return path ? `${path}: ${detail.message}` : detail.message;
        });
        return next(new AppError(errorMessages.join(', '), 400));
      }
      
      // Replace req.query with validated data
      req.query = value;
      
      next();
    } catch (err) {
      return next(new AppError(err.message || 'Invalid query parameters', 400));
    }
  };
};


