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

console.log('--- ENV DEBUG ---');
console.log('Cloud Name loaded:', !!process.env.CLOUDINARY_CLOUD_NAME, process.env.CLOUDINARY_CLOUD_NAME);
console.log('API Key loaded:', !!process.env.CLOUDINARY_API_KEY);
console.log('-----------------');

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
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  myFatoorah: {
    url: process.env.MYFATOORAH_API_URL || 'https://apitest.myfatoorah.com',
    token: process.env.MYFATOORAH_API_TOKEN,
  },
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true' || false,
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    fromName: process.env.EMAIL_FROM_NAME || 'Bright Laptop',
    contactEmail: process.env.EMAIL_CONTACT_EMAIL || process.env.EMAIL_USER || '',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  },
};
