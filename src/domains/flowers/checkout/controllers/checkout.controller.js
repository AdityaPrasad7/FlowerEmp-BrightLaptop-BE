/**
 * Checkout Controller (Flowers Domain)
 * Handles checkout process - converts cart to order
 */
import Cart from '../../cart/models/Cart.model.js';
import Order from '../../order/models/Order.model.js';
import Product from '../../product/models/Product.model.js';
import { AppError, asyncHandler } from '../../../../shared/common/utils/errorHandler.js';
import { calculateOrderTotal } from '../../product/services/pricing.service.js';

/**
 * @route   POST /api/flowers/cart/checkout
 * @desc    Checkout cart - convert cart to order
 * @access  Private
 */
export const checkout = asyncHandler(async (req, res, next) => {
  const {
    shippingAddress,
    billingAddress,
    paymentMethod,
    notes,
    deliveryDate,
    timeSlot,
  } = req.body;

  // Get user's cart
  const cart = await Cart.findOne({ userId: req.user._id }).populate(
    'items.productId'
  );

  if (!cart || !cart.items || cart.items.length === 0) {
    return next(new AppError('Cart is empty', 400));
  }

  // Derive order type from user role
  const orderType = req.user.role === 'B2B_BUYER' ? 'B2B' : 'B2C';

  // Validate all items
  const orderItems = [];
  const productIds = cart.items.map((item) => item.productId._id);

  // Fetch all products to validate
  const products = await Product.find({
    _id: { $in: productIds },
    isActive: true,
  });

  if (products.length !== productIds.length) {
    return next(new AppError('One or more products not found or inactive', 404));
  }

  // Validate each cart item
  for (const cartItem of cart.items) {
    const product = products.find(
      (p) => p._id.toString() === cartItem.productId._id.toString()
    );

    if (!product) {
      return next(new AppError(`Product ${cartItem.productId._id} not found`, 404));
    }

    // Check stock availability
    if (product.stock < cartItem.quantity) {
      return next(
        new AppError(
          `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${cartItem.quantity}`,
          400
        )
      );
    }

    // Prepare order item (use prices from cart)
    orderItems.push({
      productId: product._id,
      quantity: cartItem.quantity,
      priceAtPurchase: cartItem.unitPrice,
    });
  }

  // Calculate total amount
  const totalAmount = calculateOrderTotal(orderItems);

  // Determine status based on payment method
  // B2B is always PENDING until approved by admin
  // B2C: COD -> APPROVED (Stock deducted immediately)
  // B2C: Online -> PENDING (Stock deducted after payment success)
  let initialStatus = 'PENDING';
  if (orderType === 'B2C' && paymentMethod === 'COD') {
    initialStatus = 'APPROVED';
  }

  // Use billing address if provided, otherwise use shipping address
  const finalBillingAddress = billingAddress || shippingAddress;

  // Create order
  const order = await Order.create({
    userId: req.user._id,
    products: orderItems,
    orderType,
    status: initialStatus,
    totalAmount,
    shippingAddress: shippingAddress || undefined,
    billingAddress: finalBillingAddress || undefined,
    paymentMethod,
    paymentStatus: 'PENDING',
    notes: notes || '',
    deliveryDate,
    timeSlot,
  });

  // Update product stock ONLY if order is immediately APPROVED (e.g. COD)
  if (initialStatus === 'APPROVED') {
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity },
      });
    }
  }

  // Clear cart after successful checkout
  cart.items = [];
  cart.totalAmount = 0;
  await cart.save();

  // Populate product details for response
  await order.populate('products.productId', 'name description');

  res.status(201).json({
    success: true,
    data: {
      order,
    },
    message: 'Order placed successfully',
  });
});


