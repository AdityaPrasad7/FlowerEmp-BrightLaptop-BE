/**
 * Warehouse Routes (Laptops Domain)
 */
import express from 'express';
import {
    createWarehouse,
    getWarehouses,
} from '../controllers/warehouse.controller.js';
import { protect } from '../../../../shared/common/middlewares/auth.middleware.js';
import { restrictTo } from '../../../../shared/common/middlewares/role.middleware.js';

const router = express.Router();

router.use(protect);

router.post('/', restrictTo('ADMIN'), createWarehouse);
router.get('/', getWarehouses);

export default router;
