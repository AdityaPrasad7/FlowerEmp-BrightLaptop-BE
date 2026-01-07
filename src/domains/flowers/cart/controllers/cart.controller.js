/**
 * Cart Controller (Flowers Domain)
 * Handles shopping cart operations...
 */
import Cart from '../models/Cart.model.js';
import Product from '../../product/models/Product.model.js';
import {
  AppError,
  asyncHandler
} from '../../../../shared/common/utils/errorHandler.js';
import {
  broadcastEvent
} from '../../../../shared/common/utils/socketService.js';
import { calculateUnitPrice, calculateItemTotal } from '../../product/services/pricing.service.js';

/**
 * @route   POST /api/flowers/cart/add
 * @desc    Add product to cart or update quantity
 * @access  Private
 */
export const addToCart = asyncHandler(async (req, res, next) => {
  const { productId, quantity } = req.body;

  // Validate required fields
  if (!productId || !quantity) {
    return next(new AppError('Please provide productId and quantity', 400));
  }

  if (quantity < 1) {
    return next(new AppError('Quantity must be at least 1', 400));
  }

  // Debug: Log user ID to verify consistency
  console.log('Adding to cart for userId:', req.user._id.toString());
  console.log('User email:', req.user.email);
  console.log("came here in cart");

  // Find or create cart for user
  let cart = await Cart.findOne({ userId: req.user._id });
  console.log("came here in cart 111");


  // Debug: Log cart status
  if (cart) {
    console.log('Cart found with', cart.items.length, 'items');
  } else {
    console.log('No cart found, creating new cart');
  }

  if (!cart) {
    cart = await Cart.create({
      userId: req.user._id,
      items: [],
      totalAmount: 0,
    });
  }

  // Fetch product
  const product = await Product.findById(productId);

  if (!product || !product.isActive) {
    return next(new AppError('Product not found or inactive', 404));
  }

  // Check stock availability
  if (product.stock < quantity) {
    return next(
      new AppError(
        `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}`,
        400
      )
    );
  }

  // Calculate unit price (simple - always base price for flowers)
  const unitPrice = calculateUnitPrice(
    product.basePrice,
    quantity,
    req.user.role
  );

  const totalPrice = unitPrice * quantity;

  // Check if product already in cart
  const existingItemIndex = cart.items.findIndex(
    (item) => item.productId.toString() === productId.toString()
  );

  if (existingItemIndex > -1) {
    // Update existing item
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;

    // Re-check stock with new total quantity
    if (product.stock < newQuantity) {
      return next(
        new AppError(
          `Insufficient stock. You already have ${cart.items[existingItemIndex].quantity} in cart. Available: ${product.stock}`,
          400
        )
      );
    }

    // Recalculate price with new quantity
    const newUnitPrice = calculateUnitPrice(
      product.basePrice,
      newQuantity,
      req.user.role
    );

    cart.items[existingItemIndex].quantity = newQuantity;
    cart.items[existingItemIndex].unitPrice = newUnitPrice;
    cart.items[existingItemIndex].totalPrice = newUnitPrice * newQuantity;
  } else {
    // Add new item
    cart.items.push({
      productId: product._id,
      quantity,
      unitPrice,
      totalPrice,
    });
  }

  // Recalculate cart total
  cart.calculateTotal();
  cart.adminNotified = false;
  await cart.save();

  // Populate product details
  await cart.populate('items.productId', 'name description basePrice images');

  res.status(200).json({
    success: true,
    data: {
      cart,
    },
    message: 'Product added to cart successfully',
  });
});

/**
 * @route   GET /api/flowers/cart
 * @desc    Get user's cart
 * @access  Private
 */
