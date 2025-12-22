/**
 * Contact Routes
 * Handles contact form submissions
 */
import express from 'express';
import { submitContactForm } from '../controllers/contact.controller.js';
import { validate } from '../../../../shared/common/middlewares/validate.middleware.js';
import { contactFormSchema } from '../validators/contact.validator.js';

const router = express.Router();

/**
 * @route   POST /api/laptops/contact
 * @desc    Submit contact form
 * @access  Public
 */
router.post('/', validate(contactFormSchema), submitContactForm);

export default router;


