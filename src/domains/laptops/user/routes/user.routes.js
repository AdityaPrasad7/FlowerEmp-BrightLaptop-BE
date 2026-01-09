import express from 'express';
import { protect } from '../../../../shared/common/middlewares/auth.middleware.js';
import { addAddress, removeAddress, getAddresses, getCustomers } from '../controllers/user.controller.js';

const router = express.Router();

router.route('/customers')
    .get(protect, getCustomers);

router.route('/addresses')
    .get(protect, getAddresses)
    .post(protect, addAddress);

router.route('/addresses/:addressId')
    .delete(protect, removeAddress);

export default router;



///////
