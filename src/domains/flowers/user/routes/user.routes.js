/**
 * User Routes (Flowers Domain)
 */
import express from 'express';
import { getAllUsers, getUserById } from '../controllers/user.controller.js';
import { protect, restrictTo } from '../../../../shared/common/middlewares/auth.middleware.js';

const router = express.Router();

// Protected routes (Admin only)
router.use(protect);
router.use(restrictTo('ADMIN'));

router.get('/', getAllUsers);
router.get('/:id', getUserById);

export default router;
