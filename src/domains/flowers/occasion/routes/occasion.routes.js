/**
 * Occasion Routes
 */
import express from 'express';
import { createOccasion, getOccasions } from '../controllers/occasion.controller.js';
import { protect, restrictTo as authorize } from '../../../../shared/common/middlewares/auth.middleware.js';

const router = express.Router();

router
    .route('/')
    .post(protect, authorize('ADMIN'), createOccasion)
    .get(getOccasions);

export default router;
