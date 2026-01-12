
import { asyncHandler, AppError } from '../../../../shared/common/utils/errorHandler.js';
import { shiprocketService } from '../services/shiprocket.service.js';
import Order from '../../order/models/Order.model.js';
import User from '../../auth/models/User.model.js';
import Product from '../../product/models/Product.model.js';

// Ensure User and Product models are loaded for population
try { void User.modelName; void Product.modelName; } catch (e) { }

/**
 * @route   POST /api/laptops/shipping/create-shipment
 * @desc    Create a shipment via Shiprocket
 * @access  Private (Admin/Seller)
 */
export const createShipment = asyncHandler(async (req, res, next) => {
    // Ensure Product model is registered on the active connection before populate
    try { void Product.modelName; } catch (e) { }

    const { orderId, length, breadth, height, weight, courierId } = req.body;

    if (!orderId || !length || !breadth || !height || !weight) {
        return next(new AppError('Please provide orderId and package dimensions', 400));
    }

    const order = await Order.findById(orderId)
        .populate('userId', 'name email mobile')
        .populate('products.productId', 'name sku');

    if (!order) {
        return next(new AppError('Order not found', 404));
    }

    // Format date for Shiprocket (YYYY-MM-DD HH:mm)
    const orderDate = new Date(order.createdAt).toISOString().slice(0, 16).replace('T', ' ');

    const billing_customer_name = order.userId.name.split(' ')[0];
    const billing_last_name = order.userId.name.split(' ')[1] || '';
    const billing_address = order.shippingAddress.addressLine1;
    const billing_address_2 = order.shippingAddress.addressLine2 || '';
    const billing_city = order.shippingAddress.city;
    const billing_pincode = order.shippingAddress.postalCode;
    const billing_state = order.shippingAddress.state;
    const billing_country = order.shippingAddress.country || 'India';
    const billing_email = order.contactEmail || order.userId.email;
    const billing_phone = order.shippingAddress.phone || order.contactPhone || '9999999999';

    // Prepare payload for Shiprocket
    const shipmentPayload = {
        order_id: orderId, // Our internal Order ID
        order_date: orderDate,
        pickup_location: "home", // Updated to match user's Shiprocket nickname

        billing_customer_name: order.userId.name ? order.userId.name.split(' ')[0] : 'Guest',
        billing_last_name: (order.userId.name && order.userId.name.split(' ').length > 1) ? order.userId.name.split(' ')[1] : '',
        billing_address: order.shippingAddress.addressLine1,
        billing_address_2: order.shippingAddress.addressLine2 || '',
        billing_city: order.shippingAddress.city,
        billing_pincode: order.shippingAddress.postalCode,
        billing_state: order.shippingAddress.state,
        billing_country: order.shippingAddress.country || 'India',
        billing_email: order.contactEmail || order.userId.email,
        billing_phone: order.shippingAddress.phone || order.contactPhone || '9999999999',

        shipping_is_billing: true, // Let Shiprocket copy billing to shipping

        order_items: order.products.map(item => ({
            name: item.productId ? item.productId.name : 'Unknown Product',
            sku: item.productId ? item.productId._id.toString() : 'UNKNOWN',
            units: item.quantity,
            selling_price: item.priceAtPurchase,
            discount: 0,
            tax: 0,
        })),
        payment_method: "Prepaid",
        shipping_charges: 0,
        giftwrap_charges: 0,
        transaction_charges: 0,
        total_discount: 0,
        sub_total: order.totalAmount,
        length: parseFloat(length),
        breadth: parseFloat(breadth),
        height: parseFloat(height),
        weight: parseFloat(weight)
    };

    console.log("DEBUG: Shiprocket Payload:", JSON.stringify(shipmentPayload, null, 2));
    console.log("DEBUG: Order Shipping Address:", order.shippingAddress);


    // 1. Create Order in Shiprocket
    const shiprocketResponse = await shiprocketService.createOrder(shipmentPayload);

    // 2. Update our Order status
    order.status = 'SHIPPED';
    // You might want to save the Shiprocket Order ID and Shipment ID to the order model
    // Ideally, add new fields to Order model: trackingId, logisticsProvider, etc.
    // For now, let's just update the status.

    await order.save();

    res.status(200).json({
        success: true,
        message: 'Shipment created successfully',
        data: shiprocketResponse
    });
});

/**
 * @route   POST /api/laptops/shipping/calculate-rates
 * @desc    Check serviceability and shipping rates
 * @access  Private
 */
export const calculateRates = asyncHandler(async (req, res, next) => {
    let { orderId, pickup_postcode, delivery_postcode, weight, declared_value, cod } = req.body;

    // If orderId is provided, fetch details from DB
    if (orderId) {
        // Ensure Product imported locally if needed, though likely already handled
        try { void Product.modelName; } catch (e) { }

        const order = await Order.findById(orderId).populate('products.productId');
        if (!order) return next(new AppError('Order not found', 404));

        if (!delivery_postcode) delivery_postcode = order.shippingAddress.postalCode;
        if (!declared_value) declared_value = order.totalAmount;
        // Default weight if not provided could be calculated from product specs if stored
        if (!weight) weight = 0.5; // Default minimal weight if missing

        // Default pickup postcode (User's Warehouse) if not provided
        if (!pickup_postcode) pickup_postcode = "560098";

        // Determine COD based on order payment details (assuming 'pending' or 'COD' indicates cod)
        // Adjust logic based on your actual Payment Status/Method fields
        if (cod === undefined) {
            cod = (order.paymentMethod === 'COD') ? 1 : 0;
        }
    }

    if (!pickup_postcode || !delivery_postcode || !weight) {
        return next(new AppError('Please provide pickup_postcode, delivery_postcode, and weight', 400));
    }

    const rates = await shiprocketService.checkServiceability({
        pickup_postcode,
        delivery_postcode,
        weight,
        declared_value: declared_value || 1000,
        cod: cod ? 1 : 0
    });

    res.status(200).json({
        success: true,
        data: rates
    });
});
