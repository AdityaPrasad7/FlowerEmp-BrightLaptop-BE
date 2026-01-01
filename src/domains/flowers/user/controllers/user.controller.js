/**
 * User Controller (Flowers Domain)
 * Handles user management operations
 */
import User from '../../auth/models/User.model.js';
import { AppError, asyncHandler } from '../../../../shared/common/utils/errorHandler.js';

/**
 * @route   GET /api/flowers/users
 * @desc    Get all users
 * @access  Private (Admin only)
 */
export const getAllUsers = asyncHandler(async (req, res, next) => {
    // Exclude admins from the list and count orders
    const users = await User.aggregate([
        {
            $match: { role: { $ne: 'ADMIN' } }
        },
        {
            $lookup: {
                from: 'orders', // Collection name (usually plural of model name)
                localField: '_id',
                foreignField: 'userId',
                as: 'userOrders'
            }
        },
        {
            $addFields: {
                orderCount: { $size: '$userOrders' }
            }
        },
        {
            $project: {
                password: 0,
                userOrders: 0 // Don't send full order list for bandwidth
            }
        },
        {
            $sort: { createdAt: -1 }
        }
    ]);

    res.status(200).json({
        success: true,
        count: users.length,
        data: {
            users,
        },
    });
});

/**
 * @route   GET /api/flowers/users/:id
 * @desc    Get single user with orders
 * @access  Private (Admin only)
 */
export const getUserById = asyncHandler(async (req, res, next) => {
    const userId = req.params.id;

    // Using import to avoid circular dependency issues if any, or just for consistency
    const mongoose = (await import('mongoose')).default;

    const users = await User.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(userId) }
        },
        {
            $lookup: {
                from: 'orders',
                localField: '_id',
                foreignField: 'userId',
                pipeline: [
                    { $sort: { createdAt: -1 } },
                    {
                        $unwind: {
                            path: '$products', // The field in Order model is 'products', NOT 'items'
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $lookup: {
                            from: 'products',
                            localField: 'products.productId',
                            foreignField: '_id',
                            as: 'products.productDetails'
                        }
                    },
                    {
                        $unwind: {
                            path: '$products.productDetails',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $group: {
                            _id: '$_id',
                            root: { $mergeObjects: '$$ROOT' },
                            products: { $push: '$products' }
                        }
                    },
                    {
                        $replaceRoot: {
                            newRoot: {
                                $mergeObjects: ['$root', { products: '$products' }]
                            }
                        }
                    }
                ],
                as: 'orders'
            }
        },
        {
            $project: {
                password: 0
            }
        }
    ]);

    if (!users || users.length === 0) {
        return next(new AppError('User not found', 404));
    }

    res.status(200).json({
        success: true,
        data: {
            user: users[0],
        },
    });
});
