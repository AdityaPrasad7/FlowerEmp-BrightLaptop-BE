/**
 * Banner Routes
 */
import express from 'express';
import {
    createBanner,
    getBanners,
    deleteBanner,
    updateBanner,
} from '../controllers/banner.controller.js';
import { protect, restrictTo } from '../../../../shared/common/middlewares/auth.middleware.js';
import upload from '../../../../shared/infrastructure/storage/multer.js';

const router = express.Router();

// Public routes
router.get('/', getBanners);

// Admin only routes
router.use(protect);
router.use(restrictTo('ADMIN', 'SELLER')); // Sellers might need to manage their own offers? Let's allow for now.

router.post('/', upload.single('image'), createBanner);
router.put('/:id', upload.single('image'), updateBanner);
router.delete('/:id', deleteBanner);

export default router;
