/**
 * Product Model (Laptops Domain)
 * Defines product schema with MOQ, bulk pricing, and B2B pricing support
 */
import mongoose from 'mongoose';
import { getConnection, isConnected } from '../../../../shared/infrastructure/database/connections.js';

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
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price cannot be negative'],
      // Retail price for B2C buyers
    },
    b2bPrice: {
      type: Number,
      min: [0, 'B2B price cannot be negative'],
      // B2B price (lower than basePrice typically)
      // Optional - only set if seller wants to offer B2B pricing
      // B2B buyers get this price when quantity >= MOQ
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
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller ID is required'],
    },
    // Category references
    conditionCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      // Optional - product can have one condition (New or Pre-owned)
    },
    useCaseCategories: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Category',
      default: [],
      // Multiple use cases allowed (Business, Gaming, Coders, etc.)
    },
    brandCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      // Optional - product can have one brand
    },
    // Additional product fields
    images: {
      type: [String],
      default: [],
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
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
productSchema.index({ conditionCategory: 1 });
productSchema.index({ useCaseCategories: 1 });
productSchema.index({ brandCategory: 1 });
productSchema.index({ conditionCategory: 1, useCaseCategories: 1, brandCategory: 1 });

// Lazy-load the model to ensure database connection is established first
let Product = null;

const getProductModel = () => {
  if (isConnected('laptops')) {
    try {
      const conn = getConnection('laptops');
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

export default new Proxy(function() {}, {
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

