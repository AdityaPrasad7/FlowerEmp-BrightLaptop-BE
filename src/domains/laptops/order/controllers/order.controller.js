/**
 * Order Controller (Laptops Domain)
 * Handles order creation and management with MOQ, bulk pricing, and delivery scheduling
 */
import Order from '../models/Order.model.js';
import Product from '../../product/models/Product.model.js';
import User from '../../auth/models/User.model.js';
import { AppError, asyncHandler } from '../../../../shared/common/utils/errorHandler.js';
import {
  calculateUnitPrice,
  calculateOrderTotal,
} from '../../product/services/pricing.service.js';

/**
 * @route   POST /api/laptops/orders
 * @desc    Create a new order
 * @access  Private
 */
export const createOrder = asyncHandler(async (req, res, next) => {
  const { products, notes } = req.body;

  if (!products || !Array.isArray(products) || products.length === 0) {
    return next(new AppError('Please provide at least one product', 400));
  }

  const orderType = req.user.role === 'B2B_BUYER' ? 'B2B' : 'B2C';

  const productIds = products.map((item) => item.productId);
  const fetchedProducts = await Product.find({
    _id: { $in: productIds },
    isActive: true,
  });

  if (fetchedProducts.length !== productIds.length) {
    return next(new AppError('One or more products not found or inactive', 404));
  }

  const orderItems = [];

  for (const item of products) {
    const product = fetchedProducts.find(
      (p) => p._id.toString() === item.productId.toString()
    );

    if (!product) {
      return next(new AppError(`Product ${item.productId} not found`, 404));
    }

    if (product.stock < item.quantity) {
      return next(
        new AppError(
          `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
          400
        )
      );
    }

    const unitPrice = calculateUnitPrice(
      product.basePrice,
      item.quantity,
      req.user.role,
      product.b2bPrice || null,
      product.moq || 1,
      product.bulkPricing || []
    );

    orderItems.push({
      productId: product._id,
      quantity: item.quantity,
      priceAtPurchase: unitPrice,
    });
  }

  const totalAmount = calculateOrderTotal(orderItems);
  const defaultStatus = orderType === 'B2C' ? 'APPROVED' : 'PENDING';

  const order = await Order.create({
    userId: req.user._id,
    products: orderItems,
    orderType,
    status: defaultStatus,
    totalAmount,
    notes: notes || '',
  });

  if (defaultStatus === 'APPROVED') {
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity },
      });
    }
  }

  await order.populate('products.productId', 'name description');

  res.status(201).json({
    success: true,
    data: {
      order,
    },
  });
});

/**
 * @route   GET /api/laptops/orders
 * @desc    Get user's orders
 * @access  Private
 */
export const getOrders = asyncHandler(async (req, res, next) => {
  const { status, orderType } = req.query;

  const query = { userId: req.user._id };
  if (status) {
    query.status = status;
  }
  if (orderType) {
    query.orderType = orderType;
  }

  const orders = await Order.find(query)
    .populate('products.productId', 'name description')
    .populate('userId', 'name email companyName')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: orders.length,
    data: {
      orders,
    },
  });
});

/**
 * @route   GET /api/laptops/orders/:id
 * @desc    Get single order
 * @access  Private
 */
export const getOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate('products.productId', 'name description basePrice moq')
    .populate('userId', 'name email companyName');

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  const orderUserId = order.userId._id ? order.userId._id.toString() : order.userId.toString();
  if (
    orderUserId !== req.user._id.toString() &&
    req.user.role !== 'ADMIN' &&
    req.user.role !== 'SELLER'
  ) {
    return next(new AppError('Not authorized to view this order', 403));
  }

  res.status(200).json({
    success: true,
    data: {
      order,
    },
  });
});

/**
 * @route   PUT /api/laptops/orders/:id/approve
 * @desc    Approve an order (Seller/Admin only)
 * @access  Private (Seller/Admin only)
 */
export const approveOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate(
    'products.productId'
  );

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  if (order.status !== 'PENDING') {
    return next(
      new AppError(
        `Cannot approve order with status: ${order.status}`,
        400
      )
    );
  }

  for (const item of order.products) {
    const product = item.productId;
    if (product.stock < item.quantity) {
      return next(
        new AppError(
          `Insufficient stock for ${product.name}. Available: ${product.stock}, Required: ${item.quantity}`,
          400
        )
      );
    }
  }

  order.status = 'APPROVED';
  await order.save();

  for (const item of order.products) {
    const productId = item.productId._id || item.productId;
    await Product.findByIdAndUpdate(productId, {
      $inc: { stock: -item.quantity },
    });
  }

  res.status(200).json({
    success: true,
    data: {
      order,
    },
    message: 'Order approved successfully. Stock has been deducted.',
  });
});

/**
 * @route   PUT /api/laptops/orders/:id/status
 * @desc    Update order status (Seller/Admin only)
 * @access  Private (Seller/Admin only)
 */
export const updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const validStatuses = ['PENDING', 'APPROVED', 'SHIPPED', 'CANCELLED'];

  if (!status || !validStatuses.includes(status)) {
    return next(
      new AppError(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        400
      )
    );
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  if (order.status === 'CANCELLED') {
    return next(new AppError('Cannot change status of cancelled order', 400));
  }

  order.status = status;
  await order.save();

  res.status(200).json({
    success: true,
    data: {
      order,
    },
    message: 'Order status updated successfully',
  });
});

