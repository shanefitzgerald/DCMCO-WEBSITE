# Local Development Guide

Complete guide for developing and testing the contact form Cloud Function locally **without** a SendGrid API key.

## Quick Start

```bash
cd functions/contact-form

# 1. Install dependencies
npm install

# 2. Create .env file (no SendGrid key needed!)
cp .env.example .env

# 3. Build TypeScript
npm run build

# 4. Start local server
npm run dev
```

Function runs at: **http://localhost:8080**

## Mock Email Mode

The function automatically detects when `SENDGRID_API_KEY` is not configured and enters **mock mode**:

- ✅ All validation still works
- ✅ Spam protection still works
- ✅ CORS checks still work
- ✅ Email content is logged to console instead of sending
- ✅ Returns success response just like production

**No SendGrid account needed for local development!**

## Environment Setup

### Minimal `.env` for Local Development

```bash
# Email Configuration (mock mode - no real emails sent)
EMAIL_RECIPIENT=shanesrf@gmail.com
FROM_EMAIL=shanesrf@gmail.com

# CORS Origins (local development)
ALLOWED_ORIGINS=http://localhost:3000

# Environment
NODE_ENV=development

# SendGrid (optional - leave empty for mock mode)
# SENDGRID_API_KEY=
```

### Optional: Test with Real SendGrid

If you want to test actual email sending:

```bash
# Get free SendGrid account at https://signup.sendgrid.com/
# Create API key at https://app.sendgrid.com/settings/api_keys
SENDGRID_API_KEY=SG.your-key-here
```

## Running the Function

### Option 1: Standard Mode (Rebuild Required)

```bash
# Build TypeScript
npm run build

# Start function
npm run dev
```

After code changes, you need to rebuild:
```bash
npm run build && npm run dev
```

### Option 2: Watch Mode (Auto-Reload) ⭐ Recommended

```bash
# Automatically rebuilds and reloads on file changes
npm run dev:watch
```

This runs:
- TypeScript compiler in watch mode
- Nodemon to restart function on changes
- No manual rebuilding needed!

## Testing

### Using the Test Script

```bash
# Run all tests
bash test-function.sh

# Or run individual tests
bash test-function.sh valid
bash test-function.sh invalid-email
bash test-function.sh honeypot
```

### Manual Testing with curl

**1. Valid Submission:**

```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "company": "Acme Corp",
    "phone": "+61 400 000 000",
    "message": "I would like to inquire about your AI consulting services."
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Thank you for your message. We will get back to you soon!"
}
```

**Expected Console Output:**
```
================================================================================
📧 MOCK EMAIL (SendGrid API key not configured)
================================================================================
To: shanesrf@gmail.com
From: DCMCO Website <shanesrf@gmail.com>
Reply-To: John Doe <john@example.com>
Subject: New Contact Form Submission - DCMCO
--------------------------------------------------------------------------------
TEXT CONTENT:
New contact form submission from DCMCO website:

Name: John Doe
Email: john@example.com
Company: Acme Corp
Phone: +61 400 000 000

Message:
I would like to inquire about your AI consulting services.
--------------------------------------------------------------------------------
HTML CONTENT:
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
      ...
================================================================================
✅ Mock email logged successfully
```

**2. Test Validation Errors:**

```bash
# Missing required fields
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "name": "Test User"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Email is required"
    },
    {
      "field": "message",
      "message": "Message is required"
    }
  ]
}
```

**3. Test Invalid Email:**

```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "name": "Test User",
    "email": "not-an-email",
    "message": "This should fail validation"
  }'
```

**4. Test Honeypot (Spam Protection):**

```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "name": "Spam Bot",
    "email": "bot@spam.com",
    "message": "This is automated spam",
    "honeypot": "I am a bot filling this field"
  }'
```

**Expected:** Returns success (to not reveal spam detection), but **no mock email is logged**.

**5. Test Suspicious Email Pattern:**

```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "name": "Test User",
    "email": "test@test.com",
    "message": "This should be rejected"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Please provide a valid email address"
}
```

**6. Test CORS Preflight:**

```bash
curl -X OPTIONS http://localhost:8080 \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

**Expected:** Status `204` with CORS headers.

**7. Test CORS Rejection:**

```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -H "Origin: https://malicious-site.com" \
  -d '{
    "name": "Hacker",
    "email": "hack@evil.com",
    "message": "Should be rejected"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Origin not allowed"
}
```

**8. Test Method Not Allowed:**

```bash
curl -X GET http://localhost:8080 \
  -H "Origin: http://localhost:3000"
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Method not allowed. Please use POST."
}
```

## Integration Testing with Next.js

### 1. Start the Function

```bash
cd functions/contact-form
npm run dev:watch
```

### 2. Start Next.js Dev Server

```bash
# In another terminal
cd ../../  # Back to project root
pnpm dev
```

### 3. Configure Next.js Environment

```bash
# .env.local
NEXT_PUBLIC_CONTACT_FORM_URL=http://localhost:8080
```

### 4. Test from Frontend

Create a simple test page:

```typescript
// pages/test-contact.tsx
import { useState } from 'react';

