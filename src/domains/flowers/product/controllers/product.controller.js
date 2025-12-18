/**
 * Product Controller (Flowers Domain)
 * Handles product CRUD operations
 */
import Product from '../models/Product.model.js';
import UserModel from '../../auth/models/User.model.js';
import { AppError, asyncHandler } from '../../../../shared/common/utils/errorHandler.js';

// Ensure User model is initialized on flowers connection before using Product.populate()
// Access UserModel to trigger Proxy getter which registers User on flowers connection
try {
  void UserModel.modelName;
} catch (e) {
  // User model will be registered when needed
}

/**
 * @route   POST /api/flowers/products
 * @desc    Create a new product
 * @access  Private (Seller/Admin only)
 */
export const createProduct = asyncHandler(async (req, res, next) => {
  const { name, description, basePrice, stock, category } = req.body;

  // Validate required fields
  if (!name || basePrice === undefined || stock === undefined || !category) {
    return next(new AppError('Please provide name, basePrice, stock, and category', 400));
  }

  // Normalize category: trim and lowercase
  const normalizedCategory = category.trim().toLowerCase();

  // Create product
  const product = await Product.create({
    name,
    description: description || '',
    basePrice,
    stock,
    category: normalizedCategory,
    sellerId: req.user._id,
  });

  res.status(201).json({
    success: true,
    data: {
      product,
    },
  });
});

/**
 * @route   GET /api/flowers/products
 * @desc    Get all products
 * @access  Public
 */
export const getProducts = asyncHandler(async (req, res, next) => {
  const { sellerId, isActive, category } = req.query;

  // Build query
  const query = {};
  if (sellerId) {
    query.sellerId = sellerId;
  }
  // Default to showing only active products if isActive not specified
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  } else {
    // By default, only show active products (exclude deleted ones)
    query.isActive = true;
  }
  // Filter by category (case-insensitive)
  if (category) {
    query.category = category.trim().toLowerCase();
  }

  const products = await Product.find(query)
    .populate('sellerId', 'name email companyName')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: products.length,
    data: {
      products,
    },
  });
});

/**
 * @route   GET /api/flowers/products/:id
 * @desc    Get single product
 * @access  Public
 */
export const getProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate(
    'sellerId',
    'name email companyName'
  );

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  // Note: Deleted products (isActive: false) can still be accessed by direct ID
  // This allows viewing deleted products if needed, but they won't appear in list

  res.status(200).json({
    success: true,
    data: {
      product,
    },
  });
});

/**
 * @route   PUT /api/flowers/products/:id
 * @desc    Update product
 * @access  Private (Seller/Admin only)
 */
export const updateProduct = asyncHandler(async (req, res, next) => {
  const { name, description, basePrice, stock, isActive, category } = req.body;

  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  // Check if user is the seller or admin
  if (
    product.sellerId.toString() !== req.user._id.toString() &&
    req.user.role !== 'ADMIN'
  ) {
    return next(
      new AppError('Not authorized to update this product', 403)
    );
  }

  // Update fields
  if (name !== undefined) product.name = name;
  if (description !== undefined) product.description = description;
  if (basePrice !== undefined) product.basePrice = basePrice;
  if (stock !== undefined) product.stock = stock;
  if (isActive !== undefined) product.isActive = isActive;
  // Normalize category if provided
  if (category !== undefined) {
    product.category = category.trim().toLowerCase();
  }

  await product.save();

  res.status(200).json({
    success: true,
    data: {
      product,
    },
  });
});

/**
 * @route   DELETE /api/flowers/products/:id
 * @desc    Delete product (soft delete by setting isActive to false)
 * @access  Private (Seller/Admin only)
 */
export const deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  // Check if user is the seller or admin
  if (
    product.sellerId.toString() !== req.user._id.toString() &&
    req.user.role !== 'ADMIN'
  ) {
    return next(
      new AppError('Not authorized to delete this product', 403)
    );
  }

  // Check if already deleted
  if (!product.isActive) {
    return res.status(200).json({
      success: true,
      message: 'Product is already deleted',
      data: {
        product: {
          _id: product._id,
          name: product.name,
          isActive: false,
        },
      },
    });
  }

  // Soft delete - set isActive to false
  product.isActive = false;
  await product.save();

  res.status(200).json({
    success: true,
    message: 'Product deleted successfully',
    data: {
      product: {
        _id: product._id,
        name: product.name,
        isActive: false,
      },
    },
  });
});

/**
 * @route   GET /api/flowers/products/categories/list
 * @desc    Get all unique categories from products
 * @access  Public
 */
export const getAllCategories = asyncHandler(async (req, res, next) => {
  // Get distinct categories from active products only
  const categories = await Product.distinct('category', { isActive: true });

  // Sort categories alphabetically
  const sortedCategories = categories.sort();

  res.status(200).json({
    success: true,
    count: sortedCategories.length,
    data: {
      categories: sortedCategories,
    },
  });
});

/**
 * @route   GET /api/flowers/categories/:categoryName/products
 * @desc    Get all products from a specific category
 * @access  Public
 */
export const getProductsByCategory = asyncHandler(async (req, res, next) => {
  const { categoryName } = req.params;
  const { sellerId, isActive } = req.query;

  // Normalize category name (trim and lowercase)
  const normalizedCategory = categoryName.trim().toLowerCase();

  // Build query
  const query = {
    category: normalizedCategory,
  };

  if (sellerId) {
    query.sellerId = sellerId;
  }
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  } else {
    query.isActive = true; // Default to active products only
  }

  const products = await Product.find(query)
    .populate('sellerId', 'name email companyName')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: products.length,
    data: {
      category: normalizedCategory,
      products,
    },
  });
});


