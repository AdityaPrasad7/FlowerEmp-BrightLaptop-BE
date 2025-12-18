/**
 * Product Controller (Laptops Domain)
 * Handles product CRUD operations with MOQ, bulk pricing, and B2B pricing
 */
import Product from '../models/Product.model.js';
import Category from '../../category/models/Category.model.js';
import { AppError, asyncHandler } from '../../../../shared/common/utils/errorHandler.js';

/**
 * @route   POST /api/laptops/products
 * @desc    Create a new product
 * @access  Private (Seller/Admin only)
 */
export const createProduct = asyncHandler(async (req, res, next) => {
  const {
    name,
    description,
    basePrice,
    b2bPrice,
    moq,
    bulkPricing,
    stock,
    conditionCategory,
    useCaseCategories,
    brandCategory,
    images,
    rating,
  } = req.body;

  // Validate required fields
  if (!name || basePrice === undefined || stock === undefined) {
    return next(new AppError('Please provide name, basePrice, and stock', 400));
  }

  // Validate categories if provided
  if (conditionCategory) {
    const category = await Category.findById(conditionCategory);
    if (!category || category.type !== 'CONDITION') {
      return next(new AppError('Invalid condition category', 400));
    }
  }

  if (brandCategory) {
    const category = await Category.findById(brandCategory);
    if (!category || category.type !== 'BRAND') {
      return next(new AppError('Invalid brand category', 400));
    }
  }

  if (useCaseCategories && Array.isArray(useCaseCategories) && useCaseCategories.length > 0) {
    const categories = await Category.find({ _id: { $in: useCaseCategories } });
    if (categories.length !== useCaseCategories.length) {
      return next(new AppError('One or more use case categories not found', 400));
    }
    const invalidCategories = categories.filter(cat => cat.type !== 'USE_CASE');
    if (invalidCategories.length > 0) {
      return next(new AppError('All use case categories must be of type USE_CASE', 400));
    }
  }

  // Create product
  const product = await Product.create({
    name,
    description: description || '',
    basePrice,
    b2bPrice: b2bPrice || undefined,
    moq: moq || 1,
    bulkPricing: bulkPricing || [],
    stock,
    sellerId: req.user._id,
    conditionCategory: conditionCategory || undefined,
    useCaseCategories: useCaseCategories || [],
    brandCategory: brandCategory || undefined,
    images: images || [],
    rating: rating || 0,
  });

  // Populate categories before returning
  await product.populate([
    { path: 'conditionCategory', select: 'name slug type' },
    { path: 'useCaseCategories', select: 'name slug type' },
    { path: 'brandCategory', select: 'name slug type' },
    { path: 'sellerId', select: 'name email companyName' },
  ]);

  res.status(201).json({
    success: true,
    data: {
      product,
    },
  });
});

/**
 * @route   GET /api/laptops/products
 * @desc    Get all products
 * @access  Public
 */
export const getProducts = asyncHandler(async (req, res, next) => {
  const {
    sellerId,
    isActive,
    conditionCategory,
    useCaseCategory,
    brandCategory,
    search,
    minPrice,
    maxPrice,
    newArrivals, // Filter for new arrivals (days, e.g., 7, 14, 30)
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  // Build query
  const query = {};
  if (sellerId) {
    query.sellerId = sellerId;
  }
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  } else {
    query.isActive = true;
  }

  // Category filters
  if (conditionCategory) {
    query.conditionCategory = conditionCategory;
  }
  if (useCaseCategory) {
    query.useCaseCategories = useCaseCategory;
  }
  if (brandCategory) {
    query.brandCategory = brandCategory;
  }

  // Search filter
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  // Price filters
  if (minPrice || maxPrice) {
    query.basePrice = {};
    if (minPrice) {
      query.basePrice.$gte = parseFloat(minPrice);
    }
    if (maxPrice) {
      query.basePrice.$lte = parseFloat(maxPrice);
    }
  }

  // New Arrivals filter (products added in last N days)
  if (newArrivals) {
    const days = parseInt(newArrivals, 10);
    if (!isNaN(days) && days > 0) {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);
      query.createdAt = { $gte: dateThreshold };
    }
  }

  // Sort options
  const sortOptions = {};
  const validSortFields = ['createdAt', 'name', 'basePrice', 'rating', 'stock'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;

  const products = await Product.find(query)
    .populate('sellerId', 'name email companyName')
    .populate('conditionCategory', 'name slug type')
    .populate('useCaseCategories', 'name slug type')
    .populate('brandCategory', 'name slug type')
    .sort(sortOptions);

  res.status(200).json({
    success: true,
    count: products.length,
    data: {
      products,
    },
  });
});

/**
 * @route   GET /api/laptops/products/:id
 * @desc    Get single product
 * @access  Public
 */
export const getProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id)
    .populate('sellerId', 'name email companyName')
    .populate('conditionCategory', 'name slug type')
    .populate('useCaseCategories', 'name slug type')
    .populate('brandCategory', 'name slug type');

  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      product,
    },
  });
});

/**
 * @route   PUT /api/laptops/products/:id
 * @desc    Update product
 * @access  Private (Seller/Admin only)
 */
