/**
 * Refurbishment Request Model (Laptops Domain)
 * Handles user requests for product refurbishment
 */
import mongoose from 'mongoose';
import { getConnection, isConnected } from '../../../../shared/infrastructure/database/connections.js';

const refurbishmentRequestSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User ID is required'],
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            required: [true, 'Order ID is required'],
        },
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: [true, 'Product ID is required'],
        },
        images: {
            type: [String],
            default: [],
            validate: {
                validator: function (images) {
                    return images.length > 0;
                },
                message: 'At least one image is required',
            },
        },
        issueText: {
            type: String,
            required: [true, 'Issue description is required'],
            trim: true,
            maxlength: [1000, 'Issue description cannot exceed 1000 characters'],
        },
        accessories: {
            type: [String],
            default: [],
        },
        status: {
            type: String,
            enum: ['PENDING', 'APPROVED', 'IN_TRANSIT_TO_WAREHOUSE', 'IN_REFURB', 'IN_TRANSIT_TO_CUSTOMER', 'COMPLETED'],
            default: 'PENDING',
        },
        // Shipping information for dispatch to warehouse
        warehouseShipment: {
            awbNumber: String,
            courierName: String,
            trackingNumber: String,
            dispatchedAt: Date,
        },
        // Shipping information for return to customer
        returnShipment: {
            awbNumber: String,
            courierName: String,
            trackingNumber: String,
            dispatchedAt: Date,
        },
        // Admin notes
        adminNotes: {
            type: String,
            trim: true,
        },
        // Refurbishment completion details
        completedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
refurbishmentRequestSchema.index({ userId: 1 });
refurbishmentRequestSchema.index({ orderId: 1 });
refurbishmentRequestSchema.index({ productId: 1 });
refurbishmentRequestSchema.index({ status: 1 });

// Lazy-load the model
let RefurbishmentRequest = null;

const getRefurbishmentRequestModel = () => {
    if (isConnected('laptops')) {
        try {
            const conn = getConnection('laptops');
            RefurbishmentRequest = conn.model('RefurbishmentRequest', refurbishmentRequestSchema);
        } catch (error) {
            if (!RefurbishmentRequest) {
                RefurbishmentRequest = mongoose.model('RefurbishmentRequest', refurbishmentRequestSchema);
            }
        }
    } else {
        if (!RefurbishmentRequest) {
            RefurbishmentRequest = mongoose.model('RefurbishmentRequest', refurbishmentRequestSchema);
        }
    }
    return RefurbishmentRequest;
};

export default new Proxy(function () { }, {
    construct(target, args) {
        return new (getRefurbishmentRequestModel())(...args);
    },
    get(target, prop) {
        const model = getRefurbishmentRequestModel();
        const value = model[prop];
        if (typeof value === 'function') {
            return value.bind(model);
        }
        return value;
    },
    apply(target, thisArg, args) {
        return getRefurbishmentRequestModel().apply(thisArg, args);
    }
});
