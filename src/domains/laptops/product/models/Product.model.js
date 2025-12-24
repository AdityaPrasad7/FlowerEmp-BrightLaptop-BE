/**
 * Product Model (Laptops Domain)
 * Defines product schema with MOQ, bulk pricing, and B2B pricing support
 */
import mongoose from 'mongoose';
import { getConnection, isConnected } from '../../../../shared/infrastructure/database/connections.js';
// Import User model to ensure it's registered on the laptops connection for populate()
import UserModel from '../../auth/models/User.model.js';

const bulkPricingSchema = new mongoose.Schema(
  {
    minQty: {
      type: Number,
      required: [true, 'Minimum quantity is required'],
      min: [1, 'Minimum quantity must be at least 1'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
  },
  { _id: false }
);

// Product specifications schema
const specificationsSchema = new mongoose.Schema(
  {
    screenSize: {
      type: String,
      trim: true,
    },
    resolution: {
      type: String,
      trim: true,
    },
    screenType: {
      type: String,
      trim: true,
    },
    processor: {
      type: String,
      trim: true,
    },
    generation: {
      type: String,
      trim: true,
    },
    ram: {
      type: String,
      trim: true,
    },
    storage: {
      type: String,
      trim: true,
    },
    touch: {
      type: Boolean,
      default: false,
    },
    battery: {
      type: String,
      trim: true,
    },
    adapter: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

// Configuration variant schema (for RAM/Storage options)
const configurationVariantSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['RAM', 'STORAGE'],
      required: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
    priceAdjustment: {
      type: Number,
      default: 0,
      // Price adjustment for this variant (can be positive or negative)
    },
  },
  { _id: false }
);

// Warranty option schema
const warrantyOptionSchema = new mongoose.Schema(
  {
    duration: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Warranty price cannot be negative'],
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    // Images - array of image URLs
    images: {
      type: [String],
      default: [],
      validate: {
        validator: function (images) {
          return images.length > 0;
        },
        message: 'At least one product image is required',
      },
    },
    // Brand information
    brand: {
      type: String,
      trim: true,
    },
    brandImage: {
      type: String,
      trim: true,
      // URL or path to brand logo/image
    },
    // Condition: 'new' or 'refurbished'
    condition: {
      type: String,
      enum: ['new', 'refurbished'],
      default: 'new',
    },
    // Pricing
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price cannot be negative'],
      // Retail price for B2C buyers
    },
    mrp: {
      type: Number,
      min: [0, 'MRP cannot be negative'],
      // Original MRP (before discount)
    },
    discountPercentage: {
      type: Number,
      min: [0, 'Discount percentage cannot be negative'],
      max: [100, 'Discount percentage cannot exceed 100'],
      default: 0,
    },
    b2bPrice: {
      type: Number,
      min: [0, 'B2B price cannot be negative'],
      // B2B price (lower than basePrice typically)
      // Optional - only set if seller wants to offer B2B pricing
      // B2B buyers get this price when quantity >= MOQ
    },
    gstIncluded: {
      type: Boolean,
      default: true,
    },
    gstPercentage: {
      type: Number,
      default: 18,
      min: [0, 'GST percentage cannot be negative'],
      max: [100, 'GST percentage cannot exceed 100'],
    },
    moq: {
      type: Number,
      default: 1,
      min: [1, 'MOQ must be at least 1'],
      // MOQ is primarily for B2B orders
    },
    bulkPricing: {
      type: [bulkPricingSchema],
      default: [],
      // Validate that bulk pricing tiers are in ascending order
      validate: {
        validator: function (bulkPricing) {
          if (bulkPricing.length === 0) return true;

          for (let i = 1; i < bulkPricing.length; i++) {
            if (bulkPricing[i].minQty <= bulkPricing[i - 1].minQty) {
              return false;
            }
          }
          return true;
        },
        message: 'Bulk pricing tiers must be in ascending order by minQty',
      },
    },
    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    soldCount: {
      type: Number,
      default: 0,
      min: [0, 'Sold count cannot be negative'],
      // Tracks total quantity sold (incremented when orders are approved)
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      lowercase: true,
      minlength: [2, 'Category must be at least 2 characters'],
      maxlength: [50, 'Category must not exceed 50 characters'],
    },
    // Ratings and Reviews
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5'],
    },
    reviewsCount: {
      type: Number,
      default: 0,
      min: [0, 'Reviews count cannot be negative'],
    },
    // Live viewers count (can be updated periodically)
    liveViewers: {
      type: Number,
      default: 0,
      min: [0, 'Live viewers cannot be negative'],
    },
    // Product specifications
    specifications: {
      type: specificationsSchema,
      default: {},
    },
    // Configuration variants (RAM/Storage options)
    configurationVariants: {
      type: [configurationVariantSchema],
      default: [],
    },
    // Warranty options
    defaultWarranty: {
      type: String,
      default: '12 months',
      trim: true,
    },
    warrantyOptions: {
      type: [warrantyOptionSchema],
      default: [],
    },
    // Shipping information
    shipping: {
      freeShipping: {
        type: Boolean,
        default: false,
      },
      estimatedDeliveryDays: {
        type: Number,
        default: 7,
        min: [0, 'Estimated delivery days cannot be negative'],
      },
    },
    // Additional offers
    offers: {
      exchangeOffer: {
        type: Boolean,
        default: false,
      },
      exchangeDiscountPercentage: {
        type: Number,
        default: 0,
        min: [0, 'Exchange discount cannot be negative'],
        max: [100, 'Exchange discount cannot exceed 100'],
      },
      noCostEMI: {
        type: Boolean,
        default: false,
      },
      bankOffers: {
        type: Boolean,
        default: false,
      },
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller ID is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
productSchema.index({ sellerId: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ category: 1 }); // Index for category filtering

// Lazy-load the model to ensure database connection is established first
let Product = null;

const getProductModel = () => {
  if (isConnected('laptops')) {
    try {
      const conn = getConnection('laptops');
      // Ensure User model is registered on this connection before creating Product
      // This is needed for populate() to work correctly
      if (!conn.models.User) {
        // Trigger User model initialization by accessing it
        // This will call getUserModel() which registers User on the laptops connection
        try {
          // Accessing any property on the Proxy triggers the get handler
          // which calls getUserModel() and registers User on laptops connection
          if (UserModel) {
            // Access modelName property to trigger Proxy getter
            void UserModel.modelName;
          }
        } catch (e) {
          // User model initialization will happen when populate() is called
          // Mongoose will handle the registration at that point
        }
      }
      Product = conn.model('Product', productSchema);
    } catch (error) {
      if (!Product) {
        Product = mongoose.model('Product', productSchema);
      }
    }
  } else {
    if (!Product) {
      Product = mongoose.model('Product', productSchema);
    }
  }
  return Product;
};

export default new Proxy(function () { }, {
  construct(target, args) {
    return new (getProductModel())(...args);
  },
  get(target, prop) {
    const model = getProductModel();
    const value = model[prop];
    if (typeof value === 'function') {
      return value.bind(model);
    }
    return value;
  },
  apply(target, thisArg, args) {
    return getProductModel().apply(thisArg, args);
  }
});

