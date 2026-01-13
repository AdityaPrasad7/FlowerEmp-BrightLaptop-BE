/**
 * Refurbishment Request Controller (Laptops Domain)
 */
import RefurbishmentRequest from '../models/RefurbishmentRequest.model.js';
import Order from '../../order/models/Order.model.js';
import { AppError, asyncHandler } from '../../../../shared/common/utils/errorHandler.js';

/**
 * @route   POST /api/laptops/refurbishment/requests
 * @desc    Create a new refurbishment request
 * @access  Private
 */
export const createRefurbishmentRequest = asyncHandler(async (req, res, next) => {
    const { orderId, productId, images, issueText, accessories } = req.body;

    if (!orderId || !productId || !images || !issueText) {
        return next(new AppError('Order ID, Product ID, images, and issue description are required', 400));
    }

    // Validate order exists and belongs to user
    const order = await Order.findById(orderId).populate('products.productId');
    if (!order) {
        return next(new AppError('Order not found', 404));
    }

   
   
    // Verify product is in the order
    const productInOrder = order.products.some(
        item => item.productId._id.toString() === productId.toString()
    );
    if (!productInOrder) {
        return next(new AppError('Product not found in this order', 400));
    }

    // Check if there's already a pending request for this order/product
    const existingRequest = await RefurbishmentRequest.findOne({
        orderId,
        productId,
        status: { $in: ['PENDING', 'APPROVED', 'IN_TRANSIT_TO_WAREHOUSE', 'IN_REFURB', 'IN_TRANSIT_TO_CUSTOMER'] }
    });

    if (existingRequest) {
        return next(new AppError('A refurbishment request already exists for this product in this order', 400));
    }

    const request = await RefurbishmentRequest.create({
        userId: req.user._id,
        orderId,
        productId,
        images: Array.isArray(images) ? images : [images],
        issueText,
        accessories: Array.isArray(accessories) ? accessories : (accessories ? [accessories] : []),
        status: 'PENDING'
    });

    res.status(201).json({
        success: true,
        data: {
            request,
        },
        message: 'Refurbishment request submitted successfully',
    });
});

/**
 * @route   GET /api/laptops/refurbishment/requests
 * @desc    Get refurbishment requests (User sees own, Admin sees all)
 * @access  Private
 */
export const getRefurbishmentRequests = asyncHandler(async (req, res, next) => {
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

    const requests = await RefurbishmentRequest.find(query)
        .populate('userId', 'name email phone companyName')
        .populate('productId', 'name brand images specifications')
        .populate({
            path: 'orderId',
            select: 'totalAmount status createdAt paymentStatus products shippingAddress',
            populate: { path: 'products.productId', select: 'name brand images' }
        })
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: requests.length,
        data: {
            requests,
        },
    });
});

/**
 * @route   GET /api/laptops/refurbishment/requests/:id
 * @desc    Get single refurbishment request
 * @access  Private
 */
export const getRefurbishmentRequest = asyncHandler(async (req, res, next) => {
    const request = await RefurbishmentRequest.findById(req.params.id)
        .populate('userId', 'name email phone companyName')
        .populate('productId', 'name brand images specifications')
        .populate({
            path: 'orderId',
            select: 'totalAmount status createdAt paymentStatus products shippingAddress',
            populate: { path: 'products.productId', select: 'name brand images' }
        });

    if (!request) {
        return next(new AppError('Refurbishment request not found', 404));
    }

    // Access check
    if (req.user.role === 'B2C_BUYER' || req.user.role === 'B2B_BUYER') {
        if (request.userId._id.toString() !== req.user._id.toString()) {
            return next(new AppError('Not authorized', 403));
        }
    }

    res.status(200).json({
        success: true,
        data: {
            request
        }
    });
});

/**
 * @route   PUT /api/laptops/refurbishment/requests/:id/status
 * @desc    Update refurbishment request status (Admin/Seller only)
 * @access  Private (Admin/Seller)
 */
export const updateRefurbishmentRequestStatus = asyncHandler(async (req, res, next) => {
    const { status, adminNotes } = req.body;
    const { id } = req.params;

    const validStatuses = ['PENDING', 'APPROVED', 'IN_TRANSIT_TO_WAREHOUSE', 'IN_REFURB', 'IN_TRANSIT_TO_CUSTOMER', 'COMPLETED'];
    if (status && !validStatuses.includes(status)) {
        return next(new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400));
    }

    const request = await RefurbishmentRequest.findById(id);

    if (!request) {
        return next(new AppError('Refurbishment request not found', 404));
    }

    if (status) request.status = status;
    if (adminNotes !== undefined) request.adminNotes = adminNotes;

    // Set completedAt when status is COMPLETED
    if (status === 'COMPLETED') {
        request.completedAt = new Date();
    }

    await request.save();

    // Populate before sending response
    await request.populate('userId', 'name email phone companyName');
    await request.populate('productId', 'name brand images');
    await request.populate({
        path: 'orderId',
        select: 'totalAmount status createdAt paymentStatus shippingAddress',
    });

    res.status(200).json({
        success: true,
        data: {
            request,
        },
        message: 'Refurbishment request updated successfully',
    });
});

/**
 * @route   PUT /api/laptops/refurbishment/requests/:id/warehouse-shipment
 * @desc    Update warehouse shipment details (Admin/Seller only)
 * @access  Private (Admin/Seller)
 */
export const updateWarehouseShipment = asyncHandler(async (req, res, next) => {
    const { awbNumber, courierName, trackingNumber } = req.body;
    const { id } = req.params;

    const request = await RefurbishmentRequest.findById(id);

    if (!request) {
        return next(new AppError('Refurbishment request not found', 404));
    }

    if (awbNumber) request.warehouseShipment.awbNumber = awbNumber;
    if (courierName) request.warehouseShipment.courierName = courierName;
    if (trackingNumber) request.warehouseShipment.trackingNumber = trackingNumber;
    request.warehouseShipment.dispatchedAt = new Date();
    request.status = 'IN_TRANSIT_TO_WAREHOUSE';

    await request.save();

    res.status(200).json({
        success: true,
        data: {
            request,
        },
        message: 'Warehouse shipment details updated successfully',
    });
});

/**
 * @route   PUT /api/laptops/refurbishment/requests/:id/return-shipment
 * @desc    Update return shipment details (Admin/Seller only)
 * @access  Private (Admin/Seller)
 */
export const updateReturnShipment = asyncHandler(async (req, res, next) => {
    const { awbNumber, courierName, trackingNumber } = req.body;
    const { id } = req.params;

    const request = await RefurbishmentRequest.findById(id);

    if (!request) {
        return next(new AppError('Refurbishment request not found', 404));
    }

    if (awbNumber) request.returnShipment.awbNumber = awbNumber;
    if (courierName) request.returnShipment.courierName = courierName;
    if (trackingNumber) request.returnShipment.trackingNumber = trackingNumber;
    request.returnShipment.dispatchedAt = new Date();
    request.status = 'IN_TRANSIT_TO_CUSTOMER';

    await request.save();

    res.status(200).json({
        success: true,
        data: {
            request,
        },
        message: 'Return shipment details updated successfully',
    });
});
