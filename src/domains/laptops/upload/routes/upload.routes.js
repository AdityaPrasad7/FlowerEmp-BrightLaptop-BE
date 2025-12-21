/**
 * Upload Routes (Laptops Domain)
 * Handles image upload endpoints for laptops domain
 */
import express from 'express';
import { protect } from '../../../../shared/common/middlewares/auth.middleware.js';
import { restrictTo } from '../../../../shared/common/middlewares/role.middleware.js';
import { uploadSingle, uploadMultiple, handleUploadError } from '../../../../shared/common/middlewares/upload.middleware.js';
import { uploadSingleImage, uploadMultipleImage } from '../../../../shared/common/controllers/upload.controller.js';

const router = express.Router();

// Upload single image (Seller/Admin only)
router.post(
  '/image',
  protect,
  restrictTo('SELLER', 'ADMIN'),
  uploadSingle,
  handleUploadError,
  (req, res, next) => {
    // Set default folder for laptops domain
    if (!req.body.folder) {
      req.body.folder = 'laptops/products';
    }
    uploadSingleImage(req, res, next);
  }
);

// Upload multiple images (Seller/Admin only)
router.post(
  '/images',
  protect,
  restrictTo('SELLER', 'ADMIN'),
  uploadMultiple(10),
  handleUploadError,
  (req, res, next) => {
    // Set default folder for laptops domain
    if (!req.body.folder) {
      req.body.folder = 'laptops/products';
    }
    uploadMultipleImage(req, res, next);
  }
);

export default router;

