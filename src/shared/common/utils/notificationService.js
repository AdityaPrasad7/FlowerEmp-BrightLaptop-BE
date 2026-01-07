import Notification from '../../../domains/flowers/notification/models/Notification.model.js';

/**
 * Create a new notification for a user
 * @param {string} userId - User ID
 * @param {string} title - Notification Title
 * @param {string} message - Notification Message
 * @param {string} type - Notification Type (INFO, SUCCESS, WARNING, ERROR)
 * @param {string} link - Optional link to resource
 */
export const createNotification = async (userId, title, message, type = 'INFO', link = '') => {
    try {
        await Notification.create({
            userId,
            title,
            message,
            type,
            link
        });
    } catch (error) {
        console.error('Failed to create notification:', error);
        // Silent fail - don't block main flow if notification fails
    }
};

/**
 * Notify all admins
 */
import FlowersUser from '../../../domains/flowers/auth/models/User.model.js';
import { emitNotification } from './socketService.js';

export const notifyAdmins = async (title, message, type = 'INFO', link = '') => {
    try {
        console.log("NotifyAdmins called:", title);
        // Find all admin users (and Sellers if needed, but for now just ADMIN)
        const admins = await FlowersUser.find({ role: 'ADMIN' }).select('_id');
        console.log("Admins found to notify:", admins.length);

        const notifications = admins.map(admin => ({
            userId: admin._id,
            title,
            message,
            type,
            link
        }));

        if (notifications.length > 0) {
            // Bulk create notifications
            await Notification.insertMany(notifications);
            console.log("Notifications saved to DB");

            // Emit socket event to each admin
            admins.forEach(admin => {
                const adminId = admin._id.toString();
                console.log(`Emitting to Admin Room: ${adminId}`);
                emitNotification(adminId, {
                    title,
                    message,
                    type,
                    link,
                    createdAt: new Date()
                });
            });
        }
    } catch (error) {
        console.error('Failed to notify admins:', error);
    }
};
