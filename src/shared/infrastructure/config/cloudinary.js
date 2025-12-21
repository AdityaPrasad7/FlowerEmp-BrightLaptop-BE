/**
 * Cloudinary Configuration
 * Sets up Cloudinary for image uploads
 */
import { v2 as cloudinary } from 'cloudinary';
import env from './env.js';

// Configure Cloudinary only if credentials are provided
if (env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
} else {
  console.warn('⚠️  Cloudinary credentials not provided. Image uploads will not work.');
}

export default cloudinary;

