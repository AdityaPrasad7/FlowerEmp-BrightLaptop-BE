/**
 * File Upload Middleware
 * Handles file uploads using Multer
 */
import multer from 'multer';
import { AppError } from '../utils/errorHandler.js';

// Configure multer for memory storage (files will be stored in memory before uploading to Cloudinary)
const storage = multer.memoryStorage();

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new AppError('Only image files are allowed', 400), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

/**
 * Middleware for single image upload
 */
export const uploadSingle = upload.single('image');

/**
 * Middleware for multiple image uploads
 * @param {number} maxCount - Maximum number of images (default: 10)
 */
export const uploadMultiple = (maxCount = 10) => upload.array('images', maxCount);

/**
 * Error handler for multer errors
 */
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File size too large. Maximum size is 5MB', 400));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new AppError(`Too many files. Maximum is ${err.limit}`, 400));
    }
    return next(new AppError(err.message, 400));
  }
  next(err);
};

