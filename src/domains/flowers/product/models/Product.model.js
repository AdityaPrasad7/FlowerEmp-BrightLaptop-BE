/**
 * Product Model (Flowers Domain)
 * Simple product schema without MOQ, bulk pricing, or B2B pricing
 */
import mongoose from 'mongoose';
import { getConnection, isConnected } from '../../../../shared/infrastructure/database/connections.js';

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

// Lazy-load the model
let Product = null;

const getProductModel = () => {
  if (isConnected('flowers')) {
    try {
      const conn = getConnection('flowers');
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


