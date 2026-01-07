/**
 * Testimonial Controller (Flowers Domain)
 */
import Testimonial from '../models/Testimonial.model.js';
import { AppError, asyncHandler } from '../../../../shared/common/utils/errorHandler.js';

/**
 * @route   GET /api/flowers/testimonials
 * @desc    Get all testimonials
 * @access  Public
 */
export const getAllTestimonials = asyncHandler(async (req, res, next) => {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: testimonials.length,
        data: {
            testimonials
        }
    });
});

/**
 * @route   POST /api/flowers/testimonials
 * @desc    Create new testimonial
 * @access  Private (Admin)
 */
export const createTestimonial = asyncHandler(async (req, res, next) => {
    const { customerName, rating, comment, status } = req.body;

    if (!customerName || !rating || !comment) {
        return next(new AppError('Please provide all required fields', 400));
    }

    const testimonial = await Testimonial.create({
        customerName,
        rating,
        comment,
        status
    });

    res.status(201).json({
        success: true,
        data: {
            testimonial
        }
    });
});

/**
 * @route   DELETE /api/flowers/testimonials/:id
 * @desc    Delete testimonial
 * @access  Private (Admin)
 */
export const deleteTestimonial = asyncHandler(async (req, res, next) => {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);

    if (!testimonial) {
        return next(new AppError('Testimonial not found', 404));
    }

    res.status(200).json({
        success: true,
        data: {}
    });
});
