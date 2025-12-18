/**
 * Role-based Access Control Middleware
 * Restricts access based on user roles
 */
import { AppError } from '../utils/errorHandler.js';

/**
 * Restrict access to specific roles
 * @param {...string} roles - Allowed roles
 * @returns {Function} Middleware function
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Required roles: ${roles.join(', ')}`,
          403
        )
      );
    }

    next();
  };
};


