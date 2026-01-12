/**
 * Product Validation Schemas (Laptops Domain)
 * Joi schemas for product endpoints
 */
import Joi from 'joi';
import { positiveNumberSchema, positiveIntegerSchema } from '../../../../shared/common/validators/common.validator.js';

/**
 * Bulk pricing tier schema
 */
const bulkPricingTierSchema = Joi.object({
  minQty: Joi.alternatives().try(
    Joi.number().integer().min(1).messages({
      'number.base': 'minQty must be an integer >= 1',
      'number.integer': 'minQty must be an integer',
      'number.min': 'minQty must be at least 1',
    }),
    Joi.string().custom((value, helpers) => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1 || !Number.isInteger(num)) {
        return helpers.error('number.base');
      }
      return num;
    }).messages({
      'number.base': 'minQty must be an integer >= 1',
    })
  ).required(),
  price: positiveNumberSchema.required(),
});

/**
 * Bulk pricing array schema with ascending order validation
 */
const bulkPricingSchema = Joi.array()
  .items(bulkPricingTierSchema)
  .custom((tiers, helpers) => {
    // Validate ascending order
    for (let i = 1; i < tiers.length; i++) {
      if (tiers[i].minQty <= tiers[i - 1].minQty) {
        return helpers.error('array.custom');
      }
    }
    return tiers;
  })
  .messages({
    'array.custom': 'Bulk pricing tiers must be in ascending order by minQty',
  })
  .optional()
  .default([]);

/**
 * Specifications schema
 */
const specificationsSchema = Joi.object({
  screenSize: Joi.string().trim().allow('').optional(),
  resolution: Joi.string().trim().allow('').optional(),
  screenType: Joi.string().trim().allow('').optional(),
  processor: Joi.string().trim().allow('').optional(),
  generation: Joi.string().trim().allow('').optional(),
  ram: Joi.string().trim().allow('').optional(),
  storage: Joi.string().trim().allow('').optional(),
  touch: Joi.boolean().optional().default(false),
  battery: Joi.string().trim().allow('').optional(),
  adapter: Joi.string().trim().allow('').optional(),
});

/**
 * Configuration variant schema
 */
const configurationVariantSchema = Joi.object({
  type: Joi.string().valid('RAM', 'STORAGE').required().messages({
    'any.only': 'Configuration type must be RAM or STORAGE',
    'any.required': 'Configuration type is required',
  }),
  value: Joi.string().trim().required().messages({
    'any.required': 'Configuration value is required',
  }),
  priceAdjustment: Joi.number().default(0).messages({
    'number.base': 'Price adjustment must be a number',
  }),
});

/**
 * Warranty option schema
 */
const warrantyOptionSchema = Joi.object({
  duration: Joi.string().trim().required().messages({
    'any.required': 'Warranty duration is required',
  }),
  price: positiveNumberSchema.required().messages({
    'any.required': 'Warranty price is required',
  }),
});

/**
 * Create product validation schema
 */
export const createProductSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.min': 'Product name must be at least 2 characters',
      'string.max': 'Product name must not exceed 200 characters',
      'any.required': 'Product name is required',
    }),
  description: Joi.string()
    .trim()
    .max(2000)
    .allow('')
    .optional()
    .default('')
    .messages({
      'string.max': 'Description must not exceed 2000 characters',
    }),
  images: Joi.array()
    .items(Joi.string().uri().trim())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one product image is required',
      'any.required': 'Product images are required',
      'string.uri': 'Image must be a valid URL',
    }),
  brand: Joi.string().trim().optional(),
  brandImage: Joi.string().uri().trim().allow('').optional().messages({
    'string.uri': 'Brand image must be a valid URL',
  }),
  condition: Joi.string().valid('new', 'refurbished').optional().default('new').messages({
    'any.only': 'Condition must be either new or refurbished',
  }),
  basePrice: positiveNumberSchema.required().messages({
    'any.required': 'Base price is required',
  }),
  mrp: positiveNumberSchema.optional(),
  discountPercentage: Joi.number().min(0).max(100).optional().default(0).messages({
    'number.min': 'Discount percentage cannot be negative',
    'number.max': 'Discount percentage cannot exceed 100',
  }),
  b2bPrice: positiveNumberSchema.optional(),
  gstIncluded: Joi.boolean().optional().default(true),
  gstPercentage: Joi.number().min(0).max(100).optional().default(18).messages({
    'number.min': 'GST percentage cannot be negative',
    'number.max': 'GST percentage cannot exceed 100',
  }),
  moq: Joi.alternatives().try(
    Joi.number().integer().min(1).messages({
      'number.base': 'MOQ must be an integer >= 1',
      'number.integer': 'MOQ must be an integer',
      'number.min': 'MOQ must be at least 1',
    }),
    Joi.string().custom((value, helpers) => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1 || !Number.isInteger(num)) {
        return helpers.error('number.base');
      }
      return num;
    }).messages({
      'number.base': 'MOQ must be an integer >= 1',
    })
  ).optional().default(1),
  bulkPricing: bulkPricingSchema,
  stock: positiveIntegerSchema.required().messages({
    'any.required': 'Stock is required',
  }),
  category: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Category must be at least 2 characters',
      'string.max': 'Category must not exceed 50 characters',
      'any.required': 'Category is required',
    }),
  rating: Joi.number().min(0).max(5).optional().default(0).messages({
    'number.min': 'Rating cannot be negative',
    'number.max': 'Rating cannot exceed 5',
  }),
  reviewsCount: Joi.number().integer().min(0).optional().default(0).messages({
    'number.min': 'Reviews count cannot be negative',
    'number.integer': 'Reviews count must be an integer',
  }),
  liveViewers: Joi.number().integer().min(0).optional().default(0).messages({
    'number.min': 'Live viewers cannot be negative',
    'number.integer': 'Live viewers must be an integer',
  }),
  specifications: specificationsSchema.optional(),
  configurationVariants: Joi.array().items(configurationVariantSchema).optional().default([]),
  defaultWarranty: Joi.string().trim().optional().default('12 months'),
  warrantyOptions: Joi.array().items(warrantyOptionSchema).optional().default([]),
  shipping: Joi.object({
    freeShipping: Joi.boolean().optional().default(false),
    estimatedDeliveryDays: Joi.number().integer().min(0).optional().default(7).messages({
      'number.min': 'Estimated delivery days cannot be negative',
      'number.integer': 'Estimated delivery days must be an integer',
    }),
  }).optional().default({ freeShipping: false, estimatedDeliveryDays: 7 }),
  offers: Joi.object({
    exchangeOffer: Joi.boolean().optional().default(false),
    exchangeDiscountPercentage: Joi.number().min(0).max(100).optional().default(0).messages({
      'number.min': 'Exchange discount cannot be negative',
      'number.max': 'Exchange discount cannot exceed 100',
    }),
    noCostEMI: Joi.boolean().optional().default(false),
    bankOffers: Joi.boolean().optional().default(false),
  }).optional().default({
    noCostEMI: false,
    bankOffers: false,
  }),
  warehouseId: Joi.string().trim().pattern(/^[0-9a-fA-F]{24}$/).optional().allow(null).messages({
    'string.pattern.base': 'Warehouse ID must be a valid MongoDB ObjectId',
  }),
});

