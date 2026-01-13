/**
 * Product Controller (Laptops Domain)
 * Handles product CRUD operations with MOQ, bulk pricing, and B2B pricing
 */
import Product from '../models/Product.model.js';
import Category from '../../category/models/Category.model.js'; // Import Category model
import UserModel from '../../auth/models/User.model.js';
import { AppError, asyncHandler } from '../../../../shared/common/utils/errorHandler.js';

// Ensure User model is initialized on laptops connection before using Product.populate()
// Access UserModel to trigger Proxy getter which registers User on laptops connection
try {
  void UserModel.modelName;
} catch (e) {
  // User model will be registered when needed
}

/**
 * @route   POST /api/laptops/products
 * @desc    Create a new product
 * @access  Private (Seller/Admin only)
 */
export const createProduct = asyncHandler(async (req, res, next) => {
  const {
    name,
    description,
    images,
    brand,
    brandImage,
    condition,
    basePrice,
    mrp,
    discountPercentage,
    b2bPrice,
    gstIncluded,
    gstPercentage,
    moq,
    bulkPricing,
    stock,
    category,
    rating,
    reviewsCount,
    liveViewers,
    specifications,
    configurationVariants,
    defaultWarranty,
    warrantyOptions,
    shipping,
    offers,
    warehouseId
  } = req.body;
  console.log("BODY", req.body);

  // Validate required fields
  if (!name || basePrice === undefined || stock === undefined || !category) {
    return next(new AppError('Please provide name, basePrice, stock, and category', 400));
  }

  // Validate images
  if (!images || !Array.isArray(images) || images.length === 0) {
    return next(new AppError('At least one product image is required', 400));
  }

  // Normalize category: trim, lowercase, and replace hyphens with spaces
  // const normalizedCategory = category.trim().toLowerCase().replace(/-/g, ' ');

  // Prepare product data
  const productData = {
    name,
    description: description || '',
    images,
    brand: brand || undefined,
    brandImage: brandImage || undefined,
    condition: 'refurbished', // Force default
    basePrice,
    mrp: mrp || undefined,
    discountPercentage: discountPercentage || 0,
    b2bPrice: b2bPrice || undefined,
    gstIncluded: gstIncluded !== undefined ? gstIncluded : true,
    gstPercentage: gstPercentage || 18,
    moq: moq || 1,
    bulkPricing: bulkPricing || [],
    stock,
    category,
    rating: rating || 0,
    reviewsCount: reviewsCount || 0,
    liveViewers: liveViewers || 0,
    specifications: specifications || {},
    configurationVariants: configurationVariants || [],
    defaultWarranty: defaultWarranty || '12 months',
    warrantyOptions: warrantyOptions || [],
    shipping: shipping || { freeShipping: false, estimatedDeliveryDays: 7 },
    offers: offers || {
      exchangeOffer: false,
      exchangeDiscountPercentage: 0,
      noCostEMI: false,
      bankOffers: false,
    },
    warehouseId: warehouseId || null,
    sellerId: req.user._id,
  };

  console.log("DEBUG CONTROLLER: warehouseId from body:", warehouseId);
  console.log("DEBUG CONTROLLER: productData.warehouseId:", productData.warehouseId);

  // Create product
  const product = await Product.create(productData);

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
  const { sellerId, isActive, category } = req.query;

  // Check if database connection is ready
  const { isConnected } = await import('../../../../shared/infrastructure/database/connections.js');
  if (!isConnected('laptops')) {
    return next(new AppError('Database connection not ready. Please try again in a moment.', 503));
  }

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
  // Filter by category (case-insensitive, handle both hyphens and spaces)
  if (category) {
    query.category = category.trim().toLowerCase().replace(/-/g, ' ');
  }

  const products = await Product.find(query)
    .populate('sellerId', 'name email companyName')
    .sort({ createdAt: -1 })
    .maxTimeMS(5000); // Set query timeout to 5 seconds

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
  const product = await Product.findById(req.params.id).populate(
    'sellerId',
    'name email companyName'
  );

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
    images,
    brand,
    brandImage,
    condition,
    basePrice,
    mrp,
    discountPercentage,
    b2bPrice,
    gstIncluded,
    gstPercentage,
    moq,
    bulkPricing,
    stock,
    isActive,
    category,
    rating,
    reviewsCount,
    liveViewers,
    specifications,
    configurationVariants,
    defaultWarranty,
    warrantyOptions,
    shipping,
    offers,
    warehouseId
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

  // Update fields
  if (name !== undefined) product.name = name;
  if (description !== undefined) product.description = description;
  if (images !== undefined) product.images = images;
  if (brand !== undefined) product.brand = brand;
  if (brandImage !== undefined) product.brandImage = brandImage;
  if (condition !== undefined) product.condition = condition;
  if (basePrice !== undefined) product.basePrice = basePrice;
  if (mrp !== undefined) product.mrp = mrp;
  if (discountPercentage !== undefined) product.discountPercentage = discountPercentage;
  if (b2bPrice !== undefined) product.b2bPrice = b2bPrice;
  if (gstIncluded !== undefined) product.gstIncluded = gstIncluded;
  if (gstPercentage !== undefined) product.gstPercentage = gstPercentage;
  if (moq !== undefined) product.moq = moq;
  if (bulkPricing !== undefined) product.bulkPricing = bulkPricing;
  if (stock !== undefined) product.stock = stock;
  if (isActive !== undefined) product.isActive = isActive;
  // Normalize category if provided (replace hyphens with spaces)
  if (category !== undefined) {
    product.category = category;
  }
  if (rating !== undefined) product.rating = rating;
  if (reviewsCount !== undefined) product.reviewsCount = reviewsCount;
  if (liveViewers !== undefined) product.liveViewers = liveViewers;
  if (specifications !== undefined) product.specifications = specifications;
  if (configurationVariants !== undefined) product.configurationVariants = configurationVariants;
  if (defaultWarranty !== undefined) product.defaultWarranty = defaultWarranty;
  if (warrantyOptions !== undefined) product.warrantyOptions = warrantyOptions;
  if (shipping !== undefined) product.shipping = shipping;
  if (offers !== undefined) product.offers = offers;
  if (warehouseId !== undefined) product.warehouseId = warehouseId;


  await product.save();

  res.status(200).json({
    success: true,
    data: {
      product,
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

/**
 * @route   GET /api/laptops/products/categories/list
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
 * @route   GET /api/laptops/categories/:categoryName/products
 * @desc    Get all products from a specific category
 * @access  Public
 */
export const getProductsByCategory = asyncHandler(async (req, res, next) => {
  const { categoryName } = req.params;
  const { sellerId, isActive } = req.query;

  // Check if database connection is ready
  const { isConnected } = await import('../../../../shared/infrastructure/database/connections.js');
  if (!isConnected('laptops')) {
    return next(new AppError('Database connection not ready. Please try again in a moment.', 503));
  }

  // Normalize category name (trim, lowercase, and convert hyphens to spaces)
  // This handles both URL slugs (mini-pcs) and database format (mini pcs)
  const normalizedCategory = categoryName.trim().toLowerCase().replace(/-/g, ' ');
  const slug = categoryName.trim().toLowerCase().replace(/\s+/g, '-');

  // Find category by slug or name
  const categoryDoc = await Category.findOne({
    $or: [
      { slug: slug },
      { name: { $regex: new RegExp(`^${normalizedCategory}$`, 'i') } }
    ]
  });

  if (!categoryDoc) {
    return res.status(200).json({
      success: true,
      count: 0,
      data: {
        category: normalizedCategory,
        products: [],
      },
    });
  }

  // Build query using Category ID
  const query = {
    category: categoryDoc._id,
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
    .sort({ createdAt: -1 })
    .maxTimeMS(5000); // Set query timeout to 5 seconds

  res.status(200).json({
    success: true,
    count: products.length,
    data: {
      category: normalizedCategory,
      products,
    },
  });
});

/**
 * @route   GET /api/laptops/products/best-sellers
 * @desc    Get best selling products based on soldCount, rating, and reviewsCount
 * @access  Public
 */
export const getBestSellers = asyncHandler(async (req, res, next) => {
  const { limit = 10 } = req.query;

  // Check database connection
  const { isConnected } = await import('../../../../shared/infrastructure/database/connections.js');
  if (!isConnected('laptops')) {
    return next(new AppError('Database connection not ready. Please try again in a moment.', 503));
  }

  // Get all active products
  const products = await Product.find({ isActive: true })
    .populate('sellerId', 'name email companyName')
    .maxTimeMS(5000);

  // Calculate best seller score for each product
  // Score = (rating × reviewsCount × 0.3) + (soldCount × 0.7)
  const productsWithScore = products.map(product => {
    const ratingScore = (product.rating || 0) * (product.reviewsCount || 0) * 0.3;
    const salesScore = (product.soldCount || 0) * 0.7;
    const bestSellerScore = ratingScore + salesScore;

    return {
      ...product.toObject(),
      bestSellerScore,
    };
  });

  // Sort by best seller score (descending) and take top N
  const bestSellers = productsWithScore
    .sort((a, b) => b.bestSellerScore - a.bestSellerScore)
    .slice(0, parseInt(limit));

  res.status(200).json({
    success: true,
    count: bestSellers.length,
    data: {
      products: bestSellers,
    },
  });
});

/**
 * @route   GET /api/laptops/products/best-deals
 * @desc    Get products with best deals (highest discount percentages)
 * @access  Public
 */
export const getBestDeals = asyncHandler(async (req, res, next) => {
  const { limit = 10 } = req.query;

  // Check database connection
  const { isConnected } = await import('../../../../shared/infrastructure/database/connections.js');
  if (!isConnected('laptops')) {
    return next(new AppError('Database connection not ready. Please try again in a moment.', 503));
  }

  // Get active products with discounts, sorted by discount percentage (descending)
  const products = await Product.find({
    isActive: true,
    discountPercentage: { $gt: 0 } // Only products with discounts
  })
    .populate('sellerId', 'name email companyName')
    .sort({ discountPercentage: -1 }) // Sort by highest discount first
    .limit(parseInt(limit))
    .maxTimeMS(5000);

  res.status(200).json({
    success: true,
    count: products.length,
    data: {
      products,
    },
  });
});

/**
 * @route   GET /api/laptops/products/search
 * @desc    Search products by name, brand, category, or description
 * @access  Public
 */
export const searchProducts = asyncHandler(async (req, res, next) => {
  const { q, limit = 10 } = req.query;

  // Check database connection
  const { isConnected } = await import('../../../../shared/infrastructure/database/connections.js');
  if (!isConnected('laptops')) {
    return next(new AppError('Database connection not ready. Please try again in a moment.', 503));
  }

  // If no search query, return empty results
  if (!q || q.trim().length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      data: {
        products: [],
      },
    });
  }

  const searchQuery = q.trim();
  const searchLimit = Math.min(parseInt(limit), 20); // Max 20 results

  // Create search regex for case-insensitive search
  const searchRegex = new RegExp(searchQuery, 'i');

  // Search in name, brand, category, and description
  const products = await Product.find({
    isActive: true,
    $or: [
      { name: { $regex: searchRegex } },
      { brand: { $regex: searchRegex } },
      { category: { $regex: searchRegex } },
      { description: { $regex: searchRegex } },
    ],
  })
    .populate('sellerId', 'name email companyName')
    .limit(searchLimit)
    .maxTimeMS(5000);

  res.status(200).json({
    success: true,
    count: products.length,
    query: searchQuery,
    data: {
      products,
    },
  });
});

/**
 * @route   GET /api/laptops/products/brands
 * @desc    Get unique brands with their images from products
 * @access  Public
 */
export const getBrands = asyncHandler(async (req, res, next) => {
  // Check database connection
  const { isConnected } = await import('../../../../shared/infrastructure/database/connections.js');
  if (!isConnected('laptops')) {
    return next(new AppError('Database connection not ready. Please try again in a moment.', 503));
  }

  // Get all active products with brand and brandImage
  const products = await Product.find({
    isActive: true,
    brand: { $exists: true, $ne: null, $ne: '' }
  })
    .select('brand brandImage')
    .maxTimeMS(5000);

  // Extract unique brands with their images
  const brandMap = new Map();

  products.forEach(product => {
    const brandName = product.brand?.trim();
    if (brandName) {
      // If brand doesn't exist in map, or if current product has brandImage and map doesn't
      if (!brandMap.has(brandName) ||
        (product.brandImage && !brandMap.get(brandName).image)) {
        brandMap.set(brandName, {
          name: brandName,
          image: product.brandImage || null,
        });
      }
    }
  });

  // Convert map to array
  const brands = Array.from(brandMap.values())
    .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

  res.status(200).json({
    success: true,
    count: brands.length,
    data: {
      brands,
    },
  });
});

/**
 * @route   GET /api/laptops/products/top-picks
 * @desc    Get top picks - products with high ratings and good reviews (quality + popularity)
 * @access  Public
 */
export const getTopPicks = asyncHandler(async (req, res, next) => {
  const { limit = 10 } = req.query;

  // Check database connection
  const { isConnected } = await import('../../../../shared/infrastructure/database/connections.js');
  if (!isConnected('laptops')) {
    return next(new AppError('Database connection not ready. Please try again in a moment.', 503));
  }

  // Get active products with minimum rating and reviews
  // Top picks = products with rating >= 4.0 AND reviewsCount >= 5
  // Sorted by (rating × reviewsCount) to prioritize both quality and popularity
  const products = await Product.find({
    isActive: true,
    rating: { $gte: 4.0 }, // Minimum 4.0 rating
    reviewsCount: { $gte: 5 } // Minimum 5 reviews
  })
    .populate('sellerId', 'name email companyName')
    .maxTimeMS(5000);

  // Calculate top picks score: rating × reviewsCount (prioritizes both quality and popularity)
  const productsWithScore = products.map(product => {
    const topPickScore = (product.rating || 0) * (product.reviewsCount || 0);
    return {
      ...product.toObject(),
      topPickScore,
    };
  });

  // Sort by top pick score (descending) and take top N
  const topPicks = productsWithScore
    .sort((a, b) => b.topPickScore - a.topPickScore)
    .slice(0, parseInt(limit));

  res.status(200).json({
    success: true,
    count: topPicks.length,
    data: {
      products: topPicks,
    },
  });
});

