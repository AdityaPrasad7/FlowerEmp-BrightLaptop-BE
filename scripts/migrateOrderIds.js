
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Order from '../src/domains/flowers/order/models/Order.model.js';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_FLOWERS_URI);
        console.log('Connected to DB');

        const orders = await Order.find({ orderId: { $exists: false } });
        console.log(`Found ${orders.length} orders to migrate.`);

        for (const order of orders) {
            // Use last 6 chars of _id as the orderId to match what was displayed in UI
            const shortId = order._id.toString().slice(-6).toUpperCase();

            // Check for collision (unlikely but possible)
            let uniqueId = shortId;
            let counter = 1;
            while (await Order.findOne({ orderId: uniqueId })) {
                uniqueId = `${shortId}-${counter}`;
                counter++;
            }

            order.orderId = uniqueId;
            await order.save();
            console.log(`Migrated Order ${order._id} -> ${order.orderId}`);
        }

        console.log('Migration Complete');
        process.exit(0);
    } catch (error) {
        console.error('Migration Failed:', error);
        process.exit(1);
    }
};

migrate();
