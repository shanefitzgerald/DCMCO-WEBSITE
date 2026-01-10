# Quick Testing Reference

## Setup (First Time Only)

```bash
cd functions/contact-form
npm install
cp .env.example .env
# Edit .env and add your SENDGRID_API_KEY
```

## Start Local Function

### Option 1: Standard (rebuild required after changes)
```bash
npm run build
npm run dev
```

### Option 2: Watch Mode (auto-reload on changes)
```bash
npm run dev:watch
```

Function runs at: **http://localhost:8080**

---

## Test Commands

### 1. Valid Submission (All Fields)

```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "company": "Acme Corp",
    "phone": "+61 400 000 000",
    "message": "I would like to inquire about your AI consulting services for the construction industry."
  }'
```

**Expected:** `{"success": true, "message": "Thank you for your message..."}`

---

### 2. Minimal Valid Submission (Required Fields Only)

```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "message": "Quick question about your services."
  }'
```

**Expected:** `{"success": true, "message": "Thank you for your message..."}`

---

### 3. Test CORS Preflight (OPTIONS)

```bash
curl -X OPTIONS http://localhost:8080 \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

**Expected:** Status `204` with CORS headers

---

### 4. Test Invalid Email

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

**Expected:** `{"success": false, "error": "Validation failed", "details": [...]}`

---

### 5. Test Missing Required Fields

```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "name": "Test User"
  }'
```

**Expected:** Validation error for missing `email` and `message`

---

### 6. Test Message Too Short

```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "message": "Too short"
  }'
```

**Expected:** Validation error - message must be at least 10 characters

---

### 7. Test CORS Rejection (Invalid Origin)

```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -H "Origin: https://malicious-site.com" \
  -d '{
    "name": "Hacker",
    "email": "hacker@malicious.com",
    "message": "This should be rejected due to CORS"
  }'
```

**Expected:** `{"success": false, "error": "Origin not allowed"}`

---

### 8. Test Method Not Allowed (GET instead of POST)

```bash
curl -X GET http://localhost:8080 \
  -H "Origin: http://localhost:3000"
```

**Expected:** `{"success": false, "error": "Method not allowed. Use POST."}`

---

## Verify Email Delivery

After a successful submission:

1. Check recipient inbox (check spam folder too)
2. Check SendGrid activity: https://app.sendgrid.com/email_activity
3. Look for console logs showing email sent

---

## Debugging Tips

### Enable Verbose Logging

Check the console output where you ran `npm run dev` - it shows:
- Incoming requests
- Validation results
- SendGrid status
- Errors

### Common Issues

**"SENDGRID_API_KEY not set"**
- Create `.env` file from `.env.example`
- Add your actual SendGrid API key
- Restart the function

**"Forbidden - could not verify your access"**
- Verify sender email in SendGrid
- Ensure `FROM_EMAIL` in `.env` matches verified email

**CORS errors**
- Check `Origin` header is set in request
- Verify origin is in `ALLOWED_ORIGINS` array in `src/index.ts`

---

## Next.js Integration Test

Test from your Next.js frontend:

```typescript
const response = await fetch('http://localhost:8080', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Test User',
    email: 'test@example.com',
    message: 'Testing from Next.js frontend',
  }),
});

const result = await response.json();
console.log(result);
```

---

## Quick Validation Reference

| Field | Type | Required | Min | Max | Notes |
|-------|------|----------|-----|-----|-------|
| name | string | Yes | 2 | 100 | - |
| email | string | Yes | - | - | Must be valid email |
| company | string | No | - | 100 | Can be empty |
| phone | string | No | - | 20 | Can be empty |
| message | string | Yes | 10 | 1000 | - |
