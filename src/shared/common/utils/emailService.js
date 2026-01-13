/**
 * Email Service using Nodemailer
 * Handles sending emails for contact forms, notifications, etc.
 */
import nodemailer from 'nodemailer';
import env from '../../infrastructure/config/env.js';

/**
 * Create and configure nodemailer transporter
 */
const createTransporter = () => {
  // For Gmail, you'll need to use an App Password
  // For other SMTP services, adjust the configuration accordingly
  const transporter = nodemailer.createTransport({
    host: env.email.host || 'smtp.gmail.com',
    port: env.email.port || 587,
    secure: env.email.secure || false, // true for 465, false for other ports
    auth: {
      user: env.email.user,
      pass: env.email.password, // Use App Password for Gmail
    },
  });

  return transporter;
};

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content of the email
 * @param {string} [options.text] - Plain text content (optional)
 * @returns {Promise} Promise that resolves when email is sent
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    // Validate email configuration
    if (!env.email.user || !env.email.password) {
      throw new Error('Email configuration is missing. Please set EMAIL_USER and EMAIL_PASSWORD in .env file');
    }

    const transporter = createTransporter();

    // Verify transporter configuration
    await transporter.verify();

    const mailOptions = {
      from: `"${env.email.fromName || 'Bright Laptop'}" <${env.email.user}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML tags for plain text fallback
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);

    // Provide more detailed error messages
    if (error.code === 'EAUTH') {
      throw new Error('Email authentication failed. Please check EMAIL_USER and EMAIL_PASSWORD in .env file.');
    } else if (error.code === 'ECONNECTION') {
      throw new Error('Could not connect to email server. Please check EMAIL_HOST and EMAIL_PORT in .env file.');
    } else if (error.message.includes('Email configuration is missing')) {
      throw error; // Re-throw validation errors as-is
    } else {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
};

/**
 * Send contact form email to company
 * @param {Object} contactData - Contact form data
 * @param {string} contactData.name - Sender's name
 * @param {string} contactData.email - Sender's email
 * @param {string} [contactData.phone] - Sender's phone (optional)
 * @param {string} contactData.message - Message content
 * @returns {Promise} Promise that resolves when email is sent
 */
export const sendContactFormEmail = async (contactData) => {
  const { name, email, phone, message } = contactData;
  const currentDate = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>New Contact Form Submission</title>
      <!--[if mso]>
      <style type="text/css">
        table {border-collapse:collapse;border-spacing:0;margin:0;}
        div, td {padding:0;}
        div {margin:0 !important;}
      </style>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); padding: 40px 30px; text-align: center;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td style="padding-bottom: 20px; text-align: center;">
                        <div style="display: inline-block; border: 2px solid #ffffff; padding: 12px 24px; border-radius: 4px; margin: 0 auto;">
                          <span style="color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 2px; font-family: 'Arial Black', Arial, sans-serif;">
                            BRIGHT
                          </span>
                          <span style="color: #ffffff; font-size: 18px; font-weight: 300; letter-spacing: 1px; margin-left: 8px;">
                            LAPTOP
                          </span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom: 10px;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                          New Contact Form Submission
                        </h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-top: 10px;">
                        <p style="margin: 0; color: #e0e0e0; font-size: 14px; font-weight: 400;">
                          ${currentDate}
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    
                    <!-- Info Box -->
                    <tr>
                      <td style="padding-bottom: 30px;">
                        <div style="background-color: #f8f9fa; border-left: 4px solid #000000; padding: 20px; border-radius: 4px;">
                          <p style="margin: 0; color: #495057; font-size: 14px; line-height: 1.6;">
                            <strong style="color: #000000;">A new inquiry has been received</strong> through your contact form. Please review the details below and respond promptly.
                          </p>
                        </div>
                      </td>
                    </tr>

                    <!-- Contact Details -->
                    <tr>
                      <td>
                        <h2 style="margin: 0 0 25px 0; color: #212529; font-size: 20px; font-weight: 600; border-bottom: 2px solid #e9ecef; padding-bottom: 10px;">
                          Contact Information
                        </h2>
                      </td>
                    </tr>

                    <!-- Name -->
                    <tr>
                      <td style="padding-bottom: 20px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td width="120" style="vertical-align: top; padding-right: 15px;">
                              <p style="margin: 0; color: #6c757d; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                                👤 Name
                              </p>
                            </td>
                            <td style="vertical-align: top;">
                              <p style="margin: 0; color: #212529; font-size: 15px; font-weight: 500;">
                                ${name}
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Email -->
                    <tr>
                      <td style="padding-bottom: 20px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td width="120" style="vertical-align: top; padding-right: 15px;">
                              <p style="margin: 0; color: #6c757d; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                                📧 Email
                              </p>
                            </td>
                            <td style="vertical-align: top;">
                              <p style="margin: 0;">
                                <a href="mailto:${email}" style="color: #007bff; font-size: 15px; font-weight: 500; text-decoration: none;">
                                  ${email}
                                </a>
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    ${phone ? `
                    <!-- Phone -->
                    <tr>
                      <td style="padding-bottom: 20px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td width="120" style="vertical-align: top; padding-right: 15px;">
                              <p style="margin: 0; color: #6c757d; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                                📱 Phone
                              </p>
                            </td>
                            <td style="vertical-align: top;">
                              <p style="margin: 0;">
                                <a href="tel:${phone.replace(/\s+/g, '')}" style="color: #007bff; font-size: 15px; font-weight: 500; text-decoration: none;">
                                  ${phone}
                                </a>
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    ` : ''}

                    <!-- Message Section -->
                    <tr>
                      <td style="padding-top: 30px; padding-bottom: 20px;">
                        <h2 style="margin: 0 0 20px 0; color: #212529; font-size: 20px; font-weight: 600; border-bottom: 2px solid #e9ecef; padding-bottom: 10px;">
                          💬 Message
                        </h2>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom: 30px;">
                        <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px;">
                          <p style="margin: 0; color: #212529; font-size: 15px; line-height: 1.8; white-space: pre-wrap;">
                            ${message.replace(/\n/g, '<br>')}
                          </p>
                        </div>
                      </td>
                    </tr>

                    <!-- Quick Actions -->
                    <tr>
                      <td style="padding-top: 30px; border-top: 2px solid #e9ecef;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td align="center" style="padding: 20px 0;">
                              <a href="mailto:${email}?subject=Re: Your Inquiry to Bright Laptop" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; letter-spacing: 0.3px;">
                                Reply to ${name}
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td style="padding-bottom: 15px;">
                        <p style="margin: 0; color: #6c757d; font-size: 13px; line-height: 1.6;">
                          This email was automatically generated from the<br>
                          <strong style="color: #212529;">Bright Laptop</strong> contact form.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <p style="margin: 0; color: #adb5bd; font-size: 12px;">
                          You can reply directly to this email to respond to ${name}.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

            </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: env.email.contactEmail || env.email.user, // Send to company email
    subject: `New Contact Form Submission from ${name} - Bright Laptop`,
    html,
  });
};

/**
 * Send thank you email to user
 * @param {Object} userData - User data
 * @param {string} userData.name - User's name
 * @param {string} userData.email - User's email
 * @returns {Promise} Promise that resolves when email is sent
 */
export const sendThankYouEmail = async (userData) => {
  const { name, email } = userData;
  const firstName = name.split(' ')[0];

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Thank You for Contacting Bright Laptop</title>
      <!--[if mso]>
      <style type="text/css">
        table {border-collapse:collapse;border-spacing:0;margin:0;}
        div, td {padding:0;}
        div {margin:0 !important;}
      </style>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              
              <!-- Header with Gradient -->
              <tr>
                <td style="background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); padding: 50px 30px; text-align: center;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td style="padding-bottom: 25px; text-align: center;">
                        <div style="display: inline-block; border: 2px solid #ffffff; padding: 14px 28px; border-radius: 4px; margin: 0 auto;">
                          <span style="color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: 2px; font-family: 'Arial Black', Arial, sans-serif;">
                            BRIGHT
                          </span>
                          <span style="color: #ffffff; font-size: 20px; font-weight: 300; letter-spacing: 1px; margin-left: 8px;">
                            LAPTOP
                          </span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                          Thank You, ${firstName}!
                        </h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-top: 10px;">
                        <p style="margin: 0; color: #e0e0e0; font-size: 16px; font-weight: 400;">
                          We've received your message
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Main Content -->
              <tr>
                <td style="padding: 50px 40px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    
                    <!-- Greeting -->
                    <tr>
                      <td style="padding-bottom: 25px;">
                        <p style="margin: 0; color: #212529; font-size: 18px; line-height: 1.7; font-weight: 400;">
                          Dear <strong style="color: #000000;">${name}</strong>,
                        </p>
                      </td>
                    </tr>

                    <!-- Main Message -->
                    <tr>
                      <td style="padding-bottom: 25px;">
                        <p style="margin: 0; color: #495057; font-size: 16px; line-height: 1.8;">
                          Thank you for reaching out to <strong style="color: #000000;">Bright Laptop</strong>! We're thrilled to hear from you and appreciate you taking the time to contact us.
                        </p>
                      </td>
                    </tr>

                    <!-- Confirmation Box -->
                    <tr>
                      <td style="padding-bottom: 30px;">
                        <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-left: 4px solid #000000; padding: 25px; border-radius: 6px;">
                          <p style="margin: 0 0 12px 0; color: #212529; font-size: 15px; font-weight: 600;">
                            ✅ Your message has been received
                          </p>
                          <p style="margin: 0; color: #495057; font-size: 14px; line-height: 1.7;">
                            Our team is reviewing your inquiry and will get back to you as soon as possible. We typically respond within <strong>24-48 hours</strong> during business days.
                          </p>
                        </div>
                      </td>
                    </tr>

                    <!-- Response Time Info -->
                    <tr>
                      <td style="padding-bottom: 30px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 6px; padding: 20px;">
                          <tr>
                            <td style="padding-right: 15px; vertical-align: top;">
                              <div style="font-size: 24px;">⏰</div>
                            </td>
                            <td>
                              <p style="margin: 0 0 8px 0; color: #212529; font-size: 15px; font-weight: 600;">
                                Response Time
                              </p>
                              <p style="margin: 0; color: #6c757d; font-size: 14px; line-height: 1.6;">
                                <strong>Monday - Saturday:</strong> 10:00 AM - 7:00 PM<br>
                                <strong>Sunday:</strong> Closed
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Urgent Contact -->
                    <tr>
                      <td style="padding-bottom: 35px;">
                        <p style="margin: 0 0 15px 0; color: #495057; font-size: 15px; font-weight: 600;">
                          Need immediate assistance?
                        </p>
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td width="50%" style="padding-right: 10px; vertical-align: top;">
                              <div style="background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 6px; padding: 15px; text-align: center;">
                                <p style="margin: 0 0 8px 0; color: #6c757d; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                                  📞 Sales
                                </p>
                                <p style="margin: 0;">
                                  <a href="tel:+919964093100" style="color: #000000; font-size: 15px; font-weight: 600; text-decoration: none;">
                                    +91 9964093100
                                  </a>
                                </p>
                              </div>
                            </td>
                            <td width="50%" style="padding-left: 10px; vertical-align: top;">
                              <div style="background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 6px; padding: 15px; text-align: center;">
                                <p style="margin: 0 0 8px 0; color: #6c757d; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                                  🔧 Service
                                </p>
                                <p style="margin: 0;">
                                  <a href="tel:+919513245671" style="color: #000000; font-size: 15px; font-weight: 600; text-decoration: none;">
                                    +91 9513245671
                                  </a>
                                </p>
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- CTA Button -->
                    <tr>
                      <td align="center" style="padding-bottom: 30px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                          <tr>
                            <td style="border-radius: 6px; background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);">
                              <a href="http://localhost:3000" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; letter-spacing: 0.3px; border-radius: 6px;">
                                Visit Our Website →
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Divider -->
                    <tr>
                      <td style="border-top: 1px solid #e9ecef; padding-top: 30px;">
                        <p style="margin: 0; color: #6c757d; font-size: 14px; line-height: 1.7; text-align: center;">
                          While you wait, feel free to explore our latest products and exclusive deals!
                        </p>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 40px 30px; border-top: 1px solid #e9ecef;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td align="center" style="padding-bottom: 20px;">
                        <p style="margin: 0; color: #212529; font-size: 16px; font-weight: 600;">
                          Bright Laptop
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-bottom: 20px;">
                        <p style="margin: 0; color: #6c757d; font-size: 14px; line-height: 1.7;">
                          2nd Floor, SRS Arcade, 15/2, Hosa Rd<br>
                          Kasavanahalli, Bengaluru<br>
                          Karnataka - 560035, India
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-bottom: 15px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                          <tr>
                            <td style="padding: 0 10px;">
                              <a href="mailto:contact@bright.com" style="color: #007bff; text-decoration: none; font-size: 14px;">
                                📧 contact@bright.com
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td align="center">
                        <p style="margin: 0; color: #adb5bd; font-size: 12px; line-height: 1.6;">
                          This is an automated confirmation email.<br>
                          Please do not reply to this message.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

            </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Thank You for Contacting Bright Laptop - We\'ll Be In Touch Soon!',
    html,
  });
};


/**
 * Send order confirmation email with invoice details
 * @param {Object} order - Order object with populated products and user
 * @returns {Promise} Promise that resolves when email is sent
 */
export const sendOrderConfirmationEmail = async (order) => {
  const { userId, products, totalAmount, paymentStatus, paymentMethod, invoiceNumber, createdAt, shippingAddress } = order;
  const userEmail = order.contactEmail || userId.email;
  const userName = order.shippingAddress?.fullName || userId.name;

  // Format date
  const orderDate = new Date(createdAt).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Calculate Subtotal and GST (assuming 18% GST is included in total)
  const gstPercentage = 18;
  const subtotal = (totalAmount * 100) / (100 + gstPercentage);
  const gstAmount = totalAmount - subtotal;

  // Generate Items HTML
  const itemsHtml = products.map(item => {
    const product = item.productId;
    const variantInfo = [];
    if (item.selectedConfig?.ram) variantInfo.push(item.selectedConfig.ram);
    if (item.selectedConfig?.storage) variantInfo.push(item.selectedConfig.storage);
    const variantString = variantInfo.length > 0 ? `(${variantInfo.join('/')})` : '';

    return `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef;">
          <p style="margin: 0; color: #212529; font-size: 14px; font-weight: 600;">
            ${product.name}
          </p>
          <p style="margin: 4px 0 0 0; color: #6c757d; font-size: 12px;">
            ${variantString}
          </p>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; text-align: center;">
          <p style="margin: 0; color: #495057; font-size: 14px;">
            ${item.quantity}
          </p>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; text-align: right;">
          <p style="margin: 0; color: #212529; font-size: 14px; font-weight: 600;">
            ₹${item.priceAtPurchase.toLocaleString('en-IN')}
          </p>
        </td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Order Confirmation - Bright Laptop</title>
      <!--[if mso]>
      <style type="text/css">
        table {border-collapse:collapse;border-spacing:0;margin:0;}
        div, td {padding:0;}
        div {margin:0 !important;}
      </style>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); padding: 40px 30px; text-align: center;">
                  <div style="display: inline-block; border: 2px solid #ffffff; padding: 10px 20px; border-radius: 4px; margin-bottom: 20px;">
                    <span style="color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: 2px; font-family: 'Arial Black', Arial, sans-serif;">
                      BRIGHT LAPTOP
                    </span>
                  </div>
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                    Order Confirmed!
                  </h1>
                  <p style="margin: 10px 0 0 0; color: #e0e0e0; font-size: 14px;">
                    Order #${order.invoiceNumber || order._id.toString().slice(-6).toUpperCase()}
                  </p>
                </td>
              </tr>

              <!-- Greeting -->
              <tr>
                <td style="padding: 40px 30px 20px 30px;">
                  <p style="margin: 0; color: #212529; font-size: 16px; line-height: 1.6;">
                    Hello <strong>${userName}</strong>,<br><br>
                    Thank you for your purchase! We've received your order and are getting it ready for shipment. We will notify you once your package is on its way.
                  </p>
                </td>
              </tr>

              <!-- Order Details Box -->
              <tr>
                <td style="padding: 0 30px;">
                  <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td width="50%" style="vertical-align: top; padding-bottom: 20px;">
                          <p style="margin: 0 0 5px 0; color: #6c757d; font-size: 12px; text-transform: uppercase; font-weight: 600;">
                            Order Date
                          </p>
                          <p style="margin: 0; color: #212529; font-size: 14px; font-weight: 500;">
                            ${orderDate}
                          </p>
                        </td>
                        <td width="50%" style="vertical-align: top; padding-bottom: 20px;">
                          <p style="margin: 0 0 5px 0; color: #6c757d; font-size: 12px; text-transform: uppercase; font-weight: 600;">
                            Payment Method
                          </p>
                          <p style="margin: 0; color: #212529; font-size: 14px; font-weight: 500;">
                            ${paymentMethod}
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="vertical-align: top;">
                          <p style="margin: 0 0 5px 0; color: #6c757d; font-size: 12px; text-transform: uppercase; font-weight: 600;">
                            Shipping Address
                          </p>
                          <p style="margin: 0; color: #212529; font-size: 14px; line-height: 1.5;">
                            ${shippingAddress.addressLine1},<br>
                            ${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.pincode}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>

              <!-- Order Items -->
              <tr>
                <td style="padding: 30px;">
                  <h2 style="margin: 0 0 20px 0; color: #212529; font-size: 18px; font-weight: 700;">
                    Order Summary
                  </h2>
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <thead>
                      <tr>
                        <th align="left" style="padding-bottom: 10px; border-bottom: 2px solid #e9ecef; color: #6c757d; font-size: 12px; text-transform: uppercase;">Item</th>
                        <th align="center" style="padding-bottom: 10px; border-bottom: 2px solid #e9ecef; color: #6c757d; font-size: 12px; text-transform: uppercase;">Qty</th>
                        <th align="right" style="padding-bottom: 10px; border-bottom: 2px solid #e9ecef; color: #6c757d; font-size: 12px; text-transform: uppercase;">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colspan="2" style="padding-top: 15px; text-align: right; color: #6c757d; font-size: 14px;">Subtotal</td>
                        <td style="padding-top: 15px; text-align: right; color: #212529; font-size: 14px; font-weight: 500;">₹${subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 8px; text-align: right; color: #6c757d; font-size: 14px;">GST (18%)</td>
                        <td style="padding-top: 8px; text-align: right; color: #212529; font-size: 14px; font-weight: 500;">₹${gstAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 15px; text-align: right; color: #000000; font-size: 16px; font-weight: 700;">Total</td>
                        <td style="padding-top: 15px; text-align: right; color: #000000; font-size: 18px; font-weight: 700;">₹${totalAmount.toLocaleString('en-IN')}</td>
                      </tr>
                    </tfoot>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 30px; text-align: center;">
                  <p style="margin: 0; color: #6c757d; font-size: 13px; line-height: 1.6;">
                    Need help? Contact us at <a href="mailto:contact@brightlaptop.com" style="color: #000000; text-decoration: none; font-weight: 600;">contact@brightlaptop.com</a>
                  </p>
                  <p style="margin: 20px 0 0 0; color: #adb5bd; font-size: 12px;">
                    © ${new Date().getFullYear()} Bright Laptop. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: userEmail,
    subject: `Order Confirmation - #${invoiceNumber || order._id.toString().slice(-6).toUpperCase()}`,
    html,
  });
};

