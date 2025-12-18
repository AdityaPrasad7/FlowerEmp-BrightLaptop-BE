/**
 * Cart Controller (Laptops Domain)
 * Handles shopping cart operations with MOQ, bulk pricing, and B2B pricing
 */
import Cart from '../models/Cart.model.js';
import Product from '../../product/models/Product.model.js';
import { AppError, asyncHandler } from '../../../../shared/common/utils/errorHandler.js';
import { calculateUnitPrice } from '../../product/services/pricing.service.js';

/**
 * @route   POST /api/laptops/cart/add
 * @desc    Add product to cart or update quantity
 * @access  Private
 */
export const addToCart = asyncHandler(async (req, res, next) => {
  const { productId, quantity } = req.body;

  if (!productId || !quantity) {
    return next(new AppError('Please provide productId and quantity', 400));
  }

  if (quantity < 1) {
    return next(new AppError('Quantity must be at least 1', 400));
  }

  let cart = await Cart.findOne({ userId: req.user._id });

  if (!cart) {
    cart = await Cart.create({
      userId: req.user._id,
      items: [],
      totalAmount: 0,
    });
  }

  const product = await Product.findById(productId);

  if (!product || !product.isActive) {
    return next(new AppError('Product not found or inactive', 404));
  }

  if (product.stock < quantity) {
    return next(
      new AppError(
        `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}`,
        400
      )
    );
  }

  const unitPrice = calculateUnitPrice(
    product.basePrice,
    quantity,
    req.user.role,
    product.b2bPrice || null,
    product.moq || 1,
    product.bulkPricing || []
  );

  const totalPrice = unitPrice * quantity;

  const existingItemIndex = cart.items.findIndex(
    (item) => item.productId.toString() === productId.toString()
  );

  if (existingItemIndex > -1) {
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;

    if (product.stock < newQuantity) {
      return next(
        new AppError(
          `Insufficient stock. You already have ${cart.items[existingItemIndex].quantity} in cart. Available: ${product.stock}`,
          400
        )
      );
    }

    const newUnitPrice = calculateUnitPrice(
      product.basePrice,
      newQuantity,
      req.user.role,
      product.b2bPrice || null,
      product.moq || 1,
      product.bulkPricing || []
    );

    cart.items[existingItemIndex].quantity = newQuantity;
    cart.items[existingItemIndex].unitPrice = newUnitPrice;
    cart.items[existingItemIndex].totalPrice = newUnitPrice * newQuantity;
  } else {
    cart.items.push({
      productId: product._id,
      quantity,
      unitPrice,
      totalPrice,
    });
  }

  cart.calculateTotal();
  await cart.save();

  await cart.populate('items.productId', 'name description basePrice b2bPrice moq');

  res.status(200).json({
    success: true,
    data: {
      cart,
    },
    message: 'Product added to cart successfully',
  });
});

/**
 * @route   GET /api/laptops/cart
 * @desc    Get user's cart
 * @access  Private
 */
export const getCart = asyncHandler(async (req, res, next) => {
  let cart = await Cart.findOne({ userId: req.user._id }).populate(
    'items.productId',
    'name description basePrice b2bPrice moq stock isActive'
  );

  if (!cart) {
    cart = await Cart.create({
      userId: req.user._id,
      items: [],
      totalAmount: 0,
    });
  } else {
    let cartUpdated = false;
    const validItems = [];
    
    for (const item of cart.items) {
      const product = item.productId;
      
      if (!product || !product.isActive) {
        cartUpdated = true;
        continue;
      }

      const newUnitPrice = calculateUnitPrice(
        product.basePrice,
        item.quantity,
        req.user.role,
        product.b2bPrice || null,
        product.moq || 1,
        product.bulkPricing || []
      );

      if (newUnitPrice !== item.unitPrice) {
        item.unitPrice = newUnitPrice;
        item.totalPrice = newUnitPrice * item.quantity;
        cartUpdated = true;
      }
      
      validItems.push(item);
    }

    if (cart.items.length !== validItems.length) {
      cart.items = validItems;
      cartUpdated = true;
    }

    if (cartUpdated) {
      cart.calculateTotal();
      await cart.save();
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
 * @route   PUT /api/laptops/cart/update
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

  const product = await Product.findById(productId);

  if (!product || !product.isActive) {
    return next(new AppError('Product not found or inactive', 404));
  }

  if (product.stock < quantity) {
    return next(
      new AppError(
        `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}`,
        400
      )
    );
  }

  const unitPrice = calculateUnitPrice(
    product.basePrice,
    quantity,
    req.user.role,
    product.b2bPrice || null,
    product.moq || 1,
    product.bulkPricing || []
  );

  cart.items[itemIndex].quantity = quantity;
  cart.items[itemIndex].unitPrice = unitPrice;
  cart.items[itemIndex].totalPrice = unitPrice * quantity;

  cart.calculateTotal();
  await cart.save();

  await cart.populate('items.productId', 'name description basePrice b2bPrice moq');

  res.status(200).json({
    success: true,
    data: {
      cart,
    },
    message: 'Cart updated successfully',
  });
});

/**
 * @route   DELETE /api/laptops/cart/remove/:productId
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

  cart.calculateTotal();
  await cart.save();

  await cart.populate('items.productId', 'name description basePrice b2bPrice moq');

  res.status(200).json({
    success: true,
    data: {
      cart,
    },
    message: 'Product removed from cart',
  });
});

/**
 * @route   DELETE /api/laptops/cart/clear
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

  res.status(200).json({
    success: true,
    message: 'Cart cleared successfully',
    data: {
      cart,
    },
  });
});

