/**
 * Order Model (Flowers Domain)
 * Defines order schema supporting both B2B and B2C orders
 */
import mongoose from 'mongoose';

import { getConnection, isConnected } from '../../../../shared/infrastructure/database/connections.js';
import ProductModel from '../../product/models/Product.model.js';
import UserModel from '../../auth/models/User.model.js';

const orderItemSchema = new mongoose.Schema(
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
    priceAtPurchase: {
      type: Number,
      required: [true, 'Price at purchase is required'],
      min: [0, 'Price cannot be negative'],
    },
  },
  { _id: false }
);

// Address schema (reusable for shipping and billing)
const addressSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    addressLine1: {
      type: String,
      required: [true, 'Address line 1 is required'],
      trim: true,
      maxlength: [200, 'Address line 1 cannot exceed 200 characters'],
    },
    addressLine2: {
      type: String,
      trim: true,
      maxlength: [200, 'Address line 2 cannot exceed 200 characters'],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [100, 'City cannot exceed 100 characters'],
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      maxlength: [100, 'State cannot exceed 100 characters'],
    },
    postalCode: {
      type: String,
      required: [true, 'Postal code is required'],
      trim: true,
      maxlength: [20, 'Postal code cannot exceed 20 characters'],
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      maxlength: [100, 'Country cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    orderId: {
      type: String,
      unique: true,
      // Default removed, handled in pre-save hook to sync with _id
    },
    products: {
      type: [orderItemSchema],
      required: [true, 'Products are required'],
      validate: {
        validator: function (products) {
          return products.length > 0;
        },
        message: 'Order must contain at least one product',
      },
    },
    orderType: {
      type: String,
      enum: ['B2B', 'B2C'],
      required: [true, 'Order type is required'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'SHIPPED', 'CANCELLED'],
      default: 'PENDING',
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    // Shipping Address (optional for flowers)
    shippingAddress: {
      type: addressSchema,
      required: false,
    },
    // Billing Address (optional - defaults to shipping address)
    billingAddress: {
      type: addressSchema,
      required: false,
    },
    // Payment Information
    paymentMethod: {
      type: String,
      enum: ['COD', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'NET_BANKING', 'WALLET', 'OTHER'],
      required: [true, 'Payment method is required'],
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
    },
    deliveryCharge: {
      type: Number,
      default: 0,
      min: [0, 'Delivery charge cannot be negative'],
    },
    // Special Instructions/Notes
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
    // Delivery Details
    deliveryDate: {
      type: Date,
      required: [true, 'Delivery date is required'],
    },
    timeSlot: {
      type: String,
      required: [true, 'Time slot is required'],
    },
    // Payment Gateway Details (Summary)
    paymentDetails: {
      paymentId: { type: String },
      transactionId: { type: String },
      status: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ orderType: 1 });

// Pre-save hook to sync orderId with _id
orderSchema.pre('save', function (next) {
  if (this.isNew || !this.orderId) {
    // Use last 6 characters of _id to generate orderId
    // this._id is always generated by Mongoose before saving
    this.orderId = this._id.toString().slice(-6).toUpperCase();
  }
  next();
});

// Lazy-load the model
let Order = null;

const getOrderModel = () => {
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

      Order = conn.model('Order', orderSchema);
    } catch (error) {
      if (!Order) {
        Order = mongoose.model('Order', orderSchema);
      }
    }
  } else {
    if (!Order) {
      Order = mongoose.model('Order', orderSchema);
    }
  }
  return Order;
};

export default new Proxy(function () { }, {
  construct(target, args) {
    return new (getOrderModel())(...args);
  },
  get(target, prop) {
    const model = getOrderModel();
    const value = model[prop];
    if (typeof value === 'function') {
      return value.bind(model);
    }
    return value;
  },
  apply(target, thisArg, args) {
    return getOrderModel().apply(thisArg, args);
  }
});