export const updateProduct = asyncHandler(async (req, res, next) => {
  const {
    name,
    description,
    basePrice,
    b2bPrice,
    moq,
    bulkPricing,
    stock,
    isActive,
    conditionCategory,
    useCaseCategories,
    brandCategory,
    images,
    rating,
  } = req.body;

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

  // Validate categories if provided
  if (conditionCategory !== undefined) {
    if (conditionCategory) {
      const category = await Category.findById(conditionCategory);
      if (!category || category.type !== 'CONDITION') {
        return next(new AppError('Invalid condition category', 400));
      }
      product.conditionCategory = conditionCategory;
    } else {
      product.conditionCategory = undefined;
    }
  }

  if (brandCategory !== undefined) {
    if (brandCategory) {
      const category = await Category.findById(brandCategory);
      if (!category || category.type !== 'BRAND') {
        return next(new AppError('Invalid brand category', 400));
      }
      product.brandCategory = brandCategory;
    } else {
      product.brandCategory = undefined;
    }
  }

  if (useCaseCategories !== undefined) {
    if (Array.isArray(useCaseCategories) && useCaseCategories.length > 0) {
      const categories = await Category.find({ _id: { $in: useCaseCategories } });
      if (categories.length !== useCaseCategories.length) {
        return next(new AppError('One or more use case categories not found', 400));
      }
      const invalidCategories = categories.filter(cat => cat.type !== 'USE_CASE');
      if (invalidCategories.length > 0) {
        return next(new AppError('All use case categories must be of type USE_CASE', 400));
      }
      product.useCaseCategories = useCaseCategories;
    } else {
      product.useCaseCategories = [];
    }
  }

  // Update fields
  if (name !== undefined) product.name = name;
  if (description !== undefined) product.description = description;
  if (basePrice !== undefined) product.basePrice = basePrice;
  if (b2bPrice !== undefined) product.b2bPrice = b2bPrice;
  if (moq !== undefined) product.moq = moq;
  if (bulkPricing !== undefined) product.bulkPricing = bulkPricing;
  if (stock !== undefined) product.stock = stock;
  if (isActive !== undefined) product.isActive = isActive;
  if (images !== undefined) product.images = images;
  if (rating !== undefined) product.rating = rating;

  await product.save();

  // Populate categories before returning
  await product.populate([
    { path: 'conditionCategory', select: 'name slug type' },
    { path: 'useCaseCategories', select: 'name slug type' },
    { path: 'brandCategory', select: 'name slug type' },
    { path: 'sellerId', select: 'name email companyName' },
  ]);

  res.status(200).json({
    success: true,
    data: {
      product,
    },
  });
});

/**
 * @route   GET /api/laptops/products/new-arrivals
 * @desc    Get new arrivals (products added in last 30 days by default)
 * @access  Public
 */
export const getNewArrivals = asyncHandler(async (req, res, next) => {
  const { days = 30, limit = 50 } = req.query;
  
  const daysNum = parseInt(days, 10);
  const limitNum = parseInt(limit, 10);
  
  if (isNaN(daysNum) || daysNum <= 0) {
    return next(new AppError('Invalid days parameter', 400));
  }

  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - daysNum);

  const products = await Product.find({
    isActive: true,
    createdAt: { $gte: dateThreshold },
  })
    .populate('sellerId', 'name email companyName')
    .populate('conditionCategory', 'name slug type')
    .populate('useCaseCategories', 'name slug type')
    .populate('brandCategory', 'name slug type')
    .sort({ createdAt: -1 })
    .limit(limitNum > 0 && limitNum <= 100 ? limitNum : 50);

  res.status(200).json({
    success: true,
    count: products.length,
    data: {
      days: daysNum,
      products,
    },
  });
});

/**
 * @route   GET /api/laptops/products/category/:categorySlug
 * @desc    Get products by category slug
 * @access  Public
 */
export const getProductsByCategorySlug = asyncHandler(async (req, res, next) => {
  const { categorySlug } = req.params;
  const {
    sellerId,
    isActive,
    search,
    minPrice,
    maxPrice,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  // Find category by slug
  const category = await Category.findOne({ slug: categorySlug, isActive: true });

  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  // Build query based on category type
  const query = { isActive: true };
  
  if (sellerId) {
    query.sellerId = sellerId;
  }

  // Filter by category type
  switch (category.type) {
    case 'CONDITION':
      query.conditionCategory = category._id;
      break;
    case 'USE_CASE':
      query.useCaseCategories = category._id;
      break;
    case 'BRAND':
      query.brandCategory = category._id;
      break;
    default:
      return next(new AppError('Invalid category type', 400));
  }

  // Search filter
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  // Price filters
  if (minPrice || maxPrice) {
    query.basePrice = {};
    if (minPrice) {
      query.basePrice.$gte = parseFloat(minPrice);
    }
    if (maxPrice) {
      query.basePrice.$lte = parseFloat(maxPrice);
    }
  }

  // Sort options
  const sortOptions = {};
  const validSortFields = ['createdAt', 'name', 'basePrice', 'rating', 'stock'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;

  const products = await Product.find(query)
    .populate('sellerId', 'name email companyName')
    .populate('conditionCategory', 'name slug type')
    .populate('useCaseCategories', 'name slug type')
    .populate('brandCategory', 'name slug type')
    .sort(sortOptions);

  res.status(200).json({
    success: true,
    count: products.length,
    data: {
      category: {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        type: category.type,
      },
      products,
    },
  });
});

/**
 * @route   DELETE /api/laptops/products/:id
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

