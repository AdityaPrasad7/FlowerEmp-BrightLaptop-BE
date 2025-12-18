/**
 * Pricing Service (Flowers Domain)
 * Simple pricing - just returns base price (no MOQ, bulk pricing, or B2B pricing)
 */

/**
 * Calculate price for a single product
 * For flowers domain, always returns base price
 * @param {number} basePrice - Base/retail price of the product
 * @param {number} quantity - Order quantity (not used, kept for compatibility)
 * @param {string} userRole - User role (not used, kept for compatibility)
 * @returns {number} Base price
 */
export const calculateUnitPrice = (basePrice, quantity, userRole) => {
  // Simple pricing - always return base price
  return basePrice;
};

/**
 * Calculate total price for an order item
 * @param {number} basePrice - Base price of the product
 * @param {number} quantity - Order quantity
 * @param {string} userRole - User role (not used, kept for compatibility)
 * @returns {number} Total price for the item
 */
export const calculateItemTotal = (basePrice, quantity, userRole) => {
  return basePrice * quantity;
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
