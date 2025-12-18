/**
 * Navigation Category Model (Laptops Domain)
 * Defines navigation menu items for header navigation
 * Navigation categories can link to: ALL_PRODUCTS, NEW_ARRIVALS, or specific categories
 */
import mongoose from 'mongoose';
import { getConnection, isConnected } from '../../../../shared/infrastructure/database/connections.js';

const navigationCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Navigation category name is required'],
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: [true, 'Navigation category slug is required'],
      trim: true,
      unique: true,
      lowercase: true,
    },
    type: {
      type: String,
      enum: ['ALL_PRODUCTS', 'NEW_ARRIVALS', 'CATEGORY'],
      required: [true, 'Navigation category type is required'],
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: function() {
        return this.type === 'CATEGORY';
      },
    },
    displayOrder: {
      type: Number,
      default: 0,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    icon: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
navigationCategorySchema.index({ type: 1, isActive: 1 });
navigationCategorySchema.index({ slug: 1 });
navigationCategorySchema.index({ displayOrder: 1 });
navigationCategorySchema.index({ isActive: 1, displayOrder: 1 });

// Generate slug from name before saving
navigationCategorySchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Note: Category validation is handled in the controller to avoid circular dependencies
// The pre-save hook validation is skipped here as Category model uses a Proxy pattern

// Lazy-load the model to ensure database connection is established first
let NavigationCategory = null;

const getNavigationCategoryModel = () => {
  if (isConnected('laptops')) {
    try {
      const conn = getConnection('laptops');
      NavigationCategory = conn.model('NavigationCategory', navigationCategorySchema);
    } catch (error) {
      if (!NavigationCategory) {
        NavigationCategory = mongoose.model('NavigationCategory', navigationCategorySchema);
      }
    }
  } else {
    if (!NavigationCategory) {
      NavigationCategory = mongoose.model('NavigationCategory', navigationCategorySchema);
    }
  }
  return NavigationCategory;
};

export default new Proxy(function() {}, {
  construct(target, args) {
    return new (getNavigationCategoryModel())(...args);
  },
  get(target, prop) {
    const model = getNavigationCategoryModel();
    const value = model[prop];
    if (typeof value === 'function') {
      return value.bind(model);
    }
    return value;
  },
  apply(target, thisArg, args) {
    return getNavigationCategoryModel().apply(thisArg, args);
  }
});

