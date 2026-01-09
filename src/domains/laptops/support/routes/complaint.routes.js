/**
 * Complaint Routes (Laptops Support Domain)
 */
import express from 'express';
import {
    createComplaint,
    getComplaints,
    getComplaint,
    updateComplaintStatus,
} from '../controllers/complaint.controller.js';
import { protect } from '../../../../shared/common/middlewares/auth.middleware.js';
import { restrictTo } from '../../../../shared/common/middlewares/role.middleware.js';
import { validateParams } from '../../../../shared/common/middlewares/validate.middleware.js';
import { mongoIdParamSchema } from '../../../../shared/common/validators/params.validator.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.post('/', createComplaint);
router.get('/', getComplaints);
router.get('/:id', validateParams(mongoIdParamSchema), getComplaint);

// Admin/Seller only routes
router.put(
    '/:id/status',
    restrictTo('SELLER', 'ADMIN'),
    validateParams(mongoIdParamSchema),
    updateComplaintStatus
);

export default router;
