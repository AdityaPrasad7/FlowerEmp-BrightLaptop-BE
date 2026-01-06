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
