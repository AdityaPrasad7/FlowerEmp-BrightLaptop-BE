import express from 'express';
import { createShipment, calculateRates } from '../controllers/shipping.controller.js';
import { protect } from '../../../../shared/common/middlewares/auth.middleware.js';
import { restrictTo } from '../../../../shared/common/middlewares/role.middleware.js';

const router = express.Router();

// Protected routes (Admin only for now, can be Seller too)
router.post(
    '/create-shipment',
    protect,
    restrictTo('ADMIN', 'SELLER'),
    createShipment
);

router.post(
    '/calculate-rates',
    protect,
    restrictTo('ADMIN', 'SELLER'),
    calculateRates
);

export default router;
