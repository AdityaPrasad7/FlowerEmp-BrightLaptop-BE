/**
 * Transaction Model (Laptops Domain)
 * Stores details of all payment transactions
 */
import mongoose from 'mongoose';
import { getConnection, isConnected } from '../../../../shared/infrastructure/database/connections.js';

const transactionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            required: false, // Might be created before order exists (conceptually), but here likely used after
        },
        razorpayOrderId: {
            type: String,
            required: true,
            index: true,
        },
        razorpayPaymentId: {
            type: String,
            required: false, // Not present if payment fails/abandoned
            index: true,
        },
        razorpaySignature: {
            type: String,
            required: false,
        },
        amount: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            default: 'INR',
        },
        status: {
            type: String,
            enum: ['PENDING', 'SUCCESS', 'FAILED'],
            default: 'PENDING',
        },
        paymentMethod: {
            type: String,
            enum: ['COD', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'NET_BANKING', 'WALLET', 'OTHER', 'ONLINE', 'RAZORPAY'],
            default: 'RAZORPAY'
        },
        errorDescription: {
            type: String,
            required: false
        }
    },
    {
        timestamps: true,
    }
);

// Lazy-load the model
let Transaction = null;

const getTransactionModel = () => {
    if (isConnected('laptops')) {
        try {
            const conn = getConnection('laptops');
            Transaction = conn.model('Transaction', transactionSchema);
        } catch (error) {
            if (!Transaction) {
                Transaction = mongoose.model('Transaction', transactionSchema);
            }
        }
    } else {
        if (!Transaction) {
            Transaction = mongoose.model('Transaction', transactionSchema);
        }
    }
    return Transaction;
};

export default new Proxy(function () { }, {
    construct(target, args) {
        return new (getTransactionModel())(...args);
    },
    get(target, prop) {
        const model = getTransactionModel();
        const value = model[prop];
        if (typeof value === 'function') {
            return value.bind(model);
        }
        return value;
    },
    apply(target, thisArg, args) {
        return getTransactionModel().apply(thisArg, args);
    }
});
