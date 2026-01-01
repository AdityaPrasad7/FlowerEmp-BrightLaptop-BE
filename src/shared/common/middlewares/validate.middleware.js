/**
 * Validation Middleware
 * Validates request data against Joi schemas
 */
import { AppError } from '../utils/errorHandler.js';

/**
 * Validate request body using Joi schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
export const validate = (schema) => {
  return (req, res, next) => {
    // Determine the part of request to validate (default to body if not specified)
    // Joi schemas often validate just the body, but sometimes are wrapper objects like { body: ..., query: ... }

    // If schema has 'validate' method directly (it's a Joi schema)
    if (typeof schema.validate === 'function') {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        errors: { label: 'key' }
      });

      if (error) {
        const errorMessage = error.details.map((detail) => detail.message).join(', ');
        return next(new AppError(errorMessage, 400));
      }

      req.body = value;
      return next();
    }

    // If validation object is passed (e.g. { body: schema })
    if (schema.body) {
      const { error, value } = schema.body.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        errors: { label: 'key' }
      });
      if (error) {
        const errorMessage = error.details.map((detail) => detail.message).join(', ');
        return next(new AppError(errorMessage, 400));
      }
      req.body = value;
    }

    if (schema.query) {
      const { error, value } = schema.query.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
        errors: { label: 'key' }
      });
      if (error) {
        const errorMessage = error.details.map((detail) => detail.message).join(', ');
        return next(new AppError(errorMessage, 400));
      }
      req.query = value;
    }

    if (schema.params) {
      const { error, value } = schema.params.validate(req.params, {
        abortEarly: false,
        stripUnknown: true,
        errors: { label: 'key' }
      });
      if (error) {
        const errorMessage = error.details.map((detail) => detail.message).join(', ');
        return next(new AppError(errorMessage, 400));
      }
      req.params = value;
    }

    next();
  };
};

/**
 * Validate request parameters using Joi schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
export const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
      errors: { label: 'key' }
    });

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(', ');
      return next(new AppError(errorMessage, 400));
    }

    req.params = value;
    next();
  };
};

/**
 * Validate query parameters using Joi schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      errors: { label: 'key' }
    });

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(', ');
      return next(new AppError(errorMessage, 400));
    }

    req.query = value;
    next();
  };
};


