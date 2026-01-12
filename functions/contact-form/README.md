# Contact Form Cloud Function

A Google Cloud Function (Gen 2) that handles contact form submissions and sends emails via SendGrid.

## Features

- ✅ **CORS Support** - Configurable allowed origins
- ✅ **Validation** - Comprehensive input validation
- ✅ **Anti-Spam** - Honeypot field for bot detection
- ✅ **Security** - Secret Manager integration for API keys
- ✅ **Type Safety** - Full TypeScript implementation
- ✅ **Error Handling** - Graceful error responses
- ✅ **Logging** - Structured logging for monitoring

## Infrastructure

This function is deployed and managed by Pulumi. See `infrastructure/resources/contactForm.ts` for the infrastructure code.

**Resources:**
- Cloud Function Gen 2 (Node.js 20)
- Service Account with minimal permissions
- Secret Manager secret for SendGrid API key
- GCS bucket for function source code
- IAM bindings for public access and secret access

## API

### Endpoint

```
POST https://{region}-{project}.cloudfunctions.net/{function-name}
```

The actual URL is available after deployment via Pulumi outputs:
```bash
pulumi stack output contactFormFunctionUrl
```

### Request

**Method:** `POST`
**Content-Type:** `application/json`

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "Hello, I'd like to get in touch!",
  "phone": "+1234567890",
  "company": "Acme Inc",
  "honeypot": ""
}
```

**Required Fields:**
- `name` (string, max 100 chars)
- `email` (string, valid email, max 255 chars)
- `message` (string, max 5000 chars)

**Optional Fields:**
- `phone` (string, max 50 chars)
- `company` (string, max 100 chars)
- `honeypot` (string, must be empty - anti-spam)

### Response

**Success (200):**
```json
{
  "success": true,
  "message": "Your message has been sent successfully. We'll get back to you soon!"
}
```

**Error (400):**
```json
{
  "error": "Email is required"
}
```

**Error (403):**
```json
{
  "error": "Origin not allowed"
}
```

**Error (405):**
```json
{
  "error": "Method not allowed"
}
```

**Error (500):**
```json
{
  "error": "Failed to send message. Please try again later."
}
```

## Environment Variables

Configured automatically by Pulumi from stack config:

- `SENDGRID_API_KEY` - SendGrid API key (from Secret Manager)
- `EMAIL_FROM` - Sender email address
- `EMAIL_REPLY_TO` - Reply-to email address
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
- `ENVIRONMENT` - Environment name (staging/production)

## Development

### Install Dependencies

```bash
cd functions/contact-form
pnpm install
```

### Build

```bash
pnpm run build
```

### Package for Deployment

```bash
pnpm run package
```

This creates `function-source.zip` ready for upload to GCS.

### Watch Mode

```bash
pnpm run watch
```

## Deployment

Deployment is managed by Pulumi. The infrastructure code automatically:

1. Creates the function infrastructure
2. Uploads a placeholder archive
3. Configures environment variables from Pulumi config
4. Sets up IAM permissions

**To deploy:**

```bash
cd infrastructure

# Build the function
cd ../functions/contact-form
pnpm install
pnpm run package

# Upload and deploy via Pulumi
cd ../../infrastructure
pulumi up
```

**To update function code:**

After making changes to the function code:

```bash
cd functions/contact-form
pnpm run package

# Upload the new archive to GCS
gsutil cp function-source.zip gs://$(pulumi stack output contactFormBucket)/

# Redeploy the function
cd ../../infrastructure
pulumi up
```

## Testing

### Local Testing

```bash
# Set environment variables
export SENDGRID_API_KEY="your-api-key"
export EMAIL_FROM="noreply@example.com"
export EMAIL_REPLY_TO="hello@example.com"
export ALLOWED_ORIGINS="http://localhost:3000"
export ENVIRONMENT="development"

# Run with Functions Framework
npx functions-framework --target=contactForm --source=dist
```

### Test Request

```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "message": "This is a test message",
    "honeypot": ""
  }'
```

### Production Testing

```bash
FUNCTION_URL=$(cd ../../infrastructure && pulumi stack output contactFormFunctionUrl)

curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Origin: https://dcmco.com.au" \
  -d '{
    "name": "Production Test",
    "email": "test@example.com",
    "message": "Testing production function",
    "honeypot": ""
  }'
```

## Monitoring

View function logs:

```bash
# Staging
gcloud functions logs read dcmco-staging-contact-form \
  --region=australia-southeast1 --gen2

# Production
gcloud functions logs read dcmco-production-contact-form \
  --region=australia-southeast1 --gen2
```

View metrics in Cloud Console:
- https://console.cloud.google.com/functions/list

## Security

- **CORS Protection** - Only allows requests from configured origins
- **Input Validation** - Validates all input fields
- **Honeypot** - Detects and blocks bot submissions
- **Secret Manager** - API keys stored securely
- **Rate Limiting** - Configurable max instances prevent abuse
- **Service Account** - Minimal permissions (invoker + secret accessor)

## Troubleshooting

### Function not receiving requests
- Check CORS configuration matches your frontend origin
- Verify function is publicly accessible (check IAM bindings)
- Check Cloud Function logs for errors

### Email not sending
- Verify SendGrid API key is valid
- Check SendGrid sender verification
- Review function logs for SendGrid errors
- Ensure EMAIL_FROM is verified in SendGrid

### 403 Origin not allowed
- Add your origin to `allowedOrigins` in Pulumi config
- Redeploy with `pulumi up`

## License

MIT
