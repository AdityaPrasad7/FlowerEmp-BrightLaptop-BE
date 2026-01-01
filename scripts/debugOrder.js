
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Order from '../src/domains/flowers/order/models/Order.model.js';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_FLOWERS_URI);

        const searchId = "971050";

        // Find by partial ID to get the doc
        const orders = await Order.aggregate([
            { $addFields: { strId: { $toString: "$_id" } } },
            { $match: { strId: { $regex: `${searchId}$`, $options: 'i' } } }
        ]);

        if (orders.length === 0) {
            console.log("NO ORDER FOUND ending with " + searchId);
        } else {
            orders.forEach(o => {
                console.log(`FOUND ORDER:`);
                console.log(`_id: ${o._id}`);
                console.log(`orderId: '${o.orderId}'`); // Quote it to see whitespace
                console.log(`email match: ${o.userId}`); // Just to see if user is populated or ID
            });
        }

        // Also check if findOne works
        const direct = await Order.findOne({ orderId: searchId });
        console.log(`Direct Find by orderId '${searchId}': ${direct ? 'FOUND' : 'NOT FOUND'}`);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

debug();
