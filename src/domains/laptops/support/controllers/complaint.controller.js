/**
 * Complaint Controller (Laptops Support Domain)
 */
import Complaint from '../models/Complaint.model.js';
import Order from '../../order/models/Order.model.js';
import { AppError, asyncHandler } from '../../../../shared/common/utils/errorHandler.js';

/**
 * @route   POST /api/laptops/support/complaints
 * @desc    Create a new complaint
 * @access  Private
 */
export const createComplaint = asyncHandler(async (req, res, next) => {
    const { orderId, subject, description, category, priority } = req.body;

    // Validate Order if provided
    if (orderId) {
        const order = await Order.findById(orderId);
        if (!order) {
            return next(new AppError('Order not found', 404));
        }
        // Verify user owns the order (unless admin?? No, user raises complaint)
        if (order.userId.toString() !== req.user._id.toString()) {
            return next(new AppError('You can only raise complaints for your own orders', 403));
        }
    }

    const complaint = await Complaint.create({
        userId: req.user._id,
        orderId: orderId || null,
        subject,
        description,
        category: category || 'Other',
        priority: priority || 'Medium',
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
    const { status, userId, orderId } = req.query;

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

    const complaints = await Complaint.find(query)
        .populate('userId', 'name email phone')
        .populate({
            path: 'orderId',
            select: 'totalAmount status createdAt products',
            populate: { path: 'products.productId', select: 'name' }
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
    const { status, adminNotes, priority } = req.body;
    const { id } = req.params;

    const complaint = await Complaint.findById(id);

    if (!complaint) {
        return next(new AppError('Complaint not found', 404));
    }

    if (status) complaint.status = status;
    if (adminNotes) complaint.adminNotes = adminNotes;
    if (priority) complaint.priority = priority;

    await complaint.save();

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
        .populate('userId', 'name email phone')
        .populate('orderId');

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
