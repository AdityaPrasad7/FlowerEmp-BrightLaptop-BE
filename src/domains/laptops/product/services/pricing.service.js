/**
 * Pricing Service (Laptops Domain)
 * Handles price calculations including bulk pricing and B2B pricing logic
 */

/**
 * Calculate price for a single product based on quantity and user role
 * Applies B2B price for B2B buyers when quantity >= MOQ
 * Applies bulk pricing if applicable, otherwise uses base price
 * @param {number} basePrice - Base/retail price of the product
 * @param {number} quantity - Order quantity
 * @param {string} userRole - User role (B2B_BUYER, B2C_BUYER, etc.)
 * @param {number} b2bPrice - B2B price (optional, set by seller/admin)
 * @param {number} moq - Minimum Order Quantity (used for B2B pricing only, not order validation)
 * @param {Array} bulkPricing - Array of bulk pricing tiers [{ minQty, price }]
 * @returns {number} Calculated price per unit
 */
export const calculateUnitPrice = (
  basePrice,
  quantity,
  userRole,
  b2bPrice = null,
  moq = 1,
  bulkPricing = []
) => {
  // B2B buyers: Check if they qualify for B2B price
  // B2B price applies when quantity >= MOQ (same as order validation)
  if (
    userRole === 'B2B_BUYER' &&
    b2bPrice !== null &&
    quantity >= moq
  ) {
    // Use B2B price as base for bulk pricing calculation
    const effectiveBasePrice = b2bPrice;
    
    // Apply bulk pricing on top of B2B price if applicable
    if (bulkPricing && bulkPricing.length > 0) {
      const sortedBulkPricing = [...bulkPricing].sort((a, b) => b.minQty - a.minQty);
      for (const tier of sortedBulkPricing) {
        if (quantity >= tier.minQty) {
          return tier.price;
        }
      }
    }
    
    return effectiveBasePrice;
  }

  // B2C buyers or B2B buyers below threshold: Use retail/base price
  // Apply bulk pricing if applicable
  if (bulkPricing && bulkPricing.length > 0) {
    const sortedBulkPricing = [...bulkPricing].sort((a, b) => b.minQty - a.minQty);
    for (const tier of sortedBulkPricing) {
      if (quantity >= tier.minQty) {
        return tier.price;
      }
    }
  }

  // Default: Return base/retail price
  return basePrice;
};

/**
 * Calculate total price for an order item
 * @param {number} basePrice - Base price of the product
 * @param {number} quantity - Order quantity
 * @param {string} userRole - User role
 * @param {number} b2bPrice - B2B price (optional)
 * @param {number} moq - Minimum Order Quantity
 * @param {Array} bulkPricing - Array of bulk pricing tiers
 * @returns {number} Total price for the item
 */
export const calculateItemTotal = (
  basePrice,
  quantity,
  userRole,
  b2bPrice = null,
  moq = 1,
  bulkPricing = []
) => {
  const unitPrice = calculateUnitPrice(
    basePrice,
    quantity,
    userRole,
    b2bPrice,
    moq,
    bulkPricing
  );
  return unitPrice * quantity;
};

/**
 * Calculate total amount for an entire order
 * @param {Array} items - Array of order items with price and quantity
 * @returns {number} Total order amount
 */
export const calculateOrderTotal = (items) => {
  return items.reduce((total, item) => {
    return total + item.priceAtPurchase * item.quantity;
  }, 0);
};

