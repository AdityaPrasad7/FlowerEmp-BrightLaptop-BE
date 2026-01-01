/**
 * Transaction Model (Flowers Domain)
 * Tracks all payment attempts and financial records
 */
import mongoose from 'mongoose';
import { getConnection, isConnected } from '../../../../shared/infrastructure/database/connections.js';
import OrderModel from '../../order/models/Order.model.js';
import UserModel from '../../auth/models/User.model.js';

const transactionSchema = new mongoose.Schema(
    {
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        paymentMethod: {
            type: String,
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            default: 'KWD',
        },
        status: {
            type: String,
            enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
            default: 'PENDING',
        },
        type: {
            type: String,
            enum: ['PAYMENT', 'REFUND'],
            default: 'PAYMENT'
        },
        // Gateway specific fields
        gateway: {
            type: String,
            default: 'MYFATOORAH',
        },
        paymentId: String,       // Gateway PaymentId
        invoiceId: String,       // Gateway InvoiceId
        invoiceReference: String,
        transactionId: String,

        metadata: {
            type: mongoose.Schema.Types.Mixed, // Store raw response or extra details
        }
    },
    {
        timestamps: true,
    }
);

// Indexes
transactionSchema.index({ orderId: 1 });
transactionSchema.index({ paymentId: 1 });
transactionSchema.index({ invoiceId: 1 });
transactionSchema.index({ status: 1 });

// Lazy-load the model
let Transaction = null;

const getTransactionModel = () => {
    if (isConnected('flowers')) {
        try {
            const conn = getConnection('flowers');

            // Register dependencies if needed (Order, User)
            if (!conn.models.Order) { if (OrderModel) void OrderModel.modelName; }
            if (!conn.models.User) { if (UserModel) void UserModel.modelName; }

            Transaction = conn.model('Transaction', transactionSchema);
        } catch (error) {
            if (!Transaction) Transaction = mongoose.model('Transaction', transactionSchema);
        }
    } else {
        if (!Transaction) Transaction = mongoose.model('Transaction', transactionSchema);
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
