/**
 * Payment Routes (Flowers Domain)
 */
import express from 'express';
import {
    getPaymentMethods,
    executePayment,
    getPaymentStatus,
    verifyPayment
} from '../controllers/payment.controller.js';

const router = express.Router();

// Public routes for payment (or protected if needed, but usually checkout is public/user)
// Depending on auth requirements, we might want to add 'protect' middleware.
// For now keeping it open as per the migration request, but standard practice usually involves some checks.
// The original code was open public routes.

router.get('/methods', getPaymentMethods);
router.post('/execute', executePayment);
router.post('/status', getPaymentStatus);
router.post('/verify', verifyPayment);

export default router;
