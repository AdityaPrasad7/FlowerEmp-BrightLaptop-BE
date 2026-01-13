/**
 * Upload Controller
 * Handles image upload endpoints
 */
import { uploadImage, uploadMultipleImages, uploadAudio } from '../utils/cloudinaryUpload.js';
import { asyncHandler } from '../utils/errorHandler.js';

/**
 * @route   POST /api/upload/image
 * @desc    Upload single image
 * @access  Private (Seller/Admin only)
 */
export const uploadSingleImage = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No image file provided',
    });
  }

  const folder = req.body.folder || 'laptops/products';
  const result = await uploadImage(req.file.buffer, folder);

  res.status(200).json({
    success: true,
    data: {
      image: result,
    },
  });
});

/**
 * @route   POST /api/upload/images
 * @desc    Upload multiple images
 * @access  Private (Seller/Admin only)
 */
export const uploadMultipleImage = asyncHandler(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No image files provided',
    });
  }

  const folder = req.body.folder || 'laptops/products';
  const fileBuffers = req.files.map((file) => file.buffer);
  const results = await uploadMultipleImages(fileBuffers, folder);

  res.status(200).json({
    success: true,
    count: results.length,
    data: {
      images: results,
    },
  });
});

/**
 * @route   POST /api/upload/audio
 * @desc    Upload single audio file (for voice messages)
 * @access  Private
 */
export const uploadSingleAudio = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No audio file provided',
    });
  }

  const folder = req.body.folder || 'laptops/complaints/voice';
  const result = await uploadAudio(req.file.buffer, folder);

  res.status(200).json({
    success: true,
    data: {
      audio: result,
    },
  });
});
