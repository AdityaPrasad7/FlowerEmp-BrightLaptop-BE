/**
 * Checkout Controller (Laptops Domain)
 * Handles checkout process - converts cart to order with delivery scheduling
 */
import Cart from '../../cart/models/Cart.model.js';
import Order from '../../order/models/Order.model.js';
import Product from '../../product/models/Product.model.js';
import { AppError, asyncHandler } from '../../../../shared/common/utils/errorHandler.js';
import { calculateOrderTotal } from '../../product/services/pricing.service.js';

/**
 * @route   POST /api/laptops/cart/checkout
 * @desc    Checkout cart - convert cart to order with delivery scheduling
 * @access  Private
 */
export const checkout = asyncHandler(async (req, res, next) => {
  const {
    shippingAddress,
    billingAddress,
    contactEmail,
    contactPhone,
    paymentMethod,
    deliveryDate,
    deliveryTime,
    notes,
  } = req.body;

  const cart = await Cart.findOne({ userId: req.user._id }).populate(
    'items.productId'
  );

  if (!cart || !cart.items || cart.items.length === 0) {
    return next(new AppError('Cart is empty', 400));
  }

  const orderType = req.user.role === 'B2B_BUYER' ? 'B2B' : 'B2C';

  const orderItems = [];
  const productIds = cart.items.map((item) => item.productId._id);

  const products = await Product.find({
    _id: { $in: productIds },
    isActive: true,
  });

  if (products.length !== productIds.length) {
    return next(new AppError('One or more products not found or inactive', 404));
  }

  for (const cartItem of cart.items) {
    const product = products.find(
      (p) => p._id.toString() === cartItem.productId._id.toString()
    );

    if (!product) {
      return next(new AppError(`Product ${cartItem.productId._id} not found`, 404));
    }

    if (product.stock < cartItem.quantity) {
      return next(
        new AppError(
          `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${cartItem.quantity}`,
          400
        )
      );
    }

    orderItems.push({
      productId: product._id,
      quantity: cartItem.quantity,
      priceAtPurchase: cartItem.unitPrice,
    });
  }

  const totalAmount = calculateOrderTotal(orderItems);
  const defaultStatus = orderType === 'B2C' ? 'APPROVED' : 'PENDING';
  const finalBillingAddress = billingAddress || shippingAddress;

  const order = await Order.create({
    userId: req.user._id,
    products: orderItems,
    orderType,
    status: defaultStatus,
    totalAmount,
    shippingAddress,
    billingAddress: finalBillingAddress,
    contactEmail,
    contactPhone,
    paymentMethod,
    paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PENDING',
    deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
    deliveryTime,
    notes: notes || '',
  });

  if (defaultStatus === 'APPROVED') {
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity },
      });
    }
  }

  cart.items = [];
  cart.totalAmount = 0;
  await cart.save();

  await order.populate('products.productId', 'name description');

  res.status(201).json({
    success: true,
    data: {
      order,
    },
    message: 'Order placed successfully',
  });
});

