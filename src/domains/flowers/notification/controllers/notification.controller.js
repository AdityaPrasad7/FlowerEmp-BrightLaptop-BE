import Notification from '../models/Notification.model.js';
import { AppError, asyncHandler } from '../../../../shared/common/utils/errorHandler.js';

/**
 * @route   GET /api/notifications
 * @desc    Get user's notifications
 * @access  Private
 */
export const getNotifications = asyncHandler(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await Notification.countDocuments({ userId: req.user._id });
    const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });

    res.status(200).json({
        success: true,
        data: {
            notifications,
            unreadCount,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        }
    });
});

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
export const markAsRead = asyncHandler(async (req, res, next) => {
    const notification = await Notification.findOne({
        _id: req.params.id,
        userId: req.user._id
    });

    if (!notification) {
        return next(new AppError('Notification not found', 404));
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
        success: true,
        data: { notification }
    });
});

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
export const markAllAsRead = asyncHandler(async (req, res, next) => {
    await Notification.updateMany(
        { userId: req.user._id, isRead: false },
        { $set: { isRead: true } }
    );

    res.status(200).json({
        success: true,
        message: 'All notifications marked as read'
    });
});

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get number of unread notifications
 * @access  Private
 */
export const getUnreadCount = asyncHandler(async (req, res, next) => {
    const count = await Notification.countDocuments({ userId: req.user._id, isRead: false });

    res.status(200).json({
        success: true,
        data: { count }
    });
});
// ... existing code ...

/**
 * @route   POST /api/notifications/test
 * @desc    Trigger a test notification to admins
 * @access  Private (Admin only)
 */
export const testNotification = asyncHandler(async (req, res, next) => {
    const { notifyAdmins } = await import('../../../../shared/common/utils/notificationService.js');

    await notifyAdmins(
        'Test Notification 🔔',
        `This is a test notification trigger by ${req.user.name}.`,
        'INFO'
    );

    res.status(200).json({
        success: true,
        message: 'Test notification sent to admins'
    });
});