export const getCart = asyncHandler(async (req, res, next) => {
  // Debug: Log user ID to verify consistency
  console.log('Getting cart for userId:', req.user._id.toString());
  console.log('User email:', req.user.email);

  let cart = await Cart.findOne({ userId: req.user._id }).populate(
    'items.productId',
    'name description basePrice stock isActive images'
  );

  // Debug: Log cart status
  if (cart) {
    console.log('Cart found with', cart.items.length, 'items');
  } else {
    console.log('No cart found, creating new empty cart');
  }

  // Create empty cart if doesn't exist
  if (!cart) {
    cart = await Cart.create({
      userId: req.user._id,
      items: [],
      totalAmount: 0,
    });
  } else {
    // Recalculate prices based on current user role and update cart
    // This ensures prices are always current
    let cartUpdated = false;

    // Filter out inactive or deleted products (safer approach - don't modify while iterating)
    const validItems = [];
    for (const item of cart.items) {
      const product = item.productId;

      // Skip inactive or deleted products
      if (!product || !product.isActive) {
        console.log('Removing inactive product from cart:', product?._id || 'unknown');
        cartUpdated = true;
        continue;
      }

      // Calculate new price
      const newUnitPrice = calculateUnitPrice(
        product.basePrice,
        item.quantity,
        req.user.role
      );

      // Update price if changed
      if (newUnitPrice !== item.unitPrice) {
        item.unitPrice = newUnitPrice;
        item.totalPrice = newUnitPrice * item.quantity;
        cartUpdated = true;
      }

      validItems.push(item);
    }

    // Update cart items if any were removed
    if (cart.items.length !== validItems.length) {
      cart.items = validItems;
      cartUpdated = true;
    }

    if (cartUpdated) {
      cart.calculateTotal();
      await cart.save();
      console.log('Cart updated - items count:', cart.items.length);
    }
  }

  res.status(200).json({
    success: true,
    data: {
      cart,
    },
  });
});

/**
 * @route   PUT /api/flowers/cart/update
 * @desc    Update cart item quantity
 * @access  Private
 */
export const updateCartItem = asyncHandler(async (req, res, next) => {
  const { productId, quantity } = req.body;

  if (!productId || quantity === undefined) {
    return next(new AppError('Please provide productId and quantity', 400));
  }

  if (quantity < 1) {
    return next(new AppError('Quantity must be at least 1', 400));
    // Note: To remove item, use DELETE endpoint instead
  }

  const cart = await Cart.findOne({ userId: req.user._id });

  if (!cart) {
    return next(new AppError('Cart not found', 404));
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.productId.toString() === productId.toString()
  );

  if (itemIndex === -1) {
    return next(new AppError('Product not found in cart', 404));
  }

  // Fetch product
  const product = await Product.findById(productId);

  if (!product || !product.isActive) {
    return next(new AppError('Product not found or inactive', 404));
  }

  // Check stock
  if (product.stock < quantity) {
    return next(
      new AppError(
        `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}`,
        400
      )
    );
  }

  // Recalculate price with new quantity
  const unitPrice = calculateUnitPrice(
    product.basePrice,
    quantity,
    req.user.role
  );

  // Update item
  cart.items[itemIndex].quantity = quantity;
  cart.items[itemIndex].unitPrice = unitPrice;
  cart.items[itemIndex].totalPrice = unitPrice * quantity;

  // Recalculate cart total
  cart.calculateTotal();
  await cart.save();

  await cart.populate('items.productId', 'name description basePrice b2bPrice moq images');

  res.status(200).json({
    success: true,
    data: {
      cart,
    },
    message: 'Cart updated successfully',
  });
});

/**
 * @route   DELETE /api/flowers/cart/remove/:productId
 * @desc    Remove product from cart
 * @access  Private
 */
export const removeFromCart = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;

  const cart = await Cart.findOne({ userId: req.user._id });

  if (!cart) {
    return next(new AppError('Cart not found', 404));
  }

  const initialLength = cart.items.length;
  cart.items = cart.items.filter(
    (item) => item.productId.toString() !== productId.toString()
  );

  if (cart.items.length === initialLength) {
    return next(new AppError('Product not found in cart', 404));
  }

  // Recalculate cart total
  cart.calculateTotal();
  await cart.save();

  await cart.populate('items.productId', 'name description basePrice b2bPrice moq images');

  res.status(200).json({
    success: true,
    data: {
      cart,
    },
    message: 'Product removed from cart',
  });
});