/**
 * Send shipment confirmation email with tracking details
 * @param {Object} order - Order object with populated products, user, and trackingData
 * @returns {Promise} Promise that resolves when email is sent
 */
export const sendShipmentConfirmationEmail = async (order) => {
  const { userId, products, trackingData, shippingAddress } = order;
  console.log("order", order);

  const userEmail = order.contactEmail || userId.email;
  const userName = order.shippingAddress?.fullName || userId.name;

  // Format date
  const shippedDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const trackingId = trackingData?.trackingId || 'N/A';
  const courierName = trackingData?.courierName || 'Partner Courier';
  // Use labelUrl if available, otherwise generic tracking link (can be enhanced with specific courier links)
  const trackingLink = trackingData?.labelUrl || '#';

  // Generate Items HTML (simplified list for shipment notification)
  const itemsHtml = products.map(item => {
    // Check if item.productId is populated, otherwise handle gracefully
    const productName = item.productId ? item.productId.name : 'Product';
    return `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef;">
          <p style="margin: 0; color: #212529; font-size: 14px; font-weight: 600;">
            ${productName}
          </p>
          <p style="margin: 4px 0 0 0; color: #6c757d; font-size: 12px;">
            Qty: ${item.quantity}
          </p>
        </td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Your Order Has Shipped! - Bright Laptop</title>
      <!--[if mso]>
      <style type="text/css">
        table {border-collapse:collapse;border-spacing:0;margin:0;}
        div, td {padding:0;}
        div {margin:0 !important;}
      </style>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); padding: 40px 30px; text-align: center;">
                  <div style="display: inline-block; border: 2px solid #ffffff; padding: 10px 20px; border-radius: 4px; margin-bottom: 20px;">
                    <span style="color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: 2px; font-family: 'Arial Black', Arial, sans-serif;">
                      BRIGHT LAPTOP
                    </span>
                  </div>
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                    Your Order is on the Way!
                  </h1>
                  <p style="margin: 10px 0 0 0; color: #e0e0e0; font-size: 14px;">
                    Order #${order.invoiceNumber || order._id.toString().slice(-6).toUpperCase()}
                  </p>
                </td>
              </tr>

              <!-- Greeting -->
              <tr>
                <td style="padding: 40px 30px 20px 30px;">
                  <p style="margin: 0; color: #212529; font-size: 16px; line-height: 1.6;">
                    Hello <strong>${userName}</strong>,<br><br>
                    Great news! Your order has been shipped and is making its way to you. You can track your package using the details below.
                  </p>
                </td>
              </tr>

              <!-- Tracking Details Box -->
              <tr>
                <td style="padding: 0 30px;">
                  <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 25px; text-align: center;">
                    <p style="margin: 0 0 5px 0; color: #166534; font-size: 13px; text-transform: uppercase; font-weight: 700;">
                      Shipped via ${courierName}
                    </p>
                    <p style="margin: 0 0 20px 0; color: #15803d; font-size: 20px; font-weight: 700; letter-spacing: 1px;">
                      ${trackingId}
                    </p>
                   
                     <!-- Optional: Add Tracking Button if valid URL exists -->
                     ${trackingData?.labelUrl ? `
                     <a href="${trackingData.labelUrl}" target="_blank" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">
                        Track Package / Download Label
                     </a>
                     ` : ''}
                  </div>
                </td>
              </tr>

              <!-- Order Items Summary (Short) -->
              <tr>
                <td style="padding: 30px;">
                  <h3 style="margin: 0 0 15px 0; color: #212529; font-size: 16px; font-weight: 700;">
                    Items in this Shipment
                  </h3>
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                  </table>
                </td>
              </tr>

              <!-- Shipping Address -->
              <tr>
                <td style="padding: 0 30px 30px 30px;">
                   <h3 style="margin: 0 0 10px 0; color: #212529; font-size: 16px; font-weight: 700;">
                    Shipping To
                  </h3>
                  <p style="margin: 0; color: #495057; font-size: 14px; line-height: 1.5;">
                    ${shippingAddress.addressLine1},<br>
                    ${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.pincode}
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 30px; text-align: center;">
                  <p style="margin: 0; color: #6c757d; font-size: 13px; line-height: 1.6;">
                    Need help? Contact us at <a href="mailto:contact@brightlaptop.com" style="color: #000000; text-decoration: none; font-weight: 600;">contact@brightlaptop.com</a>
                  </p>
                  <p style="margin: 20px 0 0 0; color: #adb5bd; font-size: 12px;">
                    © ${new Date().getFullYear()} Bright Laptop. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: userEmail,
    subject: `Your Order #${order.invoiceNumber || order._id.toString().slice(-6).toUpperCase()} Has Shipped!`,
    html,
  });
};
