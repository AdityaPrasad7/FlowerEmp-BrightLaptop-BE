/**
 * Complaint Model (Laptops Support Domain)
 * specific for handling user complaints/tickets
 */
import mongoose from 'mongoose';
import { getConnection, isConnected } from '../../../../shared/infrastructure/database/connections.js';

const complaintSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // Refers to the User model in Laptops domain
            required: [true, 'User ID is required'],
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order', // Optional: complaint might not be linked to a specific order
        },
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product', // Product from Laptops domain
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
            trim: true,
            maxlength: [1000, 'Description cannot exceed 1000 characters'],
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            trim: true,
        },
        voiceMessage: {
            type: String, // URL to the uploaded voice message audio file
            trim: true,
        },
        status: {
            type: String,
            enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
            default: 'OPEN',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
complaintSchema.index({ userId: 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ orderId: 1 });
complaintSchema.index({ productId: 1 });

// Lazy-load the model
let Complaint = null;

const getComplaintModel = () => {
    if (isConnected('laptops')) {
        try {
            const conn = getConnection('laptops');
            Complaint = conn.model('Complaint', complaintSchema);
        } catch (error) {
            if (!Complaint) {
                Complaint = mongoose.model('Complaint', complaintSchema);
            }
        }
    } else {
        if (!Complaint) {
            Complaint = mongoose.model('Complaint', complaintSchema);
        }
    }
    return Complaint;
};

export default new Proxy(function () { }, {
    construct(target, args) {
        return new (getComplaintModel())(...args);
    },
    get(target, prop) {
        const model = getComplaintModel();
        const value = model[prop];
        if (typeof value === 'function') {
            return value.bind(model);
        }
        return value;
    },
    apply(target, thisArg, args) {
        return getComplaintModel().apply(thisArg, args);
    }
});
