/**
 * User Model (Flowers Domain)
 * Defines user schema with role-based fields
 * Uses flowers database connection
 */
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { getConnection, isConnected } from '../../../../shared/infrastructure/database/connections.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['B2C_BUYER', 'B2B_BUYER', 'SELLER', 'ADMIN'],
      required: [true, 'Role is required'],
    },
    companyName: {
      type: String,
      trim: true,
      // Required only for B2B users
      validate: {
        validator: function (value) {
          if (this.role === 'B2B_BUYER' && !value) {
            return false;
          }
          return true;
        },
        message: 'Company name is required for B2B buyers',
      },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash password if it's been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get user data without sensitive information
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Lazy-load the model to ensure database connection is established first
let User = null;

/**
 * Get User model (lazy initialization)
 * Ensures database connection is established before creating model
 * Re-initializes if connection becomes available
 */
const getUserModel = () => {
  // Always try to use flowers connection if available
  if (isConnected('flowers')) {
    try {
      const conn = getConnection('flowers');
      // Check if model already exists on this connection
      if (conn.models.User) {
        User = conn.models.User;
      } else {
        // Create model on flowers connection
        User = conn.model('User', userSchema);
      }
    } catch (error) {
      console.error('Error getting flowers User model:', error);
      // Fallback to default connection if flowers connection fails
      if (!User) {
        // Check if model exists on default connection before creating
        if (mongoose.models.FlowersUser) {
          User = mongoose.models.FlowersUser;
        } else {
          // Use unique name to avoid conflict with laptops domain
          User = mongoose.model('FlowersUser', userSchema);
        }
      }
    }
  } else {
    // Connection not ready yet - use default mongoose connection temporarily
    // This allows the model to be imported before connectAllDatabases() runs
    if (!User) {
      // Check if model already exists before creating
      if (mongoose.models.FlowersUser) {
        User = mongoose.models.FlowersUser;
      } else {
        // Use a unique model name for flowers domain on default connection
        // This prevents conflicts with laptops domain User model
        User = mongoose.model('FlowersUser', userSchema);
      }
    }
  }
  return User;
};

// Export a Proxy that lazily initializes the model on first access
export default new Proxy(function() {}, {
  // Handle constructor calls: new User()
  construct(target, args) {
    return new (getUserModel())(...args);
  },
  // Handle static method calls: User.create(), User.findById(), etc.
  get(target, prop) {
    const model = getUserModel();
    const value = model[prop];
    // If it's a function, bind it to the model
    if (typeof value === 'function') {
      return value.bind(model);
    }
    return value;
  },
  // Handle function calls: User()
  apply(target, thisArg, args) {
    return getUserModel().apply(thisArg, args);
  }
});

