import Cart from '../../../domains/flowers/cart/models/Cart.model.js'; // Adjust path relative to scheduler location
import { notifyAdmins } from '../utils/notificationService.js';
////
export const startAbandonedCartScheduler = () => {
    // Run every minute
    setInterval(async () => {
        try {
            // Definition of abandonment: Inactive for more than 5 minutes (for testing visibility)
            // Prod should be maybe 1 hour.
            const abandonmentThreshold = new Date(Date.now() - 1 * 60 * 1000);

            // Find carts that are:
            // 1. Not empty
            // 2. Updated before threshold
            // 3. Not yet notified
            const abandonedCarts = await Cart.find({
                updatedAt: { $lt: abandonmentThreshold },
                'items.0': { $exists: true },
                adminNotified: { $ne: true }
            }).populate('userId', 'name');

            if (abandonedCarts.length > 0) {
                console.log(`Scheduler: Found ${abandonedCarts.length} new abandoned carts.`);

                for (const cart of abandonedCarts) {
                    const userName = cart.userId?.name || 'A Guest';

                    // Notify Admins
                    await notifyAdmins(
                        'Abandoned Cart Detected',
                        `Customer ${userName} has left items in their cart (${cart.totalAmount} KD).`,
                        'WARNING',
                        '/abandoned-checkouts' // Link to admin page
                    );

                    // Mark as notified so we don't spam
                    cart.adminNotified = true;
                    await cart.save();
                }
            }
        } catch (error) {
            console.error('Scheduler Error (Abandoned Cart):', error);
        }
    }, 60000); // Check every 60 seconds
};
