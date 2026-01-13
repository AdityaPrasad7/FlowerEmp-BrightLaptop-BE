/**
 * Refurbishment Request Routes (Laptops Domain)
 */
import express from 'express';
import {
    createRefurbishmentRequest,
    getRefurbishmentRequests,
    getRefurbishmentRequest,
    updateRefurbishmentRequestStatus,
    updateWarehouseShipment,
    updateReturnShipment,
} from '../controllers/refurbishmentRequest.controller.js';
import { protect } from '../../../../shared/common/middlewares/auth.middleware.js';
import { restrictTo } from '../../../../shared/common/middlewares/role.middleware.js';
import { validateParams } from '../../../../shared/common/middlewares/validate.middleware.js';
import { mongoIdParamSchema } from '../../../../shared/common/validators/params.validator.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.post('/', createRefurbishmentRequest);
router.get('/', getRefurbishmentRequests);
router.get('/:id', validateParams(mongoIdParamSchema), getRefurbishmentRequest);

// Admin/Seller only routes
router.put(
    '/:id/status',
    restrictTo('SELLER', 'ADMIN'),
    validateParams(mongoIdParamSchema),
    updateRefurbishmentRequestStatus
);

router.put(
    '/:id/warehouse-shipment',
    restrictTo('SELLER', 'ADMIN'),
    validateParams(mongoIdParamSchema),
    updateWarehouseShipment
);

router.put(
    '/:id/return-shipment',
    restrictTo('SELLER', 'ADMIN'),
    validateParams(mongoIdParamSchema),
    updateReturnShipment
);

export default router;
