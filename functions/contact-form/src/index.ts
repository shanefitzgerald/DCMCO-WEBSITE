import * as functions from '@google-cloud/functions-framework';
import type { Request, Response } from 'express';
import Joi from 'joi';
import sgMail from '@sendgrid/mail';

/**
 * =============================================================================
 * TYPE DEFINITIONS
 * =============================================================================
 */

/**
 * Contact form submission data
 */
interface ContactFormData {
  name: string;
  email: string;
  company?: string;
  message: string;
  honeypot?: string; // Bot trap field - must be empty
}

/**
 * Environment configuration
 */
interface EnvironmentConfig {
  sendgridApiKey: string | undefined;
  emailRecipient: string;
  allowedOrigins: string[];
  nodeEnv: string;
}

/**
 * Response types for type safety
 */
interface SuccessResponse {
  success: true;
  message: string;
}

interface ErrorResponse {
  success: false;
  error: string;
  details?: Array<{ field: string; message: string }>;
}

type ApiResponse = SuccessResponse | ErrorResponse;

/**
 * =============================================================================
 * VALIDATION SCHEMA
 * =============================================================================
 */

/**
 * Joi schema for contact form validation
 *
 * Rules:
 * - name: Required, 2-100 characters
 * - email: Required, valid email format
 * - message: Required, 10-1000 characters
 * - company: Optional, max 100 characters
 * - honeypot: Must be empty (bot trap)
 */
const contactFormSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required',
    }),

  email: Joi.string()
    .email({ tlds: { allow: true } })
    .trim()
    .lowercase()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),

  company: Joi.string()
    .max(100)
    .trim()
    .allow('')
    .optional()
    .messages({
      'string.max': 'Company name cannot exceed 100 characters',
    }),

  message: Joi.string()
    .min(10)
    .max(1000)
    .trim()
    .required()
    .messages({
      'string.min': 'Message must be at least 10 characters',
      'string.max': 'Message cannot exceed 1000 characters',
      'any.required': 'Message is required',
    }),

  // Honeypot field - must be empty or not present
  honeypot: Joi.string()
    .allow('')
    .optional()
    .messages({
      'any.only': 'Invalid submission',
    }),
});

/**
 * =============================================================================
 * CONFIGURATION
 * =============================================================================
 */

/**
 * Load and validate environment configuration
 */
function getEnvironmentConfig(): EnvironmentConfig {
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
  const defaultOrigins = [
    'http://localhost:3000',
    'https://dcmco-prod-2026.web.app',
    'https://dcmco-staging.web.app',
  ];

  // Parse allowed origins from environment or use defaults
  const allowedOrigins = allowedOriginsEnv
    ? allowedOriginsEnv.split(',').map((origin) => origin.trim())
    : defaultOrigins;

  return {
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    emailRecipient: process.env.EMAIL_RECIPIENT || 'shanesrf@gmail.com',
    allowedOrigins,
    nodeEnv: process.env.NODE_ENV || 'development',
  };
}

/**
 * =============================================================================
 * CORS HANDLING
 * =============================================================================
 */

/**
 * Set CORS headers for allowed origins
 *
 * @param req - Express request
 * @param res - Express response
 * @param config - Environment configuration
 * @returns true if origin is allowed, false otherwise
 */
function setCorsHeaders(
  req: Request,
  res: Response,
  config: EnvironmentConfig
): boolean {
  const origin = req.headers.origin;

  // Log CORS check for debugging
  console.log('CORS check:', {
    requestOrigin: origin,
    allowedOrigins: config.allowedOrigins,
  });

  if (origin && config.allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    res.set('Access-Control-Allow-Credentials', 'true');
    return true;
  }

  return false;
}

/**
 * =============================================================================
 * SPAM PROTECTION
 * =============================================================================
 */

/**
 * Check honeypot field for bot submissions
 * Honeypot is a hidden field that humans won't fill but bots will
 *
 * @param data - Form data containing honeypot field
 * @returns true if submission appears to be from a bot
 */
function isSpamSubmission(data: ContactFormData): boolean {
  // If honeypot field is filled, it's likely a bot
  if (data.honeypot && data.honeypot.trim() !== '') {
    console.warn('Spam detected: Honeypot field was filled', {
      honeypotValue: data.honeypot.substring(0, 20), // Log first 20 chars only
    });
    return true;
  }

  return false;
}

/**
 * Additional email validation beyond Joi
 * Checks for suspicious patterns
 *
 * @param email - Email address to validate
 * @returns true if email appears suspicious
 */
