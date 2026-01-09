/**
 * Warehouse Model (Laptops Domain)
 * specific for managing inventory locations
 */
import mongoose from 'mongoose';
import { getConnection, isConnected } from '../../../../shared/infrastructure/database/connections.js';

const warehouseSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Warehouse name is required'],
            trim: true,
            unique: true,
        },
        location: {
            type: String,
            required: [true, 'Location/City varies is required'],
            trim: true,
        },
        address: {
            type: String,
            required: [true, 'Full address is required'],
            trim: true,
        },
        manager: {
            type: String,
            default: 'Unassigned',
            trim: true,
        },
        contact: {
            type: String,
            required: [true, 'Contact number is required'],
            trim: true,
        },
        stock: {
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
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Lazy-load the model
let Warehouse = null;

const getWarehouseModel = () => {
    if (isConnected('laptops')) {
        try {
            const conn = getConnection('laptops');
            Warehouse = conn.model('Warehouse', warehouseSchema);
        } catch (error) {
            if (!Warehouse) {
                Warehouse = mongoose.model('Warehouse', warehouseSchema);
            }
        }
    } else {
        if (!Warehouse) {
            Warehouse = mongoose.model('Warehouse', warehouseSchema);
        }
    }
    return Warehouse;
};

export default new Proxy(function () { }, {
    construct(target, args) {
        return new (getWarehouseModel())(...args);
    },
    get(target, prop) {
        const model = getWarehouseModel();
        const value = model[prop];
        if (typeof value === 'function') {
            return value.bind(model);
        }
        return value;
    },
    apply(target, thisArg, args) {
        return getWarehouseModel().apply(thisArg, args);
    }
});
