# DCMCO Contact Form Cloud Function

Google Cloud Function (Gen 2) for handling contact form submissions from the DCMCO marketing website.

## Features

- ✅ TypeScript-based Cloud Function
- ✅ Form validation using Joi
- ✅ Email delivery via SendGrid
- ✅ CORS protection
- ✅ Comprehensive error handling
- ✅ Local development support

## Prerequisites

- Node.js 20+
- npm or pnpm
- SendGrid account (free tier available)

## Directory Structure

```
functions/contact-form/
├── src/
│   └── index.ts          # Function entry point
├── dist/                 # Compiled JavaScript (gitignored)
├── node_modules/         # Dependencies (gitignored)
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── .env                  # Environment variables (gitignored)
├── .env.example          # Example environment variables
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

## Setup

### 1. Install Dependencies

```bash
cd functions/contact-form
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your SendGrid API key:

```bash
SENDGRID_API_KEY=SG.your-actual-api-key-here
CONTACT_EMAIL=contact@dcmco.com.au
FROM_EMAIL=noreply@dcmco.com.au
```

**To get a SendGrid API key:**

1. Sign up at [SendGrid](https://signup.sendgrid.com/)
2. Verify your email address
3. Go to [API Keys](https://app.sendgrid.com/settings/api_keys)
4. Create a new API key with "Mail Send" permissions
5. Copy the key to your `.env` file

**Important:** You must verify your sender email in SendGrid:
- Go to [Sender Authentication](https://app.sendgrid.com/settings/sender_auth)
- Add and verify your `FROM_EMAIL` address

### 3. Build the Function

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

## Local Development

### Run Locally

Start the function locally on port 8080:

```bash
npm run build
npm run dev
```

The function will be available at: `http://localhost:8080`

### Watch Mode (Hot Reload)

For development with automatic rebuild and reload:

```bash
npm run dev:watch
```

This runs TypeScript in watch mode and automatically restarts the function when files change.

## Testing

### Test with curl

**Valid submission:**

```bash
curl -X POST http://localhost:8080 \\
  -H "Content-Type: application/json" \\
  -H "Origin: http://localhost:3000" \\
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "company": "Acme Corp",
    "phone": "+61 400 000 000",
    "message": "I would like to inquire about your services."
  }'
```

**Expected response:**

```json
{
  "success": true,
  "message": "Thank you for your message. We will get back to you soon!"
}
```

**Test CORS preflight:**

```bash
curl -X OPTIONS http://localhost:8080 \\
  -H "Origin: http://localhost:3000" \\
  -H "Access-Control-Request-Method: POST" \\
  -H "Access-Control-Request-Headers: Content-Type" \\
  -v
```

**Test validation errors:**

```bash
# Missing required field
curl -X POST http://localhost:8080 \\
  -H "Content-Type: application/json" \\
  -H "Origin: http://localhost:3000" \\
  -d '{
    "name": "John Doe",
    "email": "invalid-email"
  }'
```

**Expected validation error response:**

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "\"email\" must be a valid email"
    },
    {
      "field": "message",
      "message": "\"message\" is required"
    }
  ]
}
```

### Test with Postman

1. Create a new POST request to `http://localhost:8080`
2. Set headers:
   - `Content-Type: application/json`
   - `Origin: http://localhost:3000`
3. Set body (raw JSON):
   ```json
   {
     "name": "Jane Smith",
     "email": "jane@example.com",
     "message": "Test message from Postman"
   }
   ```
4. Send the request

### Test from Next.js Frontend

In your Next.js app, create a contact form:

```typescript
// Example contact form submission
async function submitContactForm(data: ContactFormData) {
  const response = await fetch('http://localhost:8080', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to submit form');
  }

  return result;
}
```

## Validation Rules

The contact form validates:

- **name**: String, 2-100 characters, required
- **email**: Valid email address, required
- **company**: String, max 100 characters, optional
- **phone**: String, max 20 characters, optional
- **message**: String, 10-1000 characters, required

## CORS Configuration

Allowed origins (configured in `src/index.ts`):

- `http://localhost:3000` (local development)
- `https://dcmco-prod-2026.web.app` (production Firebase)
- `https://dcmco-staging.web.app` (staging Firebase)

Add custom domains when configured:

```typescript
const ALLOWED_ORIGINS = [
  // ... existing origins
  'https://www.dcmco.com.au',
  'https://staging.dcmco.com.au',
];
```

## Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `SENDGRID_API_KEY` | SendGrid API key | Yes | `SG.xxx...` |
| `CONTACT_EMAIL` | Recipient email for form submissions | No | `contact@dcmco.com.au` |
| `FROM_EMAIL` | Sender email address (must be verified) | No | `noreply@dcmco.com.au` |

## Troubleshooting

### "SENDGRID_API_KEY not set"

- Ensure `.env` file exists in `functions/contact-form/`
- Check that `SENDGRID_API_KEY` is set in `.env`
- Restart the function after adding the key

### "Origin not allowed" (CORS error)

- Check that the request includes an `Origin` header
- Verify the origin is in the `ALLOWED_ORIGINS` array
- Add your origin to the list if needed

### "Forbidden - could not verify your access"

- Verify your sender email in SendGrid
- Check that `FROM_EMAIL` matches a verified email
- Wait a few minutes after email verification

### Email not received

- Check SendGrid activity feed: https://app.sendgrid.com/email_activity
- Verify recipient email address is correct
- Check spam folder
- Ensure SendGrid API key has "Mail Send" permission

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start function locally on port 8080 |
| `npm run dev:watch` | Start with hot reload (recommended for development) |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run build:watch` | Compile TypeScript in watch mode |
| `npm run clean` | Remove dist directory |

## Next Steps

After local testing:

1. **Deploy with CDKTF** - Add Cloud Function resource to your CDKTF stack
2. **Set environment variables** - Configure secrets in Google Cloud
3. **Test deployed function** - Verify it works in production
4. **Update frontend** - Point form to production Cloud Function URL

## Resources

- [Cloud Functions Framework](https://github.com/GoogleCloudPlatform/functions-framework-nodejs)
- [SendGrid Node.js Library](https://github.com/sendgrid/sendgrid-nodejs)
- [Joi Validation](https://joi.dev/api/)
- [Cloud Functions Gen 2 Documentation](https://cloud.google.com/functions/docs/2nd-gen/overview)
