/**
 * Rate Limiting Middleware
 * Prevents brute-force attacks and API abuse
 */
import rateLimit from 'express-rate-limit';

/**
 * Factory function to create rate limiters with dynamic configuration
 * @param {Object} options - Rate limiter configuration
 * @param {number} options.max - Maximum number of requests per window
 * @param {number} [options.windowMs=15 * 60 * 1000] - Time window in milliseconds (default: 15 minutes)
 * @param {string} [options.errorMessage] - Custom error message
 * @param {boolean} [options.skipSuccessfulRequests=false] - Skip counting successful requests
 * @param {Object} [options.otherOptions] - Additional express-rate-limit options
 * @returns {Function} Express rate limiter middleware
 */
export const createRateLimiter = ({
  max,
  windowMs = 15 * 60 * 1000, // Default: 15 minutes
  errorMessage = 'Too many requests from this IP, please try again later.',
  skipSuccessfulRequests = false,
  ...otherOptions
}) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: errorMessage,
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests,
    ...otherOptions,
  });
};

/**
 * General API rate limiter
 * 100 requests per 15 minutes
 */
export const apiLimiter = createRateLimiter({
  max: 1000,
  windowMs: 15 * 60 * 1000, // 15 minutes
  errorMessage: 'Too many requests from this IP, please try again later.',
});

/**
 * Strict rate limiter for authentication routes
 * Prevents brute-force login attacks
 * 15 requests per 15 minutes (all requests counted)
 */
export const authLimiter = createRateLimiter({
  max: 15,
  windowMs: 15 * 60 * 1000, // 15 minutes
  errorMessage: 'Too many login attempts from this IP, please try again after 15 minutes.',
  skipSuccessfulRequests: false, // Count ALL requests (including successful ones) for better security
});

/**
 * Registration rate limiter
 * Prevents spam registrations
 * 7 registrations per hour
 */
export const registerLimiter = createRateLimiter({
  max: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
  errorMessage: 'Too many registration attempts from this IP, please try again after 1 hour.',
});

