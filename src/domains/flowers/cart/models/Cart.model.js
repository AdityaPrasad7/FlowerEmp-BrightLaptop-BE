/**
 * Cart Model (Flowers Domain)
 * Shopping cart for users before checkout...
 */
import mongoose from 'mongoose';

import { getConnection, isConnected } from '../../../../shared/infrastructure/database/connections.js';
import ProductModel from '../../product/models/Product.model.js';
import UserModel from '../../auth/models/User.model.js';

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Price cannot be negative'],
      // Price per unit (calculated based on user role and quantity)
    },
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'],
      min: [0, 'Total price cannot be negative'],
      // unitPrice * quantity
    },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true, // One cart per user
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, 'Total amount cannot be negative'],
    },
    adminNotified: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
cartSchema.index({ userId: 1 });

// Method to calculate total amount
cartSchema.methods.calculateTotal = function () {
  this.totalAmount = this.items.reduce((total, item) => {
    return total + item.totalPrice;
  }, 0);
  return this.totalAmount;
};

// Lazy-load the model
let Cart = null;

const getCartModel = () => {
  if (isConnected('flowers')) {
    try {
      const conn = getConnection('flowers');

      // Ensure Product model is registered
      if (!conn.models.Product) {
        try {
          if (ProductModel) void ProductModel.modelName;
        } catch (e) { }
      }

      // Ensure User model is registered
      if (!conn.models.User) {
        try {
          if (UserModel) void UserModel.modelName;
        } catch (e) { }
      }

      Cart = conn.model('Cart', cartSchema);
    } catch (error) {
      if (!Cart) {
        Cart = mongoose.model('Cart', cartSchema);
      }
    }
  } else {
    if (!Cart) {
      Cart = mongoose.model('Cart', cartSchema);
    }
  }
  return Cart;
};

export default new Proxy(function () { }, {
  construct(target, args) {
    return new (getCartModel())(...args);
  },
  get(target, prop) {
    const model = getCartModel();
    const value = model[prop];
    if (typeof value === 'function') {
      return value.bind(model);
    }
    return value;
  },
  apply(target, thisArg, args) {
    return getCartModel().apply(thisArg, args);
  }
});


