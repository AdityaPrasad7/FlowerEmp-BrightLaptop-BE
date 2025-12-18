/**
 * MOQ (Minimum Order Quantity) Service (Laptops Domain)
 * Handles MOQ validation logic for B2B orders
 */

/**
 * Validates if order quantity meets MOQ requirement
 * @param {number} quantity - Order quantity
 * @param {number} moq - Minimum order quantity
 * @param {string} orderType - Order type (B2B or B2C)
 * @returns {Object} Validation result with isValid and message
 */
export const validateMOQ = (quantity, moq, orderType) => {
  // B2C orders don't have MOQ restrictions (minimum is 1)
  if (orderType === 'B2C') {
    return {
      isValid: quantity >= 1,
      message: quantity < 1 ? 'Quantity must be at least 1' : null,
    };
  }

  // B2B orders must meet MOQ
  if (orderType === 'B2B') {
    if (quantity < moq) {
      return {
        isValid: false,
        message: `Minimum order quantity (MOQ) for this product is ${moq}. You ordered ${quantity} units.`,
      };
    }
    return {
      isValid: true,
      message: null,
    };
  }

  return {
    isValid: false,
    message: 'Invalid order type',
  };
};

/**
 * Validates all products in an order meet their respective MOQ requirements
 * @param {Array} products - Array of products with quantity
 * @param {string} orderType - Order type (B2B or B2C)
 * @returns {Object} Validation result
 */
export const validateOrderMOQ = async (products, orderType) => {
  const validationErrors = [];

  for (const item of products) {
    const moqValidation = validateMOQ(item.quantity, item.moq, orderType);
    if (!moqValidation.isValid) {
      validationErrors.push({
        productId: item.productId,
        productName: item.productName || 'Unknown',
        message: moqValidation.message,
      });
    }
  }

  return {
    isValid: validationErrors.length === 0,
    errors: validationErrors,
  };
};

