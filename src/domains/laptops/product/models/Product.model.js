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
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      lowercase: true,
      minlength: [2, 'Category must be at least 2 characters'],
      maxlength: [50, 'Category must not exceed 50 characters'],
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