function isSuspiciousEmail(email: string): boolean {
  // Check for obvious spam patterns
  const spamPatterns = [
    /\d{10,}/, // 10+ consecutive digits
    /(.)\1{4,}/, // Same character repeated 5+ times
    /^test@test/, // test emails
    /^spam@/i,
    /^fake@/i,
  ];

  return spamPatterns.some((pattern) => pattern.test(email));
}

/**
 * =============================================================================
 * SENDGRID EMAIL SENDING
 * =============================================================================
 */

/**
 * Initialize SendGrid with API key
 *
 * @param apiKey - SendGrid API key
 * @returns true if initialized successfully
 */
function initializeSendGrid(apiKey: string | undefined): boolean {
  if (!apiKey) {
    console.error('SENDGRID_API_KEY environment variable is not set');
    return false;
  }

  try {
    sgMail.setApiKey(apiKey);
    console.log('SendGrid initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize SendGrid:', error);
    return false;
  }
}

/**
 * Generate HTML email template
 *
 * @param data - Contact form data
 * @returns HTML email content
 */
function generateEmailHtml(data: ContactFormData): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #2563eb;
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background-color: #f9fafb;
            padding: 30px;
            border-radius: 0 0 8px 8px;
          }
          .field {
            margin-bottom: 20px;
          }
          .label {
            font-weight: 600;
            color: #4b5563;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
          }
          .value {
            color: #111827;
            font-size: 16px;
            padding: 10px;
            background-color: white;
            border-radius: 4px;
            border: 1px solid #e5e7eb;
          }
          .message-box {
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          .footer {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0;">New Contact Form Submission</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">DCMCO Website</p>
        </div>

        <div class="content">
          <div class="field">
            <div class="label">Name</div>
            <div class="value">${escapeHtml(data.name)}</div>
          </div>

          <div class="field">
            <div class="label">Email</div>
            <div class="value">
              <a href="mailto:${escapeHtml(data.email)}" style="color: #2563eb; text-decoration: none;">
                ${escapeHtml(data.email)}
              </a>
            </div>
          </div>

          ${
            data.company
              ? `
          <div class="field">
            <div class="label">Company</div>
            <div class="value">${escapeHtml(data.company)}</div>
          </div>
          `
              : ''
          }

          <div class="field">
            <div class="label">Message</div>
            <div class="value message-box">${escapeHtml(data.message)}</div>
          </div>

          <div class="footer">
            <p>This message was submitted via the DCMCO contact form.</p>
            <p>To reply, simply respond to this email or click the email address above.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate plain text email
 *
 * @param data - Contact form data
 * @returns Plain text email content
 */
function generateEmailText(data: ContactFormData): string {
  return `
New Contact Form Submission - DCMCO Website
${'='.repeat(50)}

Name: ${data.name}
Email: ${data.email}
${data.company ? `Company: ${data.company}` : ''}

Message:
${data.message}

${'='.repeat(50)}
This message was submitted via the DCMCO contact form.
To reply, simply respond to this email.
  `.trim();
}

/**
 * Escape HTML special characters to prevent XSS
 *
 * @param text - Text to escape
 * @returns Escaped text
 */
function escapeHtml(text: string): string {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char] || char);
}

/**
 * Send email via SendGrid
 *
 * @param data - Contact form data
 * @param config - Environment configuration
 */
async function sendEmail(
  data: ContactFormData,
  config: EnvironmentConfig
): Promise<void> {
  const msg = {
    to: config.emailRecipient,
    from: {
      email: 'noreply@dcmco.com.au',
      name: 'DCMCO Website',
    },
    replyTo: {
      email: data.email,
      name: data.name,
    },
    subject: `New Contact Form Submission - DCMCO`,
    text: generateEmailText(data),
    html: generateEmailHtml(data),
  };

  try {
    const [response] = await sgMail.send(msg);

    console.log('Email sent successfully', {
      statusCode: response.statusCode,
      recipient: config.emailRecipient,
      from: data.email,
    });
  } catch (error) {
    // Log detailed error for debugging
    if (error && typeof error === 'object' && 'response' in error) {
      const sgError = error as { code: number; response: { body: unknown } };
      console.error('SendGrid API error:', {
        code: sgError.code,
        body: sgError.response?.body,
      });
    } else {
      console.error('Email send error:', error);
    }

    // Re-throw to be caught by main error handler
    throw new Error('Failed to send email');
  }
}

/**
 * =============================================================================
 * REQUEST HANDLERS
 * =============================================================================
 */

/**
 * Handle OPTIONS preflight request
 *
 * @param req - Express request
 * @param res - Express response
 * @param config - Environment configuration
 */
function handlePreflight(
  req: Request,
  res: Response,
  config: EnvironmentConfig
): void {
  setCorsHeaders(req, res, config);
  res.status(204).send('');
}

