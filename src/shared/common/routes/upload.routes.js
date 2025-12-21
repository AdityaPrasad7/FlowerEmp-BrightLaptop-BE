/**
 * Upload Routes
 * Handles image upload endpoints
 */
import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { restrictTo } from '../middlewares/role.middleware.js';
import { uploadSingle, uploadMultiple, handleUploadError } from '../middlewares/upload.middleware.js';
import { uploadSingleImage, uploadMultipleImage } from '../controllers/upload.controller.js';

const router = express.Router();

// Upload single image (Seller/Admin only)
router.post(
  '/image',
  protect,
  restrictTo('SELLER', 'ADMIN'),
  uploadSingle,
  handleUploadError,
  uploadSingleImage
);

// Upload multiple images (Seller/Admin only)
router.post(
  '/images',
  protect,
  restrictTo('SELLER', 'ADMIN'),
  uploadMultiple(10),
  handleUploadError,
  uploadMultipleImage
);

export default router;

