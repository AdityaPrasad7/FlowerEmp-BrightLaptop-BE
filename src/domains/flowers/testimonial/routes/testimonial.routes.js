/**
 * Testimonial Routes (Flowers Domain)...
 */
import express from 'express';
import { getAllTestimonials, createTestimonial, deleteTestimonial } from '../controllers/testimonial.controller.js';
import { protect, restrictTo } from '../../../../shared/common/middlewares/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllTestimonials);

// Protected routes (Admin only for management)
router.use(protect);
router.use(restrictTo('ADMIN'));

router.post('/', createTestimonial);
router.delete('/:id', deleteTestimonial);

export default router;
