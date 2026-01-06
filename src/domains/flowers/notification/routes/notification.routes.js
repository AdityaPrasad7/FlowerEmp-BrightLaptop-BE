import express from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import { protect } from '../../../../shared/common/middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect); // All notification routes require authentication

router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/:id/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);

export default router;
