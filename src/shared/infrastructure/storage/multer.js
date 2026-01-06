/**
 * Multer Configuration
 * Stores files in memory for easy upload to Cloudinary
 */
import multer from 'multer';
import { AppError } from '../../common/utils/errorHandler.js';

// Store files in memory buffer
const storage = multer.memoryStorage();

// File filter (images only)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(new AppError('Not an image! Please upload only images.', 400), false);
    }
};

// Initialize upload middleware
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});

export default upload;
