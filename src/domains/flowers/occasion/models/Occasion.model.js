/**
 * Occasion Model (Flowers Domain)
 * Defines schema for flower occasions (e.g., Birthday, Anniversary)
 */
import mongoose from 'mongoose';
import { getConnection, isConnected } from '../../../../shared/infrastructure/database/connections.js';
// Import User model if needed for population, though we might not need to populate creator often
import UserModel from '../../auth/models/User.model.js';

const occasionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Occasion name is required'],
            trim: true,
            unique: true,
            minlength: [2, 'Occasion must be at least 2 characters'],
            maxlength: [50, 'Occasion must not exceed 50 characters'],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Creator ID is required'],
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
occasionSchema.index({ name: 1 }, { unique: true });
occasionSchema.index({ isActive: 1 });

// Lazy-load the model
let Occasion = null;

const getOccasionModel = () => {
    if (isConnected('flowers')) {
        try {
            const conn = getConnection('flowers');
            // Ensure User model is registered
            if (!conn.models.User) {
                try {
                    if (UserModel) void UserModel.modelName;
                } catch (e) { }
            }
            Occasion = conn.model('Occasion', occasionSchema);
        } catch (error) {
            if (!Occasion) {
                Occasion = mongoose.model('Occasion', occasionSchema);
            }
        }
    } else {
        if (!Occasion) {
            Occasion = mongoose.model('Occasion', occasionSchema);
        }
    }
    return Occasion;
};

export default new Proxy(function () { }, {
    construct(target, args) {
        return new (getOccasionModel())(...args);
    },
    get(target, prop) {
        const model = getOccasionModel();
        const value = model[prop];
        if (typeof value === 'function') {
            return value.bind(model);
        }
        return value;
    },
    apply(target, thisArg, args) {
        return getOccasionModel().apply(thisArg, args);
    }
});
