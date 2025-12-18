/**
 * Category Model (Laptops Domain)
 * Defines category schema for organizing products
 * Categories can be: CONDITION, USE_CASE, BRAND
 */
import mongoose from 'mongoose';
import { getConnection, isConnected } from '../../../../shared/infrastructure/database/connections.js';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: [true, 'Category slug is required'],
      trim: true,
      unique: true,
      lowercase: true,
    },
    type: {
      type: String,
      enum: ['CONDITION', 'USE_CASE', 'BRAND'],
      required: [true, 'Category type is required'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
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
categorySchema.index({ type: 1, isActive: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ name: 1 });

// Generate slug from name before saving
categorySchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Lazy-load the model to ensure database connection is established first
let Category = null;

const getCategoryModel = () => {
  if (isConnected('laptops')) {
    try {
      const conn = getConnection('laptops');
      Category = conn.model('Category', categorySchema);
    } catch (error) {
      if (!Category) {
        Category = mongoose.model('Category', categorySchema);
      }
    }
  } else {
    if (!Category) {
      Category = mongoose.model('Category', categorySchema);
    }
  }
  return Category;
};

export default new Proxy(function() {}, {
  construct(target, args) {
    return new (getCategoryModel())(...args);
  },
  get(target, prop) {
    const model = getCategoryModel();
    const value = model[prop];
    if (typeof value === 'function') {
      return value.bind(model);
    }
    return value;
  },
  apply(target, thisArg, args) {
    return getCategoryModel().apply(thisArg, args);
  }
});