/**
 * Validate request method and content type
 *
 * @param req - Express request
 * @returns Error response if invalid, null if valid
 */
function validateRequest(req: Request): ErrorResponse | null {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return {
      success: false,
      error: 'Method not allowed. Please use POST.',
    };
  }

  // Check Content-Type header
  const contentType = req.headers['content-type'];
  if (!contentType || !contentType.includes('application/json')) {
    return {
      success: false,
      error: 'Invalid Content-Type. Please use application/json.',
    };
  }

  return null;
}

/**
 * Validate and sanitize form data
 *
 * @param body - Request body
 * @returns Validation result with data or error
 */
function validateFormData(body: unknown): {
  valid: boolean;
  data?: ContactFormData;
  error?: ErrorResponse;
} {
  const { error, value } = contactFormSchema.validate(body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const validationErrors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    console.warn('Validation failed:', validationErrors);

    return {
      valid: false,
      error: {
        success: false,
        error: 'Validation failed',
        details: validationErrors,
      },
    };
  }

  return {
    valid: true,
    data: value as ContactFormData,
  };
}

/**
 * =============================================================================
 * MAIN CLOUD FUNCTION
 * =============================================================================
 */

/**
 * Cloud Function entry point for contact form submissions
 *
 * Handles:
 * - CORS validation and preflight requests
 * - Request method and content type validation
 * - Form data validation (Joi schema)
 * - Spam protection (honeypot, email checks)
 * - Email sending via SendGrid
 * - Comprehensive error handling
 *
 * @param req - Express Request object
 * @param res - Express Response object
 */
export async function contactForm(req: Request, res: Response): Promise<void> {
  // Load environment configuration
  const config = getEnvironmentConfig();

  // Log incoming request (sanitized)
  console.log('Contact form request received', {
    method: req.method,
    origin: req.headers.origin,
    contentType: req.headers['content-type'],
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  // Set CORS headers
  const corsAllowed = setCorsHeaders(req, res, config);

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    handlePreflight(req, res, config);
    return;
  }

  // Reject if origin not allowed
  if (!corsAllowed) {
    console.error('CORS violation: Origin not allowed', {
      origin: req.headers.origin,
    });

    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Origin not allowed',
    };

    res.status(403).json(errorResponse);
    return;
  }

  // Validate request method and content type
  const requestError = validateRequest(req);
  if (requestError) {
    res.status(405).json(requestError);
    return;
  }

  try {
    // Validate and sanitize form data
    const validationResult = validateFormData(req.body);

    if (!validationResult.valid || !validationResult.data) {
      res.status(400).json(validationResult.error);
      return;
    }

    const formData = validationResult.data;

    // Check for spam (honeypot)
    if (isSpamSubmission(formData)) {
      console.warn('Spam submission blocked', {
        email: formData.email,
      });

      // Return success to not reveal spam detection
      const spamResponse: SuccessResponse = {
        success: true,
        message: "Thank you for your message. We'll be in touch soon!",
      };

      res.status(200).json(spamResponse);
      return;
    }

    // Additional email validation
    if (isSuspiciousEmail(formData.email)) {
      console.warn('Suspicious email detected', {
        email: formData.email,
      });

      const suspiciousResponse: ErrorResponse = {
        success: false,
        error: 'Please provide a valid email address',
      };

      res.status(400).json(suspiciousResponse);
      return;
    }

    // Log successful validation (sanitized data)
    console.log('Form data validated', {
      name: formData.name,
      email: formData.email,
      hasCompany: !!formData.company,
      messageLength: formData.message.length,
    });

    // Initialize SendGrid
    const sendGridInitialized = initializeSendGrid(config.sendgridApiKey);

    if (!sendGridInitialized) {
      console.error('SendGrid not initialized - cannot send email');

      const configErrorResponse: ErrorResponse = {
        success: false,
        error: 'Email service is not configured. Please try again later.',
      };

      res.status(500).json(configErrorResponse);
      return;
    }

    // Send email
    await sendEmail(formData, config);

    // Success response
    const successResponse: SuccessResponse = {
      success: true,
      message: "Thank you for your message. We'll be in touch soon!",
    };

    console.log('Contact form submission successful', {
      email: formData.email,
    });

    res.status(200).json(successResponse);

  } catch (error) {
    // Log error details for debugging
    console.error('Contact form error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return generic error to client (don't expose internal details)
    const serverErrorResponse: ErrorResponse = {
      success: false,
      error: 'Something went wrong. Please try again later.',
    };

    res.status(500).json(serverErrorResponse);
  }
}

/**
 * Register the function with the Functions Framework
 */
functions.http('contactForm', contactForm);
