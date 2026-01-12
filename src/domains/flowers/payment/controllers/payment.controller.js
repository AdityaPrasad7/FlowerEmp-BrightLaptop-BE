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
        console.log("url", url);
        console.log("token", token);



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
        console.log("error", error);

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
        // 3. Find Order
        const Order = (await import('../../order/models/Order.model.js')).default;
        const order = await Order.findById(orderId).populate('userId', 'name email phone'); // Populate user details

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

        // Define services inside (dynamic import or moved import)
        // Since we are inside a function and this file uses top-level imports, we should add imports at top of file.
        // But for this patch, I will use the imports provided in the top of the file if I added them. 
        // Wait, replace_file_content replaces chunk. I should add imports at top first? 
        // Or if I can't see the top, I can assume I need to add them.
        // Actually, the previous view_file showed I need to add imports to payment.controller.js as well.
        // I'll assume I can add them in a separate call or just rely on existing if available. 
        // But they are NOT available. I need to add imports. this tool only replaces a chunk.
        // I will just add the logic here and use dynamic imports for services if needed or hope I can update imports later.
        // BETTER: I will use dynamic imports for services here to avoid touching the top of file and messing up lines.

        const { sendEmail } = await import('../../../../shared/common/utils/emailService.js');
        const { sendSMS } = await import('../../../../shared/common/utils/smsService.js');
        const { createNotification } = await import('../../../../shared/common/utils/notificationService.js');

        // Check idempotent
        let transaction = await Transaction.findOne({ paymentId });

        if (!transaction) {
            transaction = await Transaction.create({
                orderId: order._id,
                userId: order.userId._id, // order.userId is now an object due to populate
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

                // 🔔 NOTIFICATIONS: Payment Success
                const user = order.userId; // Populated above
                try {
                    console.log("user", user);


                    // 0. Persistent Notification (In-App)
                    await createNotification(
                        user._id,
                        'Payment Successful',
                        `Payment of ${transaction.amount} KD received for Order #${order.orderId}.`,
                        'SUCCESS',
                        `/account/orders/${order._id}`
                    );

                    // 1. Send SMS
                    if (user.phone) {
                        await sendSMS(
                            user.phone,
                            `Hi ${user.name}, your order #${order.orderId} is confirmed! Payment received: ${transaction.amount} KD. We will deliver appropriately.`
                        );
                    }

                    // 2. Send Email
                    const emailHtml = `
                          <h2>Payment Successful!</h2>
                          <p>Hi ${user.name},</p>
                          <p>Your payment for order <strong>#${order.orderId}</strong> was successful.</p>
                          <p><strong>Transaction ID:</strong> ${transaction.transactionId}</p>
                          <p><strong>Amount Paid:</strong> ${transaction.amount} KD</p>
                          <p>We are preparing your flowers now!</p>
                      `;

                    await sendEmail({
                        to: user.email,
                        subject: `Payment Receipt & Order Confirmation #${order.orderId} - Flower Emporium`,
                        html: emailHtml
                    });

                } catch (notifyError) {
                    console.error("Payment Notification Error:", notifyError.message);
                }

                // 🔔 ADMIN NOTIFICATION: New Order Placed (Verified)
                const { notifyAdmins } = await import('../../../../shared/common/utils/notificationService.js');
                await notifyAdmins(
                    'New Order Placed',
                    `Order #${order.orderId} placed by ${user.name} (Paid Online)`,
                    'SUCCESS',
                    `/orders/${order._id}`
                );
            }

            return res.status(200).json({
                success: true,
                message: 'Payment verified and order approved',
                data: { order, transaction }
            });

        } else {
            // Handle Failure - ABANDONED CHECKOUT LOGIC
            order.paymentStatus = 'FAILED';

            // Link summary even on failure
            order.paymentDetails = {
                paymentId: transaction.paymentId,
                status: transaction.status
            };

            await order.save();

            // 🔔 NOTIFICATIONS: Payment Failed / Abandoned Checkout
            try {
                const user = order.userId;
                const { notifyAdmins } = await import('../../../../shared/common/utils/notificationService.js');

                // 1. Email to User (Immediate Action Required)
                const emailHtml = `
                    <h2>Payment Failed</h2>
                    <p>Hi ${user.name},</p>
                    <p>We noticed your payment for order <strong>#${order.orderId}</strong> was not completed.</p>
                    <p><strong>Reason:</strong> ${transaction.status} (Gateway Response)</p>
                    <p>Don't worry! Your items are saved. Please click below to try again or choose a different payment method.</p>
                    <p><a href="${// Use FRONTEND_URL or configured env URL
                    req.headers.origin || 'https://floweremporium.com'}/checkout">Complete Your Purchase</a></p>
                `;

                await sendEmail({
                    to: user.email,
                    subject: `Action Required: Payment Failed for Order #${order.orderId}`,
                    html: emailHtml
                });

                // 2. Notify Admin (Abandoned Checkout Alert)
                await notifyAdmins(
                    'Abandoned Checkout Detected',
                    `Payment failed for Order #${order.orderId} (${transaction.amount} KD) by ${user.name}. Status: ${transaction.status}.`,
                    'WARNING',
                    `/orders/${order._id}` // Link to order details (or abandoned list if exists)
                );

            } catch (notifyError) {
                console.error("Payment Failure Notification Error:", notifyError.message);
            }

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
