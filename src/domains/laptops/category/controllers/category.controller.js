/**
 * Category Controller (Laptops Domain)
 * Handles category CRUD operations
 */
import Category from '../models/Category.model.js';
import { AppError, asyncHandler } from '../../../../shared/common/utils/errorHandler.js';

/**
 * @route   POST /api/laptops/categories
 * @desc    Create a new category
 * @access  Private (Admin/Seller only)
 */
export const createCategory = asyncHandler(async (req, res, next) => {
  const { name, type, description } = req.body;

  // Check if category with same name already exists
  const existingCategory = await Category.findOne({
    $or: [
      { name: { $regex: new RegExp(`^${name}$`, 'i') } },
      { slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }
    ]
  });

  if (existingCategory) {
    return next(new AppError('Category with this name already exists', 400));
  }

  // Create category
  // Generate slug
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const category = await Category.create({
    name,
    slug,
    type,
    description: description || '',
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    data: {
      category,
    },
  });
});

/**
 * @route   GET /api/laptops/categories
 * @desc    Get all categories (with optional filtering)
 * @access  Public
 */
export const getCategories = asyncHandler(async (req, res, next) => {
  const { type, isActive } = req.query;

  // Build query
  const query = {};
  if (type) {
    query.type = type;
  }
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  } else {
    query.isActive = true; // Default to active categories only
  }

  const categories = await Category.find(query)
    .populate('createdBy', 'name email')
    .sort({ type: 1, name: 1 });

  res.status(200).json({
    success: true,
    count: categories.length,
    data: {
      categories,
    },
  });
});

/**
 * @route   GET /api/laptops/categories/:id
 * @desc    Get single category
 * @access  Public
 */
export const getCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id).populate(
    'createdBy',
    'name email'
  );

  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      category,
    },
  });
});

/**
 * @route   GET /api/laptops/categories/slug/:slug
 * @desc    Get category by slug
 * @access  Public
 */
export const getCategoryBySlug = asyncHandler(async (req, res, next) => {
  const category = await Category.findOne({ slug: req.params.slug }).populate(
    'createdBy',
    'name email'
  );

  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      category,
    },
  });
});

/**
 * @route   PUT /api/laptops/categories/:id
 * @desc    Update category
 * @access  Private (Admin/Seller only)
 */
export const updateCategory = asyncHandler(async (req, res, next) => {
  const { name, type, description, isActive } = req.body;

  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  // Check if user is admin or the creator
  if (req.user.role !== 'ADMIN' && category.createdBy.toString() !== req.user._id.toString()) {
    return next(
      new AppError('Not authorized to update this category', 403)
    );
  }

  // Check if name change would conflict with existing category
  if (name && name !== category.name) {
    const existingCategory = await Category.findOne({
      _id: { $ne: req.params.id },
      $or: [
        { name: { $regex: new RegExp(`^${name}$`, 'i') } },
        { slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }
      ]
    });

    if (existingCategory) {
      return next(new AppError('Category with this name already exists', 400));
    }
  }

  // Update fields
  if (name !== undefined) category.name = name;
  if (type !== undefined) category.type = type;
  if (description !== undefined) category.description = description;
  if (isActive !== undefined) category.isActive = isActive;

  // Regenerate slug if name changed
  if (name && name !== category.name) {
    category.slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  await category.save();

  res.status(200).json({
    success: true,
    data: {
      category,
    },
  });
});

/**
 * @route   DELETE /api/laptops/categories/:id
 * @desc    Delete category and all its products (hard delete)
 * @access  Private (Admin only)
 */
export const deleteCategory = asyncHandler(async (req, res, next) => {
  // SELLER and ADMIN can delete categories and products
  if (req.user.role !== 'ADMIN' && req.user.role !== 'SELLER') {
    return next(new AppError('Only sellers and administrators can delete categories', 403));
  }

  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  // Import Product model
  const Product = (await import('../../product/models/Product.model.js')).default;

  // Check database connection
  const { isConnected } = await import('../../../../shared/infrastructure/database/connections.js');
  if (!isConnected('laptops')) {
    return next(new AppError('Database connection not ready', 503));
  }

  // Delete all products with this category
  const deleteResult = await Product.deleteMany({
    category: category._id
  });

  // Delete the category itself
  await Category.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: `Category "${category.name}" and ${deleteResult.deletedCount} product(s) deleted successfully`,
    data: {
      category: {
        _id: category._id,
        name: category.name,
      },
      deletedProductsCount: deleteResult.deletedCount,
    },
  });
});

/**
 * @route   DELETE /api/laptops/categories/name/:categoryName
 * @desc    Delete category by name and all its products (hard delete)
 * @access  Private (Admin only)
 */
export const deleteCategoryByName = asyncHandler(async (req, res, next) => {
  // SELLER and ADMIN can delete categories and products
  if (req.user.role !== 'ADMIN' && req.user.role !== 'SELLER') {
    return next(new AppError('Only sellers and administrators can delete categories', 403));
  }

  const { categoryName } = req.params;

  // Check database connection
  const { isConnected } = await import('../../../../shared/infrastructure/database/connections.js');
  if (!isConnected('laptops')) {
    return next(new AppError('Database connection not ready', 503));
  }

  // Import Product model
  const Product = (await import('../../product/models/Product.model.js')).default;

  // Normalize category name
  const normalizedCategoryName = categoryName.trim().toLowerCase().replace(/-/g, ' ');

  // Check if category exists in Category model
  const category = await Category.findOne({
    $or: [
      { name: { $regex: new RegExp(`^${normalizedCategoryName}$`, 'i') } },
      { slug: normalizedCategoryName.replace(/\s+/g, '-') }
    ]
  });

  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  // Delete all products with this category
  const deleteResult = await Product.deleteMany({
    category: category._id
  });

  // Delete the category itself
  await Category.findByIdAndDelete(category._id);

  res.status(200).json({
    success: true,
    message: `Category "${normalizedCategoryName}" and ${deleteResult.deletedCount} product(s) deleted successfully`,
    data: {
      category: category ? {
        _id: category._id,
        name: category.name,
      } : {
        name: normalizedCategoryName,
      },
      deletedProductsCount: deleteResult.deletedCount,
    },
  });
});

/**
 * @route   GET /api/laptops/categories/types/list
 * @desc    Get all category types
 * @access  Public
 */
export const getCategoryTypes = asyncHandler(async (req, res, next) => {
  res.status(200).json({
    success: true,
    data: {
      types: [
        {
          value: 'CONDITION',
          label: 'Condition',
          description: 'Product condition (e.g., New, Pre-owned)',
        },
        {
          value: 'USE_CASE',
          label: 'Use Case',
          description: 'Ideal for use cases (e.g., Business, Gaming, Coders)',
        },
        {
          value: 'BRAND',
          label: 'Brand',
          description: 'Product brand (e.g., Dell, Apple, HP)',
        },
      ],
    },
  });
});

