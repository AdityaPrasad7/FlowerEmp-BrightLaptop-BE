/**
 * Authentication Routes (Flowers Domain)
 */
import express from 'express';
import {
  register,
  login,
  getMe,
  logout,
  addAddress,
  updateDetails,
} from '../controllers/auth.controller.js';
import { protect } from '../../../../shared/common/middlewares/auth.middleware.js';
import { authLimiter, registerLimiter } from '../../../../shared/common/middlewares/rateLimiter.middleware.js';
import { validate } from '../../../../shared/common/middlewares/validate.middleware.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';

const router = express.Router();

// Public routes with rate limiting and validation
router.post('/register', registerLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);

// OTP Routes
router.post('/send-otp', authLimiter, (await import('../controllers/auth.controller.js')).sendLoginOTP);
router.post('/login-with-otp', authLimiter, (await import('../controllers/auth.controller.js')).verifyLoginOTP);

// Protected routes
router.get('/me', protect, getMe);
router.post('/address', protect, addAddress);
router.put('/update-details', protect, updateDetails);
router.post('/logout', logout);

export default router;


