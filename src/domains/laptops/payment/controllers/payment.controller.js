/**
 * Payment Controller (Laptops Domain)
 * Handles Razorpay payment integration
 */
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Cart from '../../cart/models/Cart.model.js';
import Order from '../../order/models/Order.model.js';
import Transaction from '../models/Transaction.model.js';
import Product from '../../product/models/Product.model.js';
import { AppError, asyncHandler } from '../../../../shared/common/utils/errorHandler.js';
import { calculateOrderTotal } from '../../product/services/pricing.service.js';
import env from '../../../../shared/infrastructure/config/env.js';
import { sendOrderConfirmationEmail } from '../../../../shared/common/utils/emailService.js';
import { generateAndSaveInvoiceNumber } from '../../../../shared/common/utils/invoice.service.js';

let razorpay = null;

const getRazorpayInstance = () => {
    if (!razorpay) {
        if (!env.razorpay.keyId || !env.razorpay.keySecret) {
            console.error('Razorpay keys not configured');
            throw new AppError('Razorpay configuration missing', 500);
        }
        razorpay = new Razorpay({
            key_id: env.razorpay.keyId,
            key_secret: env.razorpay.keySecret,
        });
    }
    return razorpay;
};

/**
 * @route   POST /api/laptops/payment/create-order
 * @desc    Create Razorpay order based on cart total
 * @access  Private
 */
export const createRazorpayOrder = asyncHandler(async (req, res, next) => {
    const cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');

    if (!cart || !cart.items || cart.items.length === 0) {
        return next(new AppError('Cart is empty', 400));
    }

    const instance = getRazorpayInstance();

    // Verify stock and active status
    const productIds = cart.items.map((item) => item.productId._id);
    const products = await Product.find({
        _id: { $in: productIds },
        isActive: true,
    });

    if (products.length !== productIds.length) {
        return next(new AppError('One or more products not found or inactive', 404));
    }

    // Recalculate total to be safe
    const orderItems = [];
    for (const cartItem of cart.items) {
        const product = products.find(
            (p) => p._id.toString() === cartItem.productId._id.toString()
        );

        if (!product) {
            return next(new AppError(`Product ${cartItem.productId._id} not found`, 404));
        }

        if (product.stock < cartItem.quantity) {
            return next(
                new AppError(
                    `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${cartItem.quantity}`,
                    400
                )
            );
        }

        orderItems.push({
            productId: product._id,
            quantity: cartItem.quantity,
            priceAtPurchase: cartItem.unitPrice,
        });
    }

    const totalAmount = calculateOrderTotal(orderItems);

    // Create Razorpay Order
    const options = {
        amount: Math.round(totalAmount * 100), // amount in paise
        currency: 'INR',
        receipt: `receipt_order_${Date.now()}`,
    };

    try {
        const order = await instance.orders.create(options);

        // Log initial transaction
        await Transaction.create({
            userId: req.user._id,
            razorpayOrderId: order.id,
            amount: totalAmount,
            currency: 'INR',
            status: 'PENDING',
            paymentMethod: 'RAZORPAY'
        });

        res.status(200).json({
            success: true,
            data: order,
            key: env.razorpay.keyId
        });
    } catch (error) {
        console.error('Razorpay Order Create Error:', error);
        return next(new AppError('Failed to create payment order', 500));
    }
});

/**
 * @route   POST /api/laptops/payment/verify-payment
 * @desc    Verify payment signature and place order
 * @access  Private
 */
export const verifyPaymentAndPlaceOrder = asyncHandler(async (req, res, next) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        shippingAddress,
        billingAddress,
        contactEmail,
        contactPhone,
        notes
    } = req.body;

    const generated_signature = crypto
        .createHmac('sha256', env.razorpay.keySecret)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');

    if (generated_signature !== razorpay_signature) {
        // Log failed transaction
        await Transaction.create({
            userId: req.user._id,
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            amount: 0, // Amount might be unknown here or can be fetched
            status: 'FAILED',
            paymentMethod: 'RAZORPAY',
            errorDescription: 'Signature verification failed'
        });
        return next(new AppError('Payment verification failed', 400));
    }

    // Payment is valid, now proceed to create the Order in DB
    const cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');

    if (!cart || !cart.items || cart.items.length === 0) {
        return next(new AppError('Cart is empty', 400));
    }

    const orderType = req.user.role === 'B2B_BUYER' ? 'B2B' : 'B2C';
    const orderItems = [];
    const productIds = cart.items.map((item) => item.productId._id);

    const products = await Product.find({
        _id: { $in: productIds },
        isActive: true
    });

    for (const cartItem of cart.items) {
        const product = products.find(p => p._id.toString() === cartItem.productId._id.toString());

        if (product) {
            orderItems.push({
                productId: product._id,
                quantity: cartItem.quantity,
                priceAtPurchase: cartItem.unitPrice,
                selectedWarranty: cartItem.selectedWarranty,
                selectedConfig: cartItem.selectedConfig
            });
            // Deduct stock IMMEDIATELY since payment is confirmed
            await Product.findByIdAndUpdate(product._id, {
                $inc: { stock: -cartItem.quantity, soldCount: cartItem.quantity }
            });
        }
    }

    const totalAmount = calculateOrderTotal(orderItems);
    const finalBillingAddress = billingAddress || shippingAddress;

    const order = await Order.create({
        userId: req.user._id,
        products: orderItems,
        orderType,
        status: 'APPROVED', // Auto-approve since paid
        totalAmount,
        shippingAddress,
        billingAddress: finalBillingAddress,
        contactEmail,
        contactPhone,
        paymentMethod: 'ONLINE', // Or RAZORPAY
        paymentStatus: 'PAID',
        paymentDetails: {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        },
        notes: notes || '',
    });

    // Log successful transaction
    await Transaction.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        {
            userId: req.user._id,
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            amount: totalAmount,
            status: 'SUCCESS',
            orderId: order._id,
            paymentMethod: 'RAZORPAY'
        },
        { upsert: true, new: true }
    );

    // Clear Cart
    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();


    await order.populate('products.productId', 'name description');

    // Generate Invoice Number
    try {
        await generateAndSaveInvoiceNumber(order);
    } catch (error) {
        console.error('Failed to generate invoice number:', error);
        // Don't block the response, just log it
    }

    // Send Order Confirmation Email
    try {
        await sendOrderConfirmationEmail(order);
    } catch (error) {
        console.error('Failed to send order confirmation email:', error);
        // Don't block the response, just log it
    }

    res.status(201).json({
        success: true,
        data: { order },
        message: 'Payment successful and order placed',
    });
});

//////