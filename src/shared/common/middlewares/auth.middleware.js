/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user to request
 * Domain-aware: Uses the correct User model based on request path
 */
import jwt from 'jsonwebtoken';
import env from '../../infrastructure/config/env.js';
import FlowersUser from '../../../domains/flowers/auth/models/User.model.js';
import LaptopsUser from '../../../domains/laptops/auth/models/User.model.js';
import { AppError, asyncHandler } from '../utils/errorHandler.js';

/**
 * Determine which domain's User model to use based on request path
 */
const getUserModel = (req) => {
  const path = req.originalUrl || req.path || '';

  if (path.includes('/api/flowers/')) {
    return FlowersUser;
  } else if (path.includes('/api/laptops/')) {
    return LaptopsUser;
  }

  // Default to flowers domain if path doesn't match (for backward compatibility)
  console.warn(`Warning: Could not determine domain from path: ${path}. Defaulting to flowers domain.`);
  return FlowersUser;
};

/**
 * Protect routes - requires valid JWT token
 * Automatically uses the correct domain's User model based on request path
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization) {
    // Handle both "Bearer <token>" and just "<token>" formats
    if (req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else {
      // If no "Bearer " prefix, assume the entire header is the token
      // (for backward compatibility, but recommend using "Bearer " prefix)
      token = req.headers.authorization;
      console.warn('Warning: Token should include "Bearer " prefix. Using token without prefix.');
    }
  }

  if (!token) {
    return next(new AppError('Not authorized to access this route. Please provide a valid token in Authorization header.', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, env.jwt.secret);

    // Debug: Log decoded token info
    console.log('Token decoded - userId:', decoded.id);

    // Get the appropriate User model based on the request path
    const User = getUserModel(req);
    const domain = req.originalUrl?.includes('/api/laptops/') ? 'laptops' : 'flowers';
    console.log(`Using ${domain} domain User model for authentication`);

    // Get user from token using the correct domain's User model
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new AppError(`User not found in ${domain} domain`, 404));
    }

    // Debug: Log user info
    console.log(`User authenticated - userId: ${user._id.toString()}, email: ${user.email}, domain: ${domain}`);

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('JWT Verification Error:', error.message);
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Your session has expired. Please log in again.', 401));
    }
    return next(new AppError('Not authorized to access this route', 401));
  }
});


/**
 * Restrict routes to specific roles
 * @param {...string} roles - Allowed roles
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    // Check if user exists and has a role
    if (!req.user || !req.user.role) {
      return next(new AppError('User role not found', 403));
    }

    // Check if user's role is included in allowed roles
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    next();
  };
};

export const admin = restrictTo('ADMIN');
