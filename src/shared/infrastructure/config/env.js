/**
 * Environment Configuration
 * Validates and exports environment variables
 */
import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'MONGODB_FLOWERS_URI',
  'MONGODB_LAPTOPS_URI',
  'JWT_SECRET',
  'PORT'
];

// Validate required environment variables
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

export default {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  // Multi-database configuration (domain-specific auth)
  // Each domain has its own database with separate connection string
  databases: {
    flowers: process.env.MONGODB_FLOWERS_URI, // Flowers DB (users, products, orders, carts)
    laptops: process.env.MONGODB_LAPTOPS_URI, // Laptops DB (users, products, orders, carts)
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expire: process.env.JWT_EXPIRE || '7d',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
};

