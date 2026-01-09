/**
 * Cloudinary Upload Utility
 * Handles image uploads to Cloudinary
 */
import cloudinary from '../../infrastructure/config/cloudinary.js';
import { AppError } from '../utils/errorHandler.js';

/**
 * Upload single image to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {string} folder - Folder path in Cloudinary (optional)
 * @param {Object} options - Additional Cloudinary options
 * @returns {Promise<Object>} Upload result with secure_url
 */
export const uploadImage = async (fileBuffer, folder = 'laptops/products', options = {}) => {
  try {
    return new Promise((resolve, reject) => {
      const uploadOptions = {
        resource_type: 'image',
        timeout: 120000, // 120 seconds
        ...options,
      };

      console.log(`Starting Cloudinary upload for file. Size: ${fileBuffer.length} bytes`);
      const start = Date.now();

      cloudinary.uploader
        .upload_stream(uploadOptions, (error, result) => {
          const duration = Date.now() - start;
          console.log(`Cloudinary upload finished. Duration: ${duration}ms`);

          if (error) {
            console.error('Cloudinary upload stream error:', error);
            return reject(new AppError('Image upload failed', 500));
          }
          resolve({
            public_id: result.public_id,
            secure_url: result.secure_url,
            url: result.url,
            width: result.width,
            height: result.height,
            format: result.format,
          });
        })
        .end(fileBuffer);
    });
  } catch (error) {
    console.error('Error in uploadImage:', error);
    throw new AppError('Failed to upload image', 500);
  }
};

/**
 * Upload multiple images to Cloudinary
 * @param {Array<Buffer>} fileBuffers - Array of file buffers
 * @param {string} folder - Folder path in Cloudinary (optional)
 * @param {Object} options - Additional Cloudinary options
 * @returns {Promise<Array<Object>>} Array of upload results
 */
export const uploadMultipleImages = async (
  files,
  folder = 'laptops/products',
  options = {}
) => {
  try {
    const uploadPromises = files.map((file) => {
      const buffer = Buffer.isBuffer(file) ? file : (file.buffer || file);
      return uploadImage(buffer, folder, options);
    });
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error in uploadMultipleImages:', error);
    throw new AppError(`Failed to upload images: ${error.message}`, 500);
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Public ID of the image to delete
 * @returns {Promise<Object>} Deletion result
 */
export const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw new AppError('Failed to delete image', 500);
  }
};

/**
 * Delete multiple images from Cloudinary
 * @param {Array<string>} publicIds - Array of public IDs to delete
 * @returns {Promise<Object>} Deletion result
 */
export const deleteMultipleImages = async (publicIds) => {
  try {
    const result = await cloudinary.uploader.destroy(publicIds);
    return result;
  } catch (error) {
    throw new AppError('Failed to delete images', 500);
  }
};

////////