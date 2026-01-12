import { HttpFunction } from "@google-cloud/functions-framework";
import * as sgMail from "@sendgrid/mail";

/**
 * Contact Form Data Structure
 */
interface ContactFormData {
  name: string;
  email: string;
  message: string;
  phone?: string;
  company?: string;
  honeypot?: string; // Anti-spam honeypot field
}

/**
 * Environment Configuration
 */
interface Config {
  sendgridApiKey: string;
  emailFrom: string;
  emailReplyTo: string;
  allowedOrigins: string[];
  environment: string;
}

/**
 * Load and validate configuration from environment variables
 */
function loadConfig(): Config {
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  const emailReplyTo = process.env.EMAIL_REPLY_TO;
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
  const environment = process.env.ENVIRONMENT || "development";

  if (!sendgridApiKey) {
    throw new Error("SENDGRID_API_KEY environment variable is required");
  }

  if (!emailFrom) {
    throw new Error("EMAIL_FROM environment variable is required");
  }

  if (!emailReplyTo) {
    throw new Error("EMAIL_REPLY_TO environment variable is required");
  }

  return {
    sendgridApiKey,
    emailFrom,
    emailReplyTo,
    allowedOrigins,
    environment,
  };
}

/**
 * Validate contact form data
 */
function validateContactForm(data: any): ContactFormData {
  const errors: string[] = [];

  // Required fields
  if (!data.name || typeof data.name !== "string" || data.name.trim().length === 0) {
    errors.push("Name is required");
  }

  if (!data.email || typeof data.email !== "string" || data.email.trim().length === 0) {
    errors.push("Email is required");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("Invalid email format");
  }

  if (!data.message || typeof data.message !== "string" || data.message.trim().length === 0) {
    errors.push("Message is required");
  }

  // Honeypot check (should be empty)
  if (data.honeypot && data.honeypot.trim().length > 0) {
    throw new Error("Spam detected");
  }

  // Length validation
  if (data.name && data.name.length > 100) {
    errors.push("Name must be less than 100 characters");
  }

  if (data.email && data.email.length > 255) {
    errors.push("Email must be less than 255 characters");
  }

  if (data.message && data.message.length > 5000) {
    errors.push("Message must be less than 5000 characters");
  }

  if (data.phone && data.phone.length > 50) {
    errors.push("Phone must be less than 50 characters");
  }

  if (data.company && data.company.length > 100) {
    errors.push("Company must be less than 100 characters");
  }

  if (errors.length > 0) {
    throw new Error(errors.join(", "));
  }

  return {
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    message: data.message.trim(),
    phone: data.phone?.trim(),
    company: data.company?.trim(),
    honeypot: data.honeypot,
  };
}

/**
 * Set CORS headers
 */
function setCorsHeaders(res: any, origin: string | undefined, allowedOrigins: string[]): boolean {
  // Check if origin is allowed
  if (!origin) {
    return false;
  }

  const isAllowed = allowedOrigins.some((allowed) => {
    // Exact match or wildcard
    if (allowed === "*") return true;
    if (allowed === origin) return true;

    // Support for localhost with any port in development
    if (allowed.includes("localhost") && origin.includes("localhost")) {
      return true;
    }

    return false;
  });

  if (isAllowed) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Max-Age", "3600");
    return true;
  }

  return false;
}

/**
 * Send email via SendGrid
 */
async function sendEmail(formData: ContactFormData, config: Config): Promise<void> {
  sgMail.setApiKey(config.sendgridApiKey);

  const emailContent = `
New Contact Form Submission

Name: ${formData.name}
Email: ${formData.email}
${formData.phone ? `Phone: ${formData.phone}` : ""}
${formData.company ? `Company: ${formData.company}` : ""}

Message:
${formData.message}

---
Sent from DCMCO Contact Form (${config.environment})
`.trim();

  const msg = {
    to: config.emailReplyTo,
    from: config.emailFrom,
    replyTo: formData.email,
    subject: `Contact Form: ${formData.name}`,
    text: emailContent,
    html: emailContent.replace(/\n/g, "<br>"),
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent successfully for ${formData.email}`);
  } catch (error: any) {
    console.error("SendGrid error:", error.response?.body || error.message);
    throw new Error("Failed to send email");
  }
}

/**
 * Main Cloud Function handler
 */
export const contactForm: HttpFunction = async (req, res) => {
  const startTime = Date.now();

  try {
    // Load configuration
    const config = loadConfig();

    // Get origin from request
    const origin = req.get("origin");

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      const corsAllowed = setCorsHeaders(res, origin, config.allowedOrigins);
      if (!corsAllowed) {
        res.status(403).json({ error: "Origin not allowed" });
        return;
      }
      res.status(204).send("");
      return;
    }

    // Set CORS headers for actual request
    const corsAllowed = setCorsHeaders(res, origin, config.allowedOrigins);
    if (!corsAllowed) {
      res.status(403).json({ error: "Origin not allowed" });
      return;
    }

    // Only allow POST
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    // Validate and parse request body
    let formData: ContactFormData;
    try {
      formData = validateContactForm(req.body);
    } catch (error: any) {
      console.warn("Validation error:", error.message);
      res.status(400).json({ error: error.message });
      return;
    }

    // Send email
    try {
      await sendEmail(formData, config);
    } catch (error: any) {
      console.error("Email send error:", error.message);
      res.status(500).json({ error: "Failed to send message. Please try again later." });
      return;
    }

    // Success response
    const duration = Date.now() - startTime;
    console.log(`Contact form processed successfully in ${duration}ms`);

    res.status(200).json({
      success: true,
      message: "Your message has been sent successfully. We'll get back to you soon!",
    });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    res.status(500).json({
      error: "An unexpected error occurred. Please try again later.",
    });
  }
};
