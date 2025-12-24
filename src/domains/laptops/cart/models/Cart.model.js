/**
 * Cart Model (Laptops Domain)
 * Shopping cart for users before checkout
 */
import mongoose from 'mongoose';
import { getConnection, isConnected } from '../../../../shared/infrastructure/database/connections.js';

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
    selectedWarranty: {
      duration: { type: String },
      price: { type: Number, default: 0 }
    },
    selectedConfig: {
      ram: { type: String },
      storage: { type: String }
    }
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
  if (isConnected('laptops')) {
    try {
      const conn = getConnection('laptops');
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

