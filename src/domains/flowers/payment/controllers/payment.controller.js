/**
 * Payment Controller
 * Handles MyFatoorah payment gateway operations
 */
import axios from 'axios';
// import env from '../../../shared/infrastructure/config/env.js';
import env from '../../../../shared/infrastructure/config/env.js';
import { AppError } from '../../../../shared/common/utils/errorHandler.js';

/**
 * Get available payment methods
 */
export const getPaymentMethods = async (req, res, next) => {
    try {
        const { url, token } = env.myFatoorah;

        // We are using InitiatePayment as used in the source implementation
        const response = await axios.post(`${url}/v2/InitiatePayment`, {
            InvoiceAmount: 10, // Dummy amount just to get methods
            CurrencyIso: "KWD"
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        res.status(200).json(response.data);
    } catch (error) {
        next(error);
    }
};

/**
 * Execute payment
 */
export const executePayment = async (req, res, next) => {
    try {
        const { paymentMethodId, customerName, customerEmail, invoiceValue, customerPhone } = req.body;
        const { url, token } = env.myFatoorah;

        // Determine frontend URL based on the request origin or fallback
        // In production this should be strictly configured, but for now we follow the pattern
        const FRONTEND_URL = req.headers.origin || 'http://localhost:5173';

        const payload = {
            PaymentMethodId: paymentMethodId,
            CustomerName: customerName || 'Customer',
            DisplayCurrencyIso: 'KWD',
            MobileCountryCode: '+965',
            CustomerMobile: customerPhone || '12345678',
            CustomerEmail: customerEmail || 'test@test.com',
            InvoiceValue: invoiceValue,
            CallBackUrl: `${FRONTEND_URL}/payment-success`,
            ErrorUrl: `${FRONTEND_URL}/payment-error`,
            Language: 'en',
            UserDefinedField: req.body.orderId, // Pass Order ID for retrieval in callback
        };

        const response = await axios.post(`${url}/v2/ExecutePayment`, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        res.status(200).json(response.data);
    } catch (error) {
        // Pass axios error details if available for better debugging
        if (error.response) {
            error.statusCode = error.response.status;
            error.message = error.response.data?.Message || error.message;
        }
        next(error);
    }
};

/**
 * Verify payment and update order
 */
export const verifyPayment = async (req, res, next) => {
    try {
        const { paymentId } = req.body;
        const { url, token } = env.myFatoorah;

        // 1. Get Payment Status from MyFatoorah
        const response = await axios.post(`${url}/v2/GetPaymentStatus`, {
            Key: paymentId,
            KeyType: 'PaymentId'
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const paymentData = response.data.Data;

        if (!paymentData) {
            return next(new AppError('Payment not found', 404));
        }

        // 2. Retrieve Order ID from UDF
        const orderId = paymentData.UserDefinedField;
        if (!orderId) {
            return next(new AppError('Order ID not found in payment metadata', 400));
        }

        // 3. Find Order
        const Order = (await import('../../order/models/Order.model.js')).default;
        const order = await Order.findById(orderId);

        if (!order) {
            return next(new AppError('Order not found', 404));
        }

        // 4. Check if already processed
        if (order.status !== 'PENDING' && order.paymentStatus === 'PAID') {
            return res.status(200).json({
                success: true,
                message: 'Order already processed',
                data: { order }
            });
        }

        // 5. Create Transaction Record
        const Transaction = (await import('../models/Transaction.model.js')).default;

        // Check idempotent
        let transaction = await Transaction.findOne({ paymentId });

        if (!transaction) {
            transaction = await Transaction.create({
                orderId: order._id,
                userId: order.userId,
                paymentMethod: paymentData.PaymentMethod || order.paymentMethod,
                amount: paymentData.InvoiceValue,
                currency: paymentData.InvoiceTransactions?.[0]?.Currency || 'KWD',
                status: paymentData.InvoiceStatus === 'Paid' ? 'SUCCESS' : 'FAILED',
                gateway: 'MYFATOORAH',
                paymentId: paymentId,
                invoiceId: paymentData.InvoiceId,
                invoiceReference: paymentData.InvoiceReference,
                transactionId: paymentData.InvoiceTransactions?.[0]?.TransactionId,
                metadata: paymentData
            });
        }

        // 6. Update Order based on Transaction
        if (transaction.status === 'SUCCESS') {
            // Only update order if it's not already paid (idempotency)
            // or if we just verified it

            if (order.status !== 'APPROVED' && order.paymentStatus !== 'PAID') {
                order.paymentStatus = 'PAID';
                order.status = 'APPROVED';
                order.paymentMethod = transaction.paymentMethod;

                // Link summary
                order.paymentDetails = {
                    paymentId: transaction.paymentId,
                    transactionId: transaction.transactionId,
                    status: transaction.status
                };

                await order.save();

                // 7. Deduct Stock
                const Product = (await import('../../product/models/Product.model.js')).default;
                for (const item of order.products) {
                    await Product.findByIdAndUpdate(item.productId, {
                        $inc: { stock: -item.quantity },
                    });
                }
            }

            return res.status(200).json({
                success: true,
                message: 'Payment verified and order approved',
                data: { order, transaction }
            });

        } else {
            // Handle Failure
            order.paymentStatus = 'FAILED';

            // Link summary even on failure
            order.paymentDetails = {
                paymentId: transaction.paymentId,
                status: transaction.status
            };

            await order.save();

            return res.status(400).json({
                success: false,
                message: 'Payment failed',
                data: { status: transaction.status, transaction }
            });
        }

    } catch (error) {
        if (error.response) {
            console.error("MyFatoorah Verify Error:", error.response.data);
        }
        next(error);
    }
};

/**
 * Get payment status
 */
export const getPaymentStatus = async (req, res, next) => {
    try {
        const { key, keyType } = req.body; // key is PaymentId or InvoiceId
        const { url, token } = env.myFatoorah;

        const response = await axios.post(`${url}/v2/GetPaymentStatus`, {
            Key: key,
            KeyType: keyType // 'PaymentId' or 'InvoiceId'
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        res.status(200).json(response.data);
    } catch (error) {
        if (error.response) {
            error.statusCode = error.response.status;
            error.message = error.response.data?.Message || error.message;
        }
        next(error);
    }
};
