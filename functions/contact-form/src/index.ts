import * as functions from '@google-cloud/functions-framework';
import type { Request, Response } from 'express';
import Joi from 'joi';
import sgMail from '@sendgrid/mail';

/**
 * Contact form data schema
 */
const contactFormSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  company: Joi.string().max(100).optional().allow(''),
  phone: Joi.string().max(20).optional().allow(''),
  message: Joi.string().min(10).max(1000).required(),
});

/**
 * Contact form submission interface
 */
interface ContactFormData {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  message: string;
}

/**
 * CORS configuration
 */
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://dcmco-prod-2026.web.app',
  'https://dcmco-staging.web.app',
  // Add custom domain when configured
  // 'https://www.dcmco.com.au',
  // 'https://staging.dcmco.com.au',
];

/**
 * Set CORS headers
 */
function setCorsHeaders(req: Request, res: Response): boolean {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    return true;
  }

  return false;
}

/**
 * Initialize SendGrid (only if API key is set)
 */
function initializeSendGrid(): boolean {
  const apiKey = process.env.SENDGRID_API_KEY;

  if (!apiKey) {
    console.warn('SENDGRID_API_KEY not set - email sending will be disabled');
    return false;
  }

  sgMail.setApiKey(apiKey);
  return true;
}

/**
 * Send email using SendGrid
 */
async function sendEmail(data: ContactFormData): Promise<void> {
  const toEmail = process.env.CONTACT_EMAIL || 'contact@dcmco.com.au';

  const msg = {
    to: toEmail,
    from: process.env.FROM_EMAIL || 'noreply@dcmco.com.au',
    replyTo: data.email,
    subject: `New Contact Form Submission from ${data.name}`,
    text: `
Name: ${data.name}
Email: ${data.email}
${data.company ? `Company: ${data.company}` : ''}
${data.phone ? `Phone: ${data.phone}` : ''}

Message:
${data.message}
    `.trim(),
    html: `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      ${data.company ? `<p><strong>Company:</strong> ${data.company}</p>` : ''}
      ${data.phone ? `<p><strong>Phone:</strong> ${data.phone}</p>` : ''}
      <h3>Message:</h3>
      <p>${data.message.replace(/\n/g, '<br>')}</p>
    `,
  };

  await sgMail.send(msg);
}

/**
 * Cloud Function entry point for contact form submissions
 *
 * @param req - Express Request object
 * @param res - Express Response object
 */
export async function contactForm(req: Request, res: Response): Promise<void> {
  // Set CORS headers
  const corsAllowed = setCorsHeaders(req, res);

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Reject if origin not allowed
  if (!corsAllowed) {
    console.error('CORS: Origin not allowed:', req.headers.origin);
    res.status(403).json({
      success: false,
      error: 'Origin not allowed',
    });
    return;
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
    });
    return;
  }

  try {
    // Validate request body
    const { error, value } = contactFormSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const validationErrors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors,
      });
      return;
    }

    const formData = value as ContactFormData;

    // Log submission (for debugging)
    console.log('Contact form submission:', {
      name: formData.name,
      email: formData.email,
      hasCompany: !!formData.company,
      hasPhone: !!formData.phone,
    });

    // Initialize SendGrid and send email
    const sendGridInitialized = initializeSendGrid();

    if (sendGridInitialized) {
      await sendEmail(formData);
      console.log('Email sent successfully to:', process.env.CONTACT_EMAIL);
    } else {
      console.warn('SendGrid not initialized - skipping email send');
    }

    // Send success response
    res.status(200).json({
      success: true,
      message: 'Thank you for your message. We will get back to you soon!',
    });

  } catch (err) {
    console.error('Error processing contact form:', err);

    // Check if it's a SendGrid error
    if (err && typeof err === 'object' && 'code' in err) {
      const sgError = err as { code: number; message: string; response?: { body: unknown } };
      console.error('SendGrid error:', {
        code: sgError.code,
        message: sgError.message,
        body: sgError.response?.body,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again later.',
    });
  }
}

// Register the function with the Functions Framework
functions.http('contactForm', contactForm);
