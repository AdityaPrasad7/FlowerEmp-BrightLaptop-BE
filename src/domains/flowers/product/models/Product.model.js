/**
 * Product Model (Flowers Domain)
 * Simple product schema without MOQ, bulk pricing, or B2B pricing
 */
import mongoose from 'mongoose';
import { getConnection, isConnected } from '../../../../shared/infrastructure/database/connections.js';
// Import User and Occasion models to ensure they are registered on the flowers connection for populate()
import UserModel from '../../auth/models/User.model.js';
import OccasionModel from '../../occasion/models/Occasion.model.js';

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
    images: {
      type: [String],
      default: [],
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
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['Flowers', 'Cakes', 'Chocolates'],
      default: 'Flowers'
    },
    occasions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Occasion',
    }],
    // Flower specific fields
    flowerType: {
      type: String,
      enum: [
        'Tulips', 'Lilies', 'Spray Roses', 'Mixed Flowers', 'Orchids',
        'Carnations', 'Hydrangeas', 'Gerbera', 'Ranunculus', 'Peony',
        'Roses', 'Sunflowers', 'Forever Rose'
      ],
    },
    flowerArrangement: {
      type: String,
      enum: ['Flower Basket', 'Flower Bouquets', 'Flower Box', 'Flower Vase'],
    },
    flowerColor: {
      type: String,
      enum: [
        'Blue Flowers', 'Purple Flowers', 'Pink Flowers', 'Red Flowers',
        'Yellow Flowers', 'White Flowers', 'Mixed Flowers'
      ],
    },
    vip: {
      type: Boolean,
      default: false,
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
productSchema.index({ category: 1 });
productSchema.index({ occasion: 1 });
productSchema.index({ vip: 1 });

// Lazy-load the model
let Product = null;

const getProductModel = () => {
  if (isConnected('flowers')) {
    try {
      const conn = getConnection('flowers');
      // Ensure User model is registered on this connection before creating Product
      // This is needed for populate() to work correctly
      if (!conn.models.User) {
        // Trigger User model initialization by accessing it
        // This will call getUserModel() which registers User on the flowers connection
        try {
          // Accessing any property on the Proxy triggers the get handler
          // which calls getUserModel() and registers User on flowers connection
          if (UserModel) {
            // Access modelName property to trigger Proxy getter
            void UserModel.modelName;
          }
        } catch (e) {
          // User model initialization will happen when populate() is called
        }
      }

      // Ensure Occasion model is registered on this connection before creating Product
      if (!conn.models.Occasion) {
        try {
          if (OccasionModel) {
            void OccasionModel.modelName;
          }
        } catch (e) { }
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