/**
 * Update product validation schema (all fields optional)
 */
export const updateProductSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(200)
    .optional()
    .messages({
      'string.min': 'Product name must be at least 2 characters',
      'string.max': 'Product name must not exceed 200 characters',
    }),
  description: Joi.string()
    .trim()
    .max(2000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Description must not exceed 2000 characters',
    }),
  images: Joi.array()
    .items(Joi.string().uri().trim())
    .optional()
    .messages({
      'string.uri': 'Image must be a valid URL',
    }),
  brand: Joi.string().trim().optional(),
  brandImage: Joi.string().uri().trim().allow('').optional().messages({
    'string.uri': 'Brand image must be a valid URL',
  }),
  condition: Joi.string().valid('new', 'refurbished').optional().messages({
    'any.only': 'Condition must be either new or refurbished',
  }),
  basePrice: positiveNumberSchema.optional(),
  mrp: positiveNumberSchema.optional(),
  discountPercentage: Joi.number().min(0).max(100).optional().messages({
    'number.min': 'Discount percentage cannot be negative',
    'number.max': 'Discount percentage cannot exceed 100',
  }),
  b2bPrice: positiveNumberSchema.optional(),
  gstIncluded: Joi.boolean().optional(),
  gstPercentage: Joi.number().min(0).max(100).optional().messages({
    'number.min': 'GST percentage cannot be negative',
    'number.max': 'GST percentage cannot exceed 100',
  }),
  moq: Joi.alternatives().try(
    Joi.number().integer().min(1).messages({
      'number.base': 'MOQ must be an integer >= 1',
      'number.integer': 'MOQ must be an integer',
      'number.min': 'MOQ must be at least 1',
    }),
    Joi.string().custom((value, helpers) => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1 || !Number.isInteger(num)) {
        return helpers.error('number.base');
      }
      return num;
    }).messages({
      'number.base': 'MOQ must be an integer >= 1',
    })
  ).optional(),
  bulkPricing: bulkPricingSchema,
  stock: positiveIntegerSchema.optional(),
  isActive: Joi.boolean().optional(),
  category: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.min': 'Category must be at least 2 characters',
      'string.max': 'Category must not exceed 50 characters',
    }),
  rating: Joi.number().min(0).max(5).optional().messages({
    'number.min': 'Rating cannot be negative',
    'number.max': 'Rating cannot exceed 5',
  }),
  reviewsCount: Joi.number().integer().min(0).optional().messages({
    'number.min': 'Reviews count cannot be negative',
    'number.integer': 'Reviews count must be an integer',
  }),
  liveViewers: Joi.number().integer().min(0).optional().messages({
    'number.min': 'Live viewers cannot be negative',
    'number.integer': 'Live viewers must be an integer',
  }),
  specifications: specificationsSchema.optional(),
  configurationVariants: Joi.array().items(configurationVariantSchema).optional(),
  defaultWarranty: Joi.string().trim().optional(),
  warrantyOptions: Joi.array().items(warrantyOptionSchema).optional(),
  shipping: Joi.object({
    freeShipping: Joi.boolean().optional(),
    estimatedDeliveryDays: Joi.number().integer().min(0).optional().messages({
      'number.min': 'Estimated delivery days cannot be negative',
      'number.integer': 'Estimated delivery days must be an integer',
    }),
  }).optional(),
  offers: Joi.object({
    exchangeOffer: Joi.boolean().optional(),
    exchangeDiscountPercentage: Joi.number().min(0).max(100).optional().messages({
      'number.min': 'Exchange discount cannot be negative',
      'number.max': 'Exchange discount cannot exceed 100',
    }),
    noCostEMI: Joi.boolean().optional(),
    bankOffers: Joi.boolean().optional(),
  }).optional(),
  warehouseId: Joi.string().trim().pattern(/^[0-9a-fA-F]{24}$/).optional().allow(null).messages({
    'string.pattern.base': 'Warehouse ID must be a valid MongoDB ObjectId',
  }),
});

