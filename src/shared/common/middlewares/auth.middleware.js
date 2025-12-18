/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user to request
 * Uses flowers domain User model (domain-specific auth)
 */
import jwt from 'jsonwebtoken';
import env from '../../infrastructure/config/env.js';
import User from '../../../domains/flowers/auth/models/User.model.js';
import { AppError, asyncHandler } from '../utils/errorHandler.js';

/**
 * Protect routes - requires valid JWT token
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

    // Get user from token
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Debug: Log user info
    console.log('User authenticated - userId:', user._id.toString(), 'email:', user.email);

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    return next(new AppError('Not authorized to access this route', 401));
  }
});

