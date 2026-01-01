/**
 * Authentication Controller (Flowers Domain)
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
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
export const register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role, companyName } = req.body;

  // Validate required fields
  if (!name || !email || !password || !role) {
    return next(new AppError('Please provide all required fields', 400));
  }

  // Validate role
  const validRoles = ['B2C_BUYER', 'B2B_BUYER', 'SELLER', 'ADMIN'];
  if (!validRoles.includes(role)) {
    return next(new AppError('Invalid role', 400));
  }

  // Validate company name for B2B buyers
  if (role === 'B2B_BUYER' && !companyName) {
    return next(new AppError('Company name is required for B2B buyers', 400));
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('User already exists with this email', 400));
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    phone: req.body.phone, // Add phone
    role,
    companyName: role === 'B2B_BUYER' ? companyName : undefined,
  });

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
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  console.log("email", email);
  console.log("password", password);


  // Debug: Log request body if fields are missing (helpful for troubleshooting)
  if (!email || !password) {
    console.log('Login request body:', req.body);
    console.log('Content-Type:', req.headers['content-type']);
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
 * @route   GET /api/auth/me
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

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user / Clear cookie if exists
 * @access  Private/Public
 */
export const logout = asyncHandler(async (req, res, next) => {
  // If we were using cookies, we would clear them here
  // res.cookie('token', 'none', {
  //   expires: new Date(Date.now() + 10 * 1000),
  //   httpOnly: true,
  // });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
    data: {},
  });
});

/**
 * @route   POST /api/auth/send-otp
 * @desc    Send login OTP to email and phone
 * @access  Public
 */
export const sendLoginOTP = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError('Please provide an email', 400));
  }

  const user = await User.findOne({ email });

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash OTP before saving (for security) - Skipping hash for MVP/Debugging as requested by user plan implies simpler flow first, 
  // but let's stick to best practice if possible. However, to keep it simple and readable for the user:
  // We will save plain OTP for now to easily debug if needed, or better, stick to the plan: "Saves hash of OTP"
  // Let's use bcrypt for consistency since we already have it.
  const salt = await (await import('bcrypt')).default.genSalt(10);
  const otpHash = await (await import('bcrypt')).default.hash(otp, salt);

  user.otp = otpHash;
  user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save({ validateBeforeSave: false });

  // Send Email
  const { sendEmail } = await import('../../../../shared/common/utils/emailService.js');
  try {
    await sendEmail({
      to: user.email,
      subject: 'Your Login OTP - Flower Emporium',
      html: `<h1>Your Login OTP</h1><p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`,
    });
  } catch (err) {
    console.error('Email send failed:', err);
    // Continue execution to try SMS
  }

  // Send SMS
  // Assuming user has a phone number
  if (user.phone) {
    const { sendSMS } = await import('../../../../shared/common/utils/smsService.js');
    await sendSMS(user.phone, `Your Flower Emporium OTP is: ${otp}`);
  }

  res.status(200).json({
    success: true,
    message: 'OTP sent to email and phone',
  });
});

/**
 * @route   POST /api/auth/login-with-otp
 * @desc    Login using OTP
 * @access  Public
 */
export const verifyLoginOTP = asyncHandler(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return next(new AppError('Please provide email and OTP', 400));
  }

  const user = await User.findOne({ email }).select('+otp +otpExpires');

  if (!user) {
    return next(new AppError('Invalid credentials', 401));
  }

  if (!user.otp || !user.otpExpires) {
    return next(new AppError('Invalid or expired OTP', 400));
  }

  if (Date.now() > user.otpExpires) {
    return next(new AppError('OTP expired', 400));
  }

  const isMatch = await (await import('bcrypt')).default.compare(otp, user.otp);

  if (!isMatch) {
    return next(new AppError('Invalid OTP', 401));
  }

  // Clear OTP fields
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save({ validateBeforeSave: false });

  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    data: {
      user,
      token,
    },
  });
});

/**
 * @route   POST /api/auth/address
 * @desc    Add new address to user profile
 * @access  Private
 */
export const addAddress = asyncHandler(async (req, res, next) => {
  const { fullName, addressLine1, city, state, postalCode, country, phone, isDefault } = req.body;

  // Basic validation
  if (!fullName || !addressLine1 || !city || !state || !postalCode || !country || !phone) {
    return next(new AppError('Please provide all address fields', 400));
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // If this is the first address, make it default automatically
  const isFirstAddress = user.addresses.length === 0;

  // If setting as default, unset others (if any logic needed, though we can just sort by isDefault)
  let newAddress = {
    fullName,
    addressLine1,
    city,
    state,
    postalCode,
    country,
    phone,
    isDefault: isFirstAddress || isDefault
  };

  if (newAddress.isDefault && user.addresses.length > 0) {
    user.addresses.forEach(a => a.isDefault = false);
  }

  user.addresses.push(newAddress);
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Address added successfully',
    data: {
      addresses: user.addresses
    }
  });
});


