/**
 * Authentication Controller (Laptops Domain)
 * Handles user registration and login
 */
import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import { AppError, asyncHandler } from '../../../../shared/common/utils/errorHandler.js';
import env from '../../../../shared/infrastructure/config/env.js';

/**
 * Generate JWT token
 * @param {string} userId - User ID
 * @returns {string} JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, env.jwt.secret, {
    expiresIn: env.jwt.expire,
  });
};

/**
 * @route   POST /api/laptops/auth/register
 * @desc    Register a new user
 * @access  Public
 */
export const register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role, companyName, gstNumber, businessAddress } = req.body;

  // Validate required fields
  if (!name || !email || !password || !role) {
    return next(new AppError('Please provide all required fields', 400));
  }

  // Validate role
  const validRoles = ['B2C_BUYER', 'B2B_BUYER', 'SELLER', 'ADMIN'];
  if (!validRoles.includes(role)) {
    return next(new AppError('Invalid role', 400));
  }

  // Validate B2B buyer required fields
  if (role === 'B2B_BUYER') {
    if (!companyName) {
      return next(new AppError('Company name is required for B2B buyers', 400));
    }
    if (!gstNumber) {
      return next(new AppError('GST number is required for B2B buyers', 400));
    }
    if (!businessAddress) {
      return next(new AppError('Business address is required for B2B buyers', 400));
    }
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('User already exists with this email', 400));
  }

  // Prepare user data
  const userData = {
    name,
    email,
    password,
    role,
  };

  // Add B2B specific fields only if role is B2B_BUYER
  if (role === 'B2B_BUYER') {
    userData.companyName = companyName;
    userData.gstNumber = gstNumber?.toUpperCase().trim();
    userData.businessAddress = businessAddress;
  }

  // Create user
  const user = await User.create(userData);

  // Generate token
  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    data: {
      user,
      token,
    },
  });
});

/**
 * @route   POST /api/laptops/auth/login
 * @desc    Login user
 * @access  Public
 */
export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // Find user and include password for comparison
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return next(new AppError('Invalid credentials', 401));
  }

  // Check password
  const isPasswordMatch = await user.comparePassword(password);

  if (!isPasswordMatch) {
    return next(new AppError('Invalid credentials', 401));
  }

  // Generate token
  const token = generateToken(user._id);

  // Remove password from user object
  user.password = undefined;

  res.status(200).json({
    success: true,
    data: {
      user,
      token,
    },
  });
});

/**
 * @route   GET /api/laptops/auth/me
 * @desc    Get current user
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  res.status(200).json({
    success: true,
    data: {
      user,
    },
  });
});

