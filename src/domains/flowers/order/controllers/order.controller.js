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
import { sendEmail } from '../../../../shared/common/utils/emailService.js';
import { sendSMS } from '../../../../shared/common/utils/smsService.js';
import { createNotification } from '../../../../shared/common/utils/notificationService.js';

/**
 * @route   POST /api/flowers/orders
 * @desc    Create a new order
 * @access  Private
 */
export const createOrder = asyncHandler(async (req, res, next) => {
  console.log("inside create order api");

  const { products, notes, deliveryDate, timeSlot, shippingAddress, paymentMethod } = req.body;

  // Validate required fields
  if (!products || !Array.isArray(products) || products.length === 0) {
    return next(new AppError('Please provide at least one product', 400));
  }

  // Basic validation for required fields
  if (!deliveryDate || !timeSlot || !paymentMethod) {
    return next(new AppError('Delivery Date, Time Slot and Payment Method are required', 400));
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
  // FIXED: All orders start as PENDING per business requirements
  // Admin maintains full control over the workflow
  const defaultStatus = 'PENDING';

  // Create order
  const order = await Order.create({
    userId: req.user._id,
    products: orderItems,
    orderType,
    status: defaultStatus,
    totalAmount,
    notes: notes || '',
    deliveryDate,
    timeSlot,
    shippingAddress,
    paymentMethod // 'COD' or others
  });

  // NOTE: Stock is NOT deducted here anymore because status is PENDING.
  // Stock will be deducted when Admin approves/confirms the order.

  // Populate product details for response
  await order.populate('products.productId', 'name description images');

  // 🔔 NOTIFICATIONS: Only for COD orders (Immediate Confirmation)
  // Online orders will trigger notification after verifyPayment (Success)
  if (paymentMethod === 'COD') {
    try {
      const userPhone = req.user.phone; // Assuming phone is on user user object

      // 0. Persistent Notification (In-App)
      await createNotification(
        req.user._id,
        'Order Placed',
        `Your order #${order.orderId} has been placed successfully.`,
        'SUCCESS',
        `/account/orders/${order._id}`
      );

      // 1. Send SMS
      if (userPhone) {
        await sendSMS(
          userPhone,
          `Hi ${req.user.name}, your order #${order.orderId} has been placed successfully! Total: ${totalAmount} KD. expected delivery: ${new Date(deliveryDate).toLocaleDateString()}`
        );
      }

      // 2. Send Email
      const emailHtml = `
              <h2>Thank you for your order!</h2>
              <p>Hi ${req.user.name},</p>
              <p>Your order <strong>#${order.orderId}</strong> has been placed successfully.</p>
              <h3>Order Details:</h3>
              <ul>
                  ${order.products.map(item => `
                      <li>${item.productId.name} x ${item.quantity} - ${item.priceAtPurchase} KD</li>
                  `).join('')}
              </ul>
              <p><strong>Total Amount: ${totalAmount} KD</strong></p>
              <p><strong>Payment Method:</strong> Cash on Delivery</p>
              <p><strong>Delivery Date:</strong> ${new Date(deliveryDate).toLocaleDateString()} (${timeSlot})</p>
              <p>We will contact you shortly to confirm delivery.</p>
          `;

      await sendEmail({
        to: req.user.email,
        subject: `Order Confirmation #${order.orderId} - Flower Emporium`,
        html: emailHtml
      });

    } catch (notifyError) {
      console.error("Notification Error (Non-blocking):", notifyError.message);
    }
  }

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
  const { status, orderType, page = 1, limit = 10, isLive } = req.query;

  let query = {};

  // Check for Live Orders request (Admin/Seller only)
  if (isLive === 'true' && (req.user.role === 'ADMIN' || req.user.role === 'SELLER')) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    query = {
      status: { $nin: ['DELIVERED', 'CANCELLED'] },
      deliveryDate: { $gte: startOfToday }
    };
  } else {
    // Default: Users see their own orders
    query = { userId: req.user._id };
  }

  // Apply additional filters (if compatible)
  if (status) {
    query.status = status;
  }
  if (orderType) {
    query.orderType = orderType;
  }

  // Pagination
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const total = await Order.countDocuments(query);

  const orders = await Order.find(query)
    .populate('products.productId', 'name description images')
    .populate('userId', 'name email companyName phone')
    .sort({ deliveryDate: 1, createdAt: 1 }) // Sort by delivery date for live orders
    .skip(skip)
    .limit(limitNum);

  res.status(200).json({
    success: true,
    count: orders.length,
    data: {
      orders,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum)
      }
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
    .populate('products.productId', 'name description basePrice images')
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
  const validStatuses = ['PENDING', 'APPROVED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'SHIPPED', 'CANCELLED'];

  if (!status || !validStatuses.includes(status)) {
    return next(
      new AppError(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        400
      )
    );
  }

  const order = await Order.findById(req.params.id).populate('userId', 'name email phone');

  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  // Prevent status changes that don't make sense
  if (order.status === 'CANCELLED') {
    return next(new AppError('Cannot change status of cancelled order', 400));
  }

  const oldStatus = order.status;
  order.status = status;
  await order.save();

  // 🔔 NOTIFICATIONS: Status Updates
  if (oldStatus !== status) {
    try {
      const user = order.userId;
      if (user) {
        let subject = `Order Update #${order.orderId}`;
        let message = `Your order status has been updated to ${status}.`;
        let smsMessage = `Hi ${user.name}, your order #${order.orderId} status is now: ${status}.`;
        // In-App Notification Type
        let type = 'INFO';
        if (status === 'DELIVERED') type = 'SUCCESS';
        if (status === 'CANCELLED') type = 'ERROR';
        if (status === 'SHIPPED' || status === 'OUT_FOR_DELIVERY') type = 'WARNING'; // Or Info, depends on UI preference

        // Custom Messages for specific statuses
        switch (status) {
          case 'SHIPPED':
            subject = `Your Order #${order.orderId} has Shipped! 🚚`;
            message = `Great news! Your order has been shipped and is on its way.`;
            smsMessage = `Hi ${user.name}, good news! Your order #${order.orderId} has been shipped.`;
            break;
          case 'OUT_FOR_DELIVERY':
            subject = `Order #${order.orderId} is Out for Delivery! 🌸`;
            message = `Get ready! Your flowers are out for delivery and will arrive soon.`;
            smsMessage = `Hi ${user.name}, your order #${order.orderId} is out for delivery today!`;
            break;
          case 'DELIVERED':
            subject = `Order #${order.orderId} Delivered! ✅`;
            message = `Your order has been successfully delivered. We hope it brings joy!`;
            smsMessage = `Hi ${user.name}, your order #${order.orderId} has been delivered. Thank you!`;
            break;
          case 'CANCELLED':
            subject = `Order #${order.orderId} Cancelled ❌`;
            message = `Your order has been cancelled. If this was a mistake, please contact us.`;
            smsMessage = `Hi ${user.name}, your order #${order.orderId} has been cancelled.`;
            break;
        }

        // 0. Persistent Notification (In-App)
        await createNotification(
          user._id,
          subject,
          message,
          type,
          `/account/orders/${order._id}` // Clicking takes user to order details
        );

        // 1. Send SMS
        if (user.phone) {
          await sendSMS(user.phone, smsMessage);
        }

        // 2. Send Email
        const emailHtml = `
                  <h2>Status Update</h2>
                  <p>Hi ${user.name},</p>
                  <p>${message}</p>
                  <h3>Order Details:</h3>
                  <p><strong>Order ID:</strong> #${order.orderId}</p>
                  <p><strong>New Status:</strong> ${status}</p>
                  <br>
                  <p>Track your order or view details on our website.</p>
              `;

        await sendEmail({
          to: user.email,
          subject: subject,
          html: emailHtml
        });
      }
    } catch (notifyError) {
      console.error("Status Update Notification Error:", notifyError.message);
    }
  }

  res.status(200).json({
    success: true,
    data: {
      order,
    },
    message: 'Order status updated successfully',
  });
});

/**
 * @route   POST /api/flowers/orders/track
 * @desc    Track order public (Verify with email)
 * @access  Public
 */
export const trackOrder = asyncHandler(async (req, res, next) => {
  const { orderId, email } = req.body;

  if (!orderId || !email) {
    return next(new AppError('Please provide Order ID and Email', 400));
  }

  // Find order by custom orderId (short ID)
  // We need to handle potential case where user provides # prefix
  const cleanOrderId = orderId.replace('#', '').trim().toUpperCase();
  console.log("cleanOrderId", cleanOrderId);

  const order = await Order.findOne({ orderId: cleanOrderId }).populate('userId', 'email');

  // Fallback: If not found by orderId, try finding by _id (legacy support)
  // This is helpful if some orders don't have orderId yet or user used long ID
  let foundOrder = order;
  if (!foundOrder && orderId.length === 24) {
    try {
      foundOrder = await Order.findById(orderId).populate('userId', 'email');
    } catch (e) { }
  }

  if (!foundOrder) {
    return next(new AppError('Order not found', 404));
  }

  // Security Check: Verify Email matches Order Owner
  if (!foundOrder.userId || foundOrder.userId.email.toLowerCase() !== email.toLowerCase()) {
    return next(new AppError('Order details do not match provided email', 403));
  }

  res.status(200).json({
    success: true,
    data: {
      status: {
        id: foundOrder.orderId || foundOrder._id, // Return the ID we have
        state: foundOrder.status,
        date: foundOrder.updatedAt,
        paymentStatus: foundOrder.paymentStatus,
        totalAmount: foundOrder.totalAmount
      }
    },
  });
});

