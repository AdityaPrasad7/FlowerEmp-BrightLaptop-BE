/**
 * Abandoned Order Scheduler
 * Detects orders that are created but left in PENDING/Unpaid state for too long.
 * Treats them as "Abandoned Checkouts".
 */
import { notifyAdmins } from '../utils/notificationService.js';

export const startAbandonedOrderScheduler = async () => {
    // Run every minute
    setInterval(async () => {
        try {
            // Import Order model dynamically to avoid circular dependency issues at startup
            const Order = (await import('../../../domains/flowers/order/models/Order.model.js')).default;

            // Definition of abandonment: Created more than 15 minutes ago, still PENDING, not COD
            // Prod should be 15-30 mins. For testing/demo immediate effect, maybe 5 mins.
            // Using 10 minutes as a safe threshold.
            const abandonmentThreshold = new Date(Date.now() - 1 * 60 * 1000);

            // Find orders that are:
            // 1. Status is PENDING (not Approved/Delivered/Cancelled)
            // 2. Payment Status is PENDING (Not Paid)
            // 3. Payment Method is NOT COD
            // 4. Created before threshold (Stale)
            // 5. Not yet notified
            const abandonedOrders = await Order.find({
                createdAt: { $lt: abandonmentThreshold },
                status: 'PENDING',
                paymentStatus: 'PENDING',
                paymentMethod: { $ne: 'COD' },
                adminNotified: { $ne: true }
            }).populate('userId', 'name email');

            if (abandonedOrders.length > 0) {
                console.log(`Scheduler: Found ${abandonedOrders.length} new abandoned orders (checkouts).`);

                for (const order of abandonedOrders) {
                    const userName = order.userId?.name || 'Guest User';

                    // Notify Admins
                    await notifyAdmins(
                        'Abandoned Checkout Detected',
                        `Order #${order.orderId} (${order.totalAmount} KD) by ${userName} is still pending payment.`,
                        'WARNING',
                        `/orders/${order._id}` // Link to admin page
                    );

                    // 📧 Email to User (Action Required)
                    try {
                        const { sendEmail } = await import('../utils/emailService.js');
                        // Helper to estimate frontend URL
                        const FRONTEND_URL = 'http://localhost:5173'; // Fallback

                        const emailHtml = `
                            <h2>Complete Your Purchase</h2>
                            <p>Hi ${userName},</p>
                            <p>We noticed you have a pending order <strong>#${order.orderId}</strong>.</p>
                            <p>Don't miss out on your fresh flowers! Click below to complete your payment.</p>
                            <p><a href="${FRONTEND_URL}/account/orders">View Order & Pay</a></p>
                            <p>If you have already paid, please ignore this email.</p>
                        `;

                        if (order.userId?.email) {
                            await sendEmail({
                                to: order.userId.email,
                                subject: `Action Required: Complete your Order #${order.orderId}`,
                                html: emailHtml
                            });
                        }
                    } catch (emailError) {
                        console.error(`Scheduler: Failed to send email to user ${order.userId?._id}`, emailError);
                    }

                    // Mark as notified so we don't spam
                    order.adminNotified = true;
                    await order.save();
                }
            }
        } catch (error) {
            console.error('Scheduler Error (Abandoned Order):', error);
        }
    }, 60000); // Check every 60 seconds
};
