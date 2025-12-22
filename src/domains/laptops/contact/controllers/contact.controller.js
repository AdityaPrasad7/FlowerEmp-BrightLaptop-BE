/**
 * Contact Controller
 * Handles contact form submissions and email notifications
 */
import { asyncHandler } from '../../../../shared/common/utils/errorHandler.js';
import { AppError } from '../../../../shared/common/utils/errorHandler.js';
import { sendContactFormEmail, sendThankYouEmail } from '../../../../shared/common/utils/emailService.js';
import env from '../../../../shared/infrastructure/config/env.js';

/**
 * Submit contact form
 * POST /api/laptops/contact
 * Public endpoint - no authentication required
 */
export const submitContactForm = asyncHandler(async (req, res, next) => {
  const { name, email, phone, message } = req.body;

  // Check email configuration before attempting to send
  if (!env.email.user || !env.email.password) {
    console.error('Email configuration missing:', {
      hasUser: !!env.email.user,
      hasPassword: !!env.email.password,
    });
    return next(
      new AppError(
        'Email service is not configured. Please set EMAIL_USER and EMAIL_PASSWORD in .env file.',
        500
      )
    );
  }

  try {
    // Send email to company
    await sendContactFormEmail({
      name,
      email,
      phone,
      message,
    });

    // Send thank you email to user
    await sendThankYouEmail({
      name,
      email,
    });

    res.status(200).json({
      success: true,
      message: 'Thank you for contacting us! We have received your message and will get back to you soon.',
    });
  } catch (error) {
    console.error('Error sending contact emails:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    
    // Provide more detailed error message for debugging
    const errorMessage = error.message || 'Unknown error occurred while sending emails';
    
    return next(
      new AppError(
        `Email sending failed: ${errorMessage}. Please check your email configuration in .env file.`,
        500
      )
    );
  }
});
