/**
 * Banner Model (Flowers Domain)
 * Stores marketing banners and offers
 */
import mongoose from 'mongoose';
import { getConnection, isConnected } from '../../../../shared/infrastructure/database/connections.js';

const bannerSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Banner title is required'],
            trim: true,
        },
        subtitle: {
            type: String,
            trim: true,
            default: '',
        },
        image: {
            type: String,
            required: [true, 'Banner image is required'],
        },
        type: {
            type: String,
            enum: ['HOME HERO', 'OFFER', 'POPUP', 'SECTION'],
            default: 'HOME HERO',
            uppercase: true,
        },
        subtype: {
            type: String,
            enum: ['flower', 'cake', 'chocolate', 'discount', 'other'],
            default: 'flower',
            lowercase: true,
        },
        link: {
            type: String,
            default: '',
        },
        color: {
            type: String,
            default: 'bg-blue-600', // Default tailwind class or hex
        },
        order: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster queries
bannerSchema.index({ isActive: 1, type: 1, order: 1 });

// Lazy-load the model to handle multi-connection setup
let Banner = null;

const getBannerModel = () => {
    if (isConnected('flowers')) {
        try {
            const conn = getConnection('flowers');
            Banner = conn.model('Banner', bannerSchema);
        } catch (error) {
            if (!Banner) {
                Banner = mongoose.model('Banner', bannerSchema);
            }
        }
    } else {
        if (!Banner) {
            Banner = mongoose.model('Banner', bannerSchema);
        }
    }
    return Banner;
};

export default new Proxy(function () { }, {
    construct(target, args) {
        return new (getBannerModel())(...args);
    },
    get(target, prop) {
        const model = getBannerModel();
        const value = model[prop];
        if (typeof value === 'function') {
            return value.bind(model);
        }
        return value;
    },
    apply(target, thisArg, args) {
        return getBannerModel().apply(thisArg, args);
    }
});
