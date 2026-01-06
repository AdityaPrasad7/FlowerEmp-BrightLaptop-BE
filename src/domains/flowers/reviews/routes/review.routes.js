/**
 * Review Routes (Flowers Domain)
 */
import express from 'express';
import { getGoogleReviews } from '../controllers/review.controller.js';

const router = express.Router();

/**
 * @route   GET /api/flowers/reviews
 * @desc    Get Google Reviews
 * @access  Public
 */
router.get('/', getGoogleReviews);

export default router;
