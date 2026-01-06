import mongoose from 'mongoose';
import { getConnection, isConnected } from '../../../../shared/infrastructure/database/connections.js';
import UserModel from '../../auth/models/User.model.js';

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['INFO', 'SUCCESS', 'WARNING', 'ERROR'],
        default: 'INFO'
    },
    link: {
        type: String,
        default: '' // e.g., '/account/orders/123'
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for fetching user's notifications quickly
notificationSchema.index({ userId: 1, createdAt: -1 });
    
// Lazy-load the model
let Notification = null;

const getNotificationModel = () => {
    if (isConnected('flowers')) {
        try {
            const conn = getConnection('flowers');

            // Ensure User model is registered
            if (!conn.models.User) {
                try {
                    if (UserModel) void UserModel.modelName;
                } catch (e) { }
            }

            Notification = conn.model('Notification', notificationSchema);
        } catch (error) {
            if (!Notification) {
                Notification = mongoose.model('Notification', notificationSchema);
            }
        }
    } else {
        if (!Notification) {
            Notification = mongoose.model('Notification', notificationSchema);
        }
    }
    return Notification;
};

export default new Proxy(function () { }, {
    construct(target, args) {
        return new (getNotificationModel())(...args);
    },
    get(target, prop) {
        const model = getNotificationModel();
        const value = model[prop];
        if (typeof value === 'function') {
            return value.bind(model);
        }
        return value;
    },
    apply(target, thisArg, args) {
        return getNotificationModel().apply(thisArg, args);
    }
});
