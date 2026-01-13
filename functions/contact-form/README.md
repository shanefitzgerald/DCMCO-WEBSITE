# Contact Form Cloud Function

A serverless Cloud Function (Gen 2) that handles contact form submissions and sends emails via SendGrid.

## Features

- ✅ **CORS Protection**: Only accepts requests from allowed origins
- ✅ **Input Validation**: Validates required fields (name, email, message)
- ✅ **Email Format Validation**: Ensures valid email addresses
- ✅ **Length Limits**: Prevents abuse with field length validation
- ✅ **Honeypot Anti-Spam**: Hidden field to catch bots
- ✅ **SendGrid Integration**: Sends formatted emails with proper error handling
- ✅ **Secure Secret Management**: API key stored in Google Secret Manager
- ✅ **Structured Error Responses**: Clear, user-friendly error messages

## API

### Endpoint

```
POST https://australia-southeast1-dcmco-prod-2026.cloudfunctions.net/dcmco-staging-contact-form
```

### Request

**Headers:**
- `Content-Type: application/json`
- `Origin: <allowed-origin>` (required for CORS)

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "This is my message",
  "phone": "+61 400 000 000",
  "company": "Example Corp",
  "honeypot": ""
}
```

**Required Fields:**
- `name` (string, 1-100 chars)
- `email` (string, valid format, max 255 chars)
- `message` (string, 1-5000 chars)

**Optional Fields:**
- `phone` (string, max 50 chars)
- `company` (string, max 100 chars)
- `honeypot` (string, must be empty - anti-spam field)

### Response

**Success (200):**
```json
{
  "success": true,
  "message": "Your message has been sent successfully. We'll get back to you soon!"
}
```

**Validation Error (400):**
```json
{
  "error": "Email is required, Message is required"
}
```

**CORS Error (403):**
```json
{
  "error": "Origin not allowed"
}
```

**Method Not Allowed (405):**
```json
{
  "error": "Method not allowed"
}
```

**Server Error (500):**
```json
{
  "error": "Failed to send message. Please try again later."
}
```

## Configuration

The function requires the following environment variables:

- `SENDGRID_API_KEY`: SendGrid API key (from Secret Manager)
- `EMAIL_FROM`: Sender email address (must be verified in SendGrid)
- `EMAIL_REPLY_TO`: Reply-to email address
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins
- `ENVIRONMENT`: Environment name (staging/production)

These are configured via Pulumi in [`infrastructure/resources/contactForm.ts`](../../infrastructure/resources/contactForm.ts).

## Local Development

### Prerequisites

- Node.js 20 or higher
- pnpm (or npm)

### Install Dependencies

```bash
pnpm install
```

### Build

```bash
# Compile TypeScript
pnpm run build

# Watch for changes
pnpm run watch
```

### Package for Deployment

```bash
# Create function-source.zip
pnpm run package
```

This creates a zip file with the source code that Pulumi uploads to Cloud Storage.

## Testing

### Test with curl

```bash
# Successful submission
curl -X POST "https://australia-southeast1-dcmco-prod-2026.cloudfunctions.net/dcmco-staging-contact-form" \
  -H "Content-Type: application/json" \
  -H "Origin: https://staging.dcmco.com.au" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "message": "This is a test message"
  }'

# Test CORS rejection
curl -X POST "https://australia-southeast1-dcmco-prod-2026.cloudfunctions.net/dcmco-staging-contact-form" \
  -H "Content-Type: application/json" \
  -H "Origin: https://evil.com" \
  -d '{"name":"Test","email":"test@example.com","message":"Test"}'

# Test validation
curl -X POST "https://australia-southeast1-dcmco-prod-2026.cloudfunctions.net/dcmco-staging-contact-form" \
  -H "Content-Type: application/json" \
  -H "Origin: https://staging.dcmco.com.au" \
  -d '{"name":"Test User"}'

# Test honeypot
curl -X POST "https://australia-southeast1-dcmco-prod-2026.cloudfunctions.net/dcmco-staging-contact-form" \
  -H "Content-Type: application/json" \
  -H "Origin: https://staging.dcmco.com.au" \
  -d '{"name":"Test","email":"test@example.com","message":"Test","honeypot":"spam"}'
```

### View Logs

```bash
# View recent logs
gcloud functions logs read dcmco-staging-contact-form \
  --region=australia-southeast1 \
  --gen2 \
  --limit=20

# Follow logs in real-time
gcloud functions logs read dcmco-staging-contact-form \
  --region=australia-southeast1 \
  --gen2 \
  --limit=20 \
  --follow
```

## Deployment

The function is automatically deployed via Pulumi when changes are detected.

### Manual Deployment

```bash
# From infrastructure directory
cd ../../infrastructure

# Preview changes
pulumi preview

# Deploy
pulumi up
```

### Deploy with gcloud

If you need to deploy manually:

```bash
gcloud functions deploy dcmco-staging-contact-form \
  --gen2 \
  --region=australia-southeast1 \
  --runtime=nodejs20 \
  --source=. \
  --entry-point=contactForm \
  --trigger-http \
  --allow-unauthenticated
```

## Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ POST /contact-form
       ▼
┌─────────────────────┐
│  Cloud Function     │
│  (Node.js 20)       │
│  ┌────────────┐     │
│  │ CORS Check │     │
│  └─────┬──────┘     │
│        ▼            │
│  ┌────────────┐     │
│  │ Validate   │     │
│  │ Input      │     │
│  └─────┬──────┘     │
│        ▼            │
│  ┌────────────┐     │
│  │ SendGrid   │     │
│  │ Send Email │     │
│  └─────┬──────┘     │
└────────┼────────────┘
         │
         ▼
   ┌──────────┐
   │ SendGrid │
   │ API      │
   └──────────┘
```

## Security

- **CORS**: Only accepts requests from configured origins
- **Input Validation**: All fields validated for type, format, and length
- **Honeypot**: Hidden field catches automated bots
- **Secret Management**: API key stored in Google Secret Manager
- **Minimal Permissions**: Service account has only required IAM roles
- **HTTPS Only**: Function enforces HTTPS connections
- **Rate Limiting**: Cloud Functions provides built-in rate limiting

## Troubleshooting

### Email not sending

1. Check SendGrid logs at https://app.sendgrid.com/
2. Verify sender email is verified in SendGrid
3. Check Cloud Function logs for errors
4. Verify Secret Manager has correct API key

### CORS errors

1. Ensure request includes `Origin` header
2. Verify origin is in `ALLOWED_ORIGINS` config
3. Check browser console for specific CORS error

### Function not responding

1. Check function status: `gcloud functions describe dcmco-staging-contact-form --region=australia-southeast1 --gen2`
2. View logs for errors
3. Verify function has completed deployment
4. Check build logs in Cloud Build

## License

MIT License - Copyright (c) 2026 DCM CO
