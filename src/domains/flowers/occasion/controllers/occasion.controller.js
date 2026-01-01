/**
 * Occasion Controller (Flowers Domain)
 * Handles occasion CRUD operations
 */
import Occasion from '../models/Occasion.model.js';
import { AppError, asyncHandler } from '../../../../shared/common/utils/errorHandler.js';

/**
 * @route   POST /api/flowers/occasions
 * @desc    Create a new occasion
 * @access  Private (Admin only)
 */
export const createOccasion = asyncHandler(async (req, res, next) => {
    const { name } = req.body;

    if (!name) {
        return next(new AppError('Occasion name is required', 400));
    }

    // Check if already exists
    const existing = await Occasion.findOne({ name: name.trim() });
    if (existing) {
        return next(new AppError('Occasion already exists', 400));
    }

    const occasion = await Occasion.create({
        name: name.trim(),
        createdBy: req.user._id,
    });

    res.status(201).json({
        success: true,
        data: {
            occasion,
        },
    });
});

/**
 * @route   GET /api/flowers/occasions
 * @desc    Get all active occasions
 * @access  Public
 */
export const getOccasions = asyncHandler(async (req, res, next) => {
    const occasions = await Occasion.find({ isActive: true })
        .sort({ name: 1 })
        .select('name _id');

    res.status(200).json({
        success: true,
        count: occasions.length,
        data: {
            occasions,
        },
    });
});
