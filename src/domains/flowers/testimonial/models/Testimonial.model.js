/**
 * Testimonial Model (Flowers Domain)...
 */
import mongoose from 'mongoose';
import { getConnection, isConnected } from '../../../../shared/infrastructure/database/connections.js';

const testimonialSchema = new mongoose.Schema(
    {
        customerName: {
            type: String,
            required: [true, 'Customer name is required'],
            trim: true
        },
        rating: {
            type: Number,
            required: [true, 'Rating is required'],
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            required: [true, 'Comment is required'],
            trim: true
        },
        status: {
            type: String,
            enum: ['Published', 'Draft', 'Archived'],
            default: 'Published'
        },
        date: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

// Lazy-load the model
let Testimonial = null;

const getTestimonialModel = () => {
    if (isConnected('flowers')) {
        try {
            const conn = getConnection('flowers');
            Testimonial = conn.model('Testimonial', testimonialSchema);
        } catch (error) {
            if (!Testimonial) {
                Testimonial = mongoose.model('Testimonial', testimonialSchema);
            }
        }
    } else {
        if (!Testimonial) {
            Testimonial = mongoose.model('Testimonial', testimonialSchema);
        }
    }
    return Testimonial;
};

export default new Proxy(function () { }, {
    construct(target, args) {
        return new (getTestimonialModel())(...args);
    },
    get(target, prop) {
        const model = getTestimonialModel();
        const value = model[prop];
        if (typeof value === 'function') {
            return value.bind(model);
        }
        return value;
    },
    apply(target, thisArg, args) {
        return getTestimonialModel().apply(thisArg, args);
    }
});