export default function TestContact() {
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async () => {
    const response = await fetch('http://localhost:8080', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        message: 'Testing from Next.js frontend!',
      }),
    });

    const data = await response.json();
    setResult(data);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Test Contact Form</h1>
      <button onClick={handleSubmit}>
        Submit Test Form
      </button>
      {result && (
        <pre>{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}
```

Visit: http://localhost:3000/test-contact

## Debugging Tips

### Enable Verbose Logging

The function already logs detailed information in development:

```typescript
// Request logging (automatic)
console.log('Request received:', {
  method: req.method,
  origin: req.headers.origin,
  contentType: req.headers['content-type'],
});

// Validation logging (automatic)
console.warn('Validation failed:', validationErrors);

// Mock email logging (automatic when no SendGrid key)
console.log('📧 MOCK EMAIL ...');
```

### Watch Console Output

When running `npm run dev:watch`, you'll see:

```
Serving function...
Function: contactForm
Signature type: http
URL: http://localhost:8080/
```

Then all requests and responses are logged:

```
Request received: POST http://localhost:8080/
Origin: http://localhost:3000
Valid submission from: john@example.com
📧 MOCK EMAIL (SendGrid API key not configured)
...
✅ Mock email logged successfully
Response sent: 200 OK
```

### Debug with VS Code

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Cloud Function",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/functions/contact-form",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "console": "integratedTerminal",
      "envFile": "${workspaceFolder}/functions/contact-form/.env"
    }
  ]
}
```

Set breakpoints and press F5 to debug!

## Common Issues

### Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::8080
```

**Solution:**
```bash
# Kill process on port 8080
lsof -ti:8080 | xargs kill -9

# Or use a different port
PORT=8081 npm run dev
```

### Module Not Found

**Error:**
```
Cannot find module '@google-cloud/functions-framework'
```

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

**Error:**
```
error TS2304: Cannot find name 'Request'
```

**Solution:**
```bash
# Rebuild
npm run build

# Check types
npx tsc --noEmit
```

### CORS Errors from Frontend

**Error in browser console:**
```
Access to fetch at 'http://localhost:8080' from origin 'http://localhost:3000' has been blocked by CORS
```

**Solution:**

Check `.env`:
```bash
ALLOWED_ORIGINS=http://localhost:3000
```

Restart function after changing `.env`.

## Mock vs Real SendGrid

### When to Use Mock Mode

✅ **Use mock mode (no SENDGRID_API_KEY) when:**
- Developing new features
- Testing validation logic
- Testing CORS configuration
- Testing spam protection
- Running integration tests
- Don't want to hit SendGrid rate limits

### When to Use Real SendGrid

✅ **Use real SendGrid when:**
- Testing actual email delivery
- Verifying email templates
- Testing SendGrid error handling
- Final pre-deployment validation

## Testing Checklist

Before deploying to production, test:

- [ ] Valid submission with all fields
- [ ] Valid submission with only required fields
- [ ] Missing name
- [ ] Missing email
- [ ] Missing message
- [ ] Invalid email format
- [ ] Message too short (<10 chars)
- [ ] Message too long (>1000 chars)
- [ ] Honeypot filled (bot detection)
- [ ] Suspicious email pattern (test@test.com)
- [ ] CORS preflight (OPTIONS)
- [ ] CORS allowed origin
- [ ] CORS rejected origin
- [ ] Method not allowed (GET)
- [ ] Invalid Content-Type
- [ ] Integration with Next.js frontend

## Performance Testing

### Load Testing with Apache Bench

```bash
# Test 100 requests with 10 concurrent
ab -n 100 -c 10 -T "application/json" \
  -H "Origin: http://localhost:3000" \
  -p test-payload.json \
  http://localhost:8080/
```

Where `test-payload.json`:
```json
{
  "name": "Load Test",
  "email": "loadtest@example.com",
  "message": "Testing performance under load"
}
```

### Expected Performance

Local function should handle:
- **Single request:** < 50ms
- **100 requests (10 concurrent):** < 5 seconds
- **Memory usage:** < 100MB

## Next Steps

After local testing:

1. **Get SendGrid API key** (when ready for production)
   - Sign up: https://signup.sendgrid.com/
   - Verify sender email
   - Create API key

2. **Test with real SendGrid**
   - Add `SENDGRID_API_KEY` to `.env`
   - Restart function
   - Test email delivery

3. **Deploy to GCP**
   - See [../infrastructure/docs/FUNCTIONS_DEPLOYMENT.md](../../infrastructure/docs/FUNCTIONS_DEPLOYMENT.md)
   - Build function: `bash infrastructure/scripts/build-function.sh`
   - Deploy with CDKTF

4. **Update Next.js frontend**
   - Set `NEXT_PUBLIC_CONTACT_FORM_URL` to deployed function URL
   - Test from production frontend

## Resources

- [Functions Framework Documentation](https://github.com/GoogleCloudPlatform/functions-framework-nodejs)
- [SendGrid API Documentation](https://docs.sendgrid.com/api-reference/mail-send/mail-send)
- [Joi Validation Documentation](https://joi.dev/api/)
- [Cloud Functions Gen 2 Local Testing](https://cloud.google.com/functions/docs/running/function-frameworks)
