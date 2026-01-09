/**
 * Invoice Generation Service
 * Handles invoice number generation and invoice data formatting
 */

/**
 * Generate a unique invoice number
 * Format: INV-YYYYMMDD-XXXXXX (e.g., INV-20240115-000123)
 * @param {Date} date - Date for the invoice (defaults to now)
 * @returns {string} Invoice number
 */
export const generateInvoiceNumber = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  
  return `INV-${year}${month}${day}-${random}`;
};

/**
 * Format invoice data for PDF generation
 * @param {Object} order - Order document with populated products
 * @param {Object} user - User document
 * @returns {Object} Formatted invoice data
 */
export const formatInvoiceData = (order, user) => {
  const invoiceDate = order.invoiceGeneratedAt || order.createdAt;
  const orderDate = order.createdAt;
  
  // Calculate subtotals
  // Note: order.totalAmount already includes GST if applicable
  // For invoice display, we'll show the total amount as-is
  const subtotal = order.totalAmount || 0;
  const gstPercentage = 18; // Default GST percentage (can be configurable)
  // If GST is included in the price, calculate backwards to show breakdown
  // GST amount = (subtotal * gstPercentage) / (100 + gstPercentage)
  const gstAmount = (subtotal * gstPercentage) / (100 + gstPercentage);
  const baseSubtotal = subtotal - gstAmount;
  
  // Format order items for invoice
  const items = order.products.map((item, index) => {
    const product = item.productId;
    const quantity = item.quantity || 0;
    const unitPrice = item.priceAtPurchase || 0;
    const lineTotal = quantity * unitPrice;
    
    // Build product description with variants
    let description = product?.name || 'Product';
    if (item.selectedConfig?.ram) {
      description += ` - RAM: ${item.selectedConfig.ram}`;
    }
    if (item.selectedConfig?.storage) {
      description += `, Storage: ${item.selectedConfig.storage}`;
    }
    if (item.selectedWarranty?.duration && item.selectedWarranty.duration !== 'Default') {
      description += ` - Warranty: ${item.selectedWarranty.duration}`;
    }
    
    return {
      srNo: index + 1,
      description,
      quantity,
      unitPrice,
      lineTotal,
      warranty: item.selectedWarranty?.duration || 'Default',
      warrantyPrice: item.selectedWarranty?.price || 0,
    };
  });
  
  return {
    invoiceNumber: order.invoiceNumber,
    invoiceDate: new Date(invoiceDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    orderNumber: order._id.toString(),
    orderDate: new Date(orderDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    // Customer Information
    customer: {
      name: user?.name || order.shippingAddress?.fullName || 'Customer',
      email: order.contactEmail || user?.email || '',
      phone: order.contactPhone || order.shippingAddress?.phone || '',
      address: order.billingAddress || order.shippingAddress,
    },
    // Shipping Information
    shipping: {
      name: order.shippingAddress?.fullName || '',
      address: order.shippingAddress,
    },
    // Order Items
    items,
    // Pricing Summary
    pricing: {
      subtotal: baseSubtotal, // Subtotal before GST
      gstPercentage,
      gstAmount,
      shipping: 0, // Free shipping
      total: subtotal, // Total amount (includes GST)
    },
    // Order Details
    orderType: order.orderType,
    paymentMethod: order.paymentMethod?.replace('_', ' ') || 'COD',
    paymentStatus: order.paymentStatus,
    status: order.status,
  };
};

/**
 * Generate invoice number for an order and save it
 * This should be called when payment status changes to PAID
 * @param {Object} order - Order document
 * @returns {Promise<string>} Generated invoice number
 */
export const generateAndSaveInvoiceNumber = async (order) => {
  // Only generate if invoice number doesn't exist and payment is PAID
  if (!order.invoiceNumber && order.paymentStatus === 'PAID') {
    let invoiceNumber;
    let attempts = 0;
    const maxAttempts = 10;
    
    // Retry if invoice number already exists (collision)
    do {
      invoiceNumber = generateInvoiceNumber();
      attempts++;
      
      // Check if invoice number already exists
      const existingOrder = await order.constructor.findOne({ invoiceNumber });
      if (!existingOrder) {
        break;
      }
      
      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique invoice number after multiple attempts');
      }
    } while (attempts < maxAttempts);
    
    order.invoiceNumber = invoiceNumber;
    order.invoiceGeneratedAt = new Date();
    await order.save();
    
    return invoiceNumber;
  }
  
  return order.invoiceNumber;
};