/**
 * @route   DELETE /api/flowers/cart/clear
 * @desc    Clear entire cart
 * @access  Private
 */
export const clearCart = asyncHandler(async (req, res, next) => {
  const cart = await Cart.findOne({ userId: req.user._id });

  if (!cart) {
    return next(new AppError('Cart not found', 404));
  }

  cart.items = [];
  cart.totalAmount = 0;
  await cart.save();
  broadcastEvent('cart_updated', { cartId: cart._id });

  res.status(200).json({
    success: true,
    message: 'Cart cleared successfully',
    data: {
      cart,
    },
  });
});

/**
 * @route   GET /api/flowers/cart/abandoned
 * @desc    Get abandoned carts (Admin only)
 * @access  Private (Admin only)
 */
export const getAbandonedCarts = asyncHandler(async (req, res, next) => {
  // Define "Abandoned" as not updated in the last 2 hours
  const twoHoursAgo = new Date(Date.now() - 1 * 60 * 1000);
  // const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const abandonedCarts = await Cart.find({
    updatedAt: { $lt: twoHoursAgo },
    'items.0': { $exists: true } // Check if items array is not empty
  })
    .populate('userId', 'name email phone')
    .populate('items.productId', 'name basePrice images')
    .sort({ updatedAt: -1 });

  res.status(200).json({
    success: true,
    count: abandonedCarts.length,
    data: {
      carts: abandonedCarts,
    },
  });
});

/**
 * @route   POST /api/flowers/cart/recover/:cartId
 * @desc    Send recovery email to user
 * @access  Private (Admin only)
 */
export const sendRecoveryEmail = asyncHandler(async (req, res, next) => {
  const { cartId } = req.params;

  const cart = await Cart.findById(cartId)
    .populate('userId', 'name email phone')
    .populate('items.productId', 'name basePrice images');

  if (!cart) {
    return next(new AppError('Cart not found', 404));
  }

  if (!cart.userId || !cart.userId.email) {
    return next(new AppError('User email not found', 400));
  }

  const user = cart.userId;
  const { sendEmail } = await import('../../../../shared/common/utils/emailService.js');

  const productRows = cart.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        <img src="${item.productId.images?.[0] || 'https://placehold.co/40x40'}" alt="${item.productId.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        <strong>${item.productId.name}</strong>
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
        ${item.quantity}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
        ${item.totalPrice.toFixed(3)} KD
      </td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #E11D48;">You left something behind! 🌸</h2>
      <p>Hi ${user.name},</p>
      <p>We noticed you left some beautiful items in your cart. They are saved and waiting for you!</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 10px; text-align: left;">Image</th>
            <th style="padding: 10px; text-align: left;">Product</th>
            <th style="padding: 10px; text-align: center;">Qty</th>
            <th style="padding: 10px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${productRows}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 15px; text-align: right; font-weight: bold;">Total:</td>
            <td style="padding: 15px; text-align: right; font-weight: bold; color: #E11D48;">${cart.totalAmount.toFixed(3)} KD</td>
          </tr>
        </tfoot>
      </table>
  
      
      <p style="margin-top: 30px; font-size: 12px; color: #888;">If you have any questions, reply to this email.</p>
    </div>
  `;


  // href="http://localhost:5174/cart"

  // <div style="text-align: center; margin-top: 30px;">
  //   <a  href=# style="background-color: #E11D48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Complete Your Purchase</a>
  // </div>

  await sendEmail({
    to: user.email,
    subject: 'Complete your purchase at Flower Emporium',
    html,
  });

  res.status(200).json({
    success: true,
    message: 'Recovery email sent successfully',
  });
});
