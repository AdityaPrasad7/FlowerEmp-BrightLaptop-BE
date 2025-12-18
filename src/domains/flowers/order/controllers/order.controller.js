/**
 * Order Controller (Flowers Domain)
 * Handles order creation and management
 */
import Order from '../models/Order.model.js';
import Product from '../../product/models/Product.model.js';
import User from '../../auth/models/User.model.js';
import { AppError, asyncHandler } from '../../../../shared/common/utils/errorHandler.js';
import {
  calculateUnitPrice,
  calculateItemTotal,
  calculateOrderTotal,
} from '../../product/services/pricing.service.js';

/**
 * @route   POST /api/flowers/orders
 * @desc    Create a new order
 * @access  Private
 */
export const createOrder = asyncHandler(async (req, res, next) => {
  const { products, notes } = req.body;

  // Validate required fields
  if (!products || !Array.isArray(products) || products.length === 0) {
    return next(new AppError('Please provide at least one product', 400));
  }

  // 🔒 SECURITY FIX: Derive orderType from authenticated user role, not request body
  // This prevents malicious clients from bypassing MOQ by sending orderType: "B2C"
  // B2B_BUYER role always creates B2B orders (MOQ enforced)
  // All other roles create B2C orders (MOQ not enforced)
  const orderType = req.user.role === 'B2B_BUYER' ? 'B2B' : 'B2C';

  // Fetch all products and validate
  const productIds = products.map((item) => item.productId);
  const fetchedProducts = await Product.find({
    _id: { $in: productIds },
    isActive: true,
  });

  if (fetchedProducts.length !== productIds.length) {
    return next(new AppError('One or more products not found or inactive', 404));
  }

  // Prepare order items with pricing and MOQ validation
  const orderItems = [];
  const moqValidationData = [];

  for (const item of products) {
    const product = fetchedProducts.find(
      (p) => p._id.toString() === item.productId.toString()
    );

    if (!product) {
      return next(new AppError(`Product ${item.productId} not found`, 404));
    }

    // Check stock availability
    if (product.stock < item.quantity) {
      return next(
        new AppError(
          `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
          400
        )
      );
    }

    // Calculate price (simple - always base price for flowers)
    const unitPrice = calculateUnitPrice(
      product.basePrice,
      item.quantity,
      req.user.role
    );

    orderItems.push({
      productId: product._id,
      quantity: item.quantity,
      priceAtPurchase: unitPrice,
    });

    moqValidationData.push({
      productId: product._id,
      productName: product.name,
      quantity: item.quantity,
      moq: product.moq,
    });
  }

  // Calculate total amount
  const totalAmount = calculateOrderTotal(orderItems);

  // Determine default status based on order type
  // B2C orders are auto-approved, B2B orders need approval
  const defaultStatus = orderType === 'B2C' ? 'APPROVED' : 'PENDING';

  // Create order
  const order = await Order.create({
    userId: req.user._id,
    products: orderItems,
    orderType,
    status: defaultStatus,
    totalAmount,
    notes: notes || '',
  });

  // Update product stock (only if order is approved)
  if (defaultStatus === 'APPROVED') {
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity },
      });
    }
  }

  // Populate product details for response
  await order.populate('products.productId', 'name description');

  res.status(201).json({
    success: true,
    data: {
      order,
    },
  });
});

/**
 * @route   GET /api/flowers/orders
 * @desc    Get user's orders
 * @access  Private
 */
export const getOrders = asyncHandler(async (req, res, next) => {
  const { status, orderType } = req.query;

  // Build query - users can only see their own orders
  // Admins and sellers can see all orders (if needed, add separate endpoint)
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
 * @route   GET /api/flowers/orders/:id
 * @desc    Get single order
 * @access  Private
 */
export const getOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate('products.productId', 'name description basePrice')
    .populate('userId', 'name email companyName');

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  // Check if user owns the order or is admin/seller
  // Handle both populated and non-populated userId
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
 * @route   PUT /api/flowers/orders/:id/approve
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

  // Only pending B2B orders can be approved
  if (order.status !== 'PENDING') {
    return next(
      new AppError(
        `Cannot approve order with status: ${order.status}`,
        400
      )
    );
  }

  // Verify stock availability before approving
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

  // Update order status
  order.status = 'APPROVED';
  await order.save();

  // Update product stock
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
 * @route   PUT /api/flowers/orders/:id/status
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

  // Prevent status changes that don't make sense
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

