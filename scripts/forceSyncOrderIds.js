
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Order from '../src/domains/flowers/order/models/Order.model.js';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const sync = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_FLOWERS_URI);
        console.log('Connected to DB');

        const orders = await Order.find({});
        console.log(`Found ${orders.length} orders to sync.`);

        for (const order of orders) {
            // Force the orderId to be the last 6 chars of _id
            // This aligns with what the user was seeing in the UI previously
            const suffixId = order._id.toString().slice(-6).toUpperCase();

            if (order.orderId !== suffixId) {
                console.log(`Updating ${order._id}: ${order.orderId} -> ${suffixId}`);
                order.orderId = suffixId;

                // Handle potential collisions (unlikely with this logic unless _id ends same)
                try {
                    await order.save();
                } catch (e) {
                    if (e.code === 11000) {
                        // Collision handling
                        order.orderId = `${suffixId}-${Math.floor(Math.random() * 10)}`;
                        await order.save();
                        console.log(`Resolved collision: ${order.orderId}`);
                    } else {
                        throw e;
                    }
                }
            }
        }

        console.log('Sync Complete');
        process.exit(0);
    } catch (error) {
        console.error('Sync Failed:', error);
        process.exit(1);
    }
};

sync();
