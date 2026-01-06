/**
 * Product Controller (Flowers Domain)
 * Handles product CRUD operations
 */
import Product from '../models/Product.model.js';
import UserModel from '../../auth/models/User.model.js';
import OccasionModel from '../../occasion/models/Occasion.model.js';
import { AppError, asyncHandler } from '../../../../shared/common/utils/errorHandler.js';
import { uploadMultipleImages } from '../../../../shared/common/utils/cloudinaryUpload.js';

// Ensure User and Occasion models are initialized on flowers connection before using Product.populate()
// Access models to trigger Proxy getter which registers them on flowers connection
try {
  void UserModel.modelName;
  void OccasionModel.modelName;
} catch (e) {
  // Models will be registered when needed
}

/**
 * @route   POST /api/flowers/products
 * @desc    Create a new product
 * @access  Private (Seller/Admin only)
 */
export const createProduct = asyncHandler(async (req, res, next) => {
  const { name, description, basePrice, stock, category, images } = req.body;
  console.log("body", req.body);


  // Validate required fields
  if (!name || basePrice === undefined || stock === undefined || !category) {
    return next(new AppError('Please provide name, basePrice, stock, and category', 400));
  }

  // Normalize category: trim only (Model expects capitalized Enum)
  const normalizedCategory = category.trim();

  // Handle image upload
  let imageUrls = images || [];

  // If images are provided as string (single URL), convert to array
  if (typeof imageUrls === 'string') {
    imageUrls = [imageUrls];
  } else if (!Array.isArray(imageUrls)) {
    imageUrls = [];
  }

  // Upload files to Cloudinary if present
  if (req.files && req.files.length > 0) {
    try {
      const uploadResults = await uploadMultipleImages(req.files, 'flowers/products');
      const uploadedUrls = uploadResults.map(result => result.secure_url);
      imageUrls = [...imageUrls, ...uploadedUrls];
    } catch (error) {
      console.error('Cloudinary Upload Error Details:', JSON.stringify(error, null, 2));
      console.error('Cloudinary Upload Error Message:', error.message);
      return next(new AppError('Failed to upload images: ' + error.message, 500));
    }
  }

  // Determine if flower specific fields should be included
  // Only include if category is Flowers
  const isFlower = normalizedCategory === 'Flowers';
  const { occasions, vip, flowerType, flowerArrangement, flowerColor } = req.body;

  if (!occasions || (Array.isArray(occasions) && occasions.length === 0)) {
    return next(new AppError('At least one Occasion is required', 400));
  }

  // Create product
  const product = await Product.create({
    name,
    description: description || '',
    basePrice,
    stock,

    category: normalizedCategory,
    occasions: Array.isArray(occasions) ? occasions : [occasions],
    vip: vip === 'true' || vip === true, // handle string or boolean
    flowerType: isFlower && flowerType ? flowerType : undefined,
    flowerArrangement: isFlower && flowerArrangement ? flowerArrangement : undefined,
    flowerColor: isFlower && flowerColor ? flowerColor : undefined,
    sellerId: req.user._id,
    images: imageUrls,
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
  const { sellerId, isActive, category, search } = req.query;

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
  // Filter by category (Case-insensitive)
  if (category) {
    query.category = { $regex: new RegExp('^' + category.trim() + '$', 'i') };
  }

  // Search by name or description
  if (search) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { name: { $regex: searchRegex } },
      { description: { $regex: searchRegex } }
    ];
  }

  // Filter by Flower Attributes (Case-insensitive)
  const { flowerType, flowerArrangement, flowerColor, occasion } = req.query;

  if (flowerType) {
    query.flowerType = { $regex: new RegExp('^' + flowerType.trim() + '$', 'i') };
  }
  if (flowerArrangement) {
    query.flowerArrangement = { $regex: new RegExp('^' + flowerArrangement.trim() + '$', 'i') };
  }
  if (flowerColor) {
    query.flowerColor = { $regex: new RegExp('^' + flowerColor.trim() + '$', 'i') };
  }

  if (occasion) {
    // MongoDB finds document if array 'occasions' contains this value
    query.occasions = occasion;
  }

  // Filter by Price Range
  const { minPrice, maxPrice } = req.query;
  if (minPrice || maxPrice) {
    query.basePrice = {};
    if (minPrice) query.basePrice.$gte = Number(minPrice);
    if (maxPrice) query.basePrice.$lt = Number(maxPrice);
  }

  // Filter by VIP status
  const { vip } = req.query;
  if (vip !== undefined) {
    query.vip = vip === 'true';
  }


  const products = await Product.find(query)
    .populate('sellerId', 'name email companyName')
    .populate('occasions', 'name')
    .sort({ createdAt: -1 });
  console.log("products", products);


  res.status(200).json({
    success: true,
    count: products.length,
    data: {
      products,
    },
  });
});

/**
 * @route   GET /api/flowers/products/latest
   * @desc    Get 4 latest created products
   * @access  Public
   */
export const getLatestProducts = asyncHandler(async (req, res, next) => {
  const products = await Product.find({ isActive: true })
    .populate('sellerId', 'name email companyName')
    .populate('occasions', 'name')
    .sort({ createdAt: -1 })
    .limit(4);

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
  const product = await Product.findById(req.params.id)
    .populate('sellerId', 'name email companyName')
    .populate('occasions', 'name');

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
  const { name, description, basePrice, stock, isActive, category, occasion, vip, flowerType, flowerArrangement, flowerColor, images } = req.body;

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
  if (category !== undefined) {
    product.category = category.trim(); // No lowercase
  }

  if (req.body.occasions !== undefined) {
    const occs = req.body.occasions;
    product.occasions = Array.isArray(occs) ? occs : [occs];
  }
  if (vip !== undefined) product.vip = (vip === 'true' || vip === true);

  if (flowerType !== undefined) product.flowerType = flowerType || undefined;
  if (flowerArrangement !== undefined) product.flowerArrangement = flowerArrangement || undefined;
  if (flowerColor !== undefined) product.flowerColor = flowerColor || undefined;

  // Handle images update
  if (req.files && req.files.length > 0) {
    try {
      const uploadResults = await uploadMultipleImages(req.files, 'flowers/products');
      const uploadedUrls = uploadResults.map(result => result.secure_url);

      let currentImages = images || product.images || [];
      if (typeof currentImages === 'string') currentImages = [currentImages];
      if (!Array.isArray(currentImages)) currentImages = [];

      product.images = [...currentImages, ...uploadedUrls];
    } catch (error) {
      return next(new AppError('Failed to upload new images', 500));
    }
  } else if (images !== undefined) {
    // If no new files but images array provided (e.g. removing images or reordering), update it
    let newImages = images;
    if (typeof newImages === 'string') newImages = [newImages];
    product.images = newImages;
  }

  await product.save();

  // Populate occasion to return full object immediately
  await product.populate('occasions', 'name');

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

  // Normalize category name (trim only)
  const normalizedCategory = categoryName.trim();

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


