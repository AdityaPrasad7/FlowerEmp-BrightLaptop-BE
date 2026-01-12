/**
 * Complaint Controller (Laptops Support Domain)
 */
import Complaint from '../models/Complaint.model.js';
import Order from '../../order/models/Order.model.js';
import Product from '../../product/models/Product.model.js';
import { AppError, asyncHandler } from '../../../../shared/common/utils/errorHandler.js';

/**
 * @route   POST /api/laptops/support/complaints
 * @desc    Create a new complaint
 * @access  Private
 */
export const createComplaint = asyncHandler(async (req, res, next) => {
    const { orderId, productId, description, category } = req.body;

    if (!description || !category) {
        return next(new AppError('Description and category are required', 400));
    }

    // Validate Order if provided
    if (orderId) {
        const order = await Order.findById(orderId)
            .populate('products.productId');
        if (!order) {
            return next(new AppError('Order not found', 404));
        }

        // Allow any user to raise a complaint for this order (no ownership check)

        // If productId is provided, verify it's in the order
        if (productId) {
            const productInOrder = order.products.some(
                item => item.productId._id.toString() === productId.toString()
            );
            if (!productInOrder) {
                return next(new AppError('Product not found in this order', 400));
            }
        }
    }

    const complaint = await Complaint.create({
        userId: req.user._id,
        orderId: orderId || null,
        productId: productId || null,
        description,
        category,
        status: 'OPEN'
    });

    res.status(201).json({
        success: true,
        data: {
            complaint,
        },
        message: 'Complaint submitted successfully',
    });
});

/**
 * @route   GET /api/laptops/support/complaints
 * @desc    Get complaints (User sees own, Admin sees all)
 * @access  Private
 */
export const getComplaints = asyncHandler(async (req, res, next) => {
    const { status, userId, orderId, category } = req.query;

    let query = {};

    // If user is buyer, force userId filter
    if (req.user.role === 'B2C_BUYER' || req.user.role === 'B2B_BUYER') {
        query.userId = req.user._id;
    } else if (userId) {
        // Admin/Seller can filter by userId
        query.userId = userId;
    }

    if (status) query.status = status;
    if (orderId) query.orderId = orderId;
    if (category) query.category = category;

    const complaints = await Complaint.find(query)
        .populate('userId', 'name email phone companyName')
        .populate('productId', 'name brand images specifications')
        .populate({
            path: 'orderId',
            select: 'totalAmount status createdAt paymentStatus products',
            populate: { path: 'products.productId', select: 'name brand images' }
        })
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: complaints.length,
        data: {
            complaints,
        },
    });
});

/**
 * @route   PUT /api/laptops/support/complaints/:id/status
 * @desc    Update complaint status (Admin/Seller only)
 * @access  Private (Admin/Seller)
 */
export const updateComplaintStatus = asyncHandler(async (req, res, next) => {
    const { status } = req.body;
    const { id } = req.params;

    const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    if (status && !validStatuses.includes(status)) {
        return next(new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400));
    }

    const complaint = await Complaint.findById(id);

    if (!complaint) {
        return next(new AppError('Complaint not found', 404));
    }

    if (status) complaint.status = status;

    await complaint.save();

    // Populate before sending response
    await complaint.populate('userId', 'name email phone companyName');
    await complaint.populate('productId', 'name brand images');
    if (complaint.orderId) {
        await complaint.populate({
            path: 'orderId',
            select: 'totalAmount status createdAt paymentStatus',
        });
    }

    res.status(200).json({
        success: true,
        data: {
            complaint,
        },
        message: 'Complaint updated successfully',
    });
});

/**
 * @route   GET /api/laptops/support/complaints/:id
 * @desc    Get single complaint
 * @access  Private
 */
export const getComplaint = asyncHandler(async (req, res, next) => {
    const complaint = await Complaint.findById(req.params.id)
        .populate('userId', 'name email phone companyName')
        .populate('productId', 'name brand images specifications')
        .populate({
            path: 'orderId',
            select: 'totalAmount status createdAt paymentStatus products',
            populate: { path: 'products.productId', select: 'name brand images' }
        });

    if (!complaint) {
        return next(new AppError('Complaint not found', 404));
    }

    // Access check
    if (req.user.role === 'B2C_BUYER' || req.user.role === 'B2B_BUYER') {
        if (complaint.userId._id.toString() !== req.user._id.toString()) {
            return next(new AppError('Not authorized', 403));
        }
    }

    res.status(200).json({
        success: true,
        data: {
            complaint
        }
    });
});
