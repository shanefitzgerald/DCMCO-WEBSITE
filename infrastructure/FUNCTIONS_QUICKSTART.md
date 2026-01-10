# Cloud Functions Quick Start

Deploy the contact form Cloud Function in 5 minutes.

## Prerequisites

- SendGrid account with API key
- GCP project configured
- Infrastructure dependencies installed (`pnpm install`)

## Step-by-Step

### 1. Build the Function (2 min)

```bash
# From project root
bash infrastructure/scripts/build-function.sh
```

**Output:** `infrastructure/function-source.zip`

### 2. Configure Environment (1 min)

```bash
cd infrastructure

# Copy example
cp .env.example .env

# Add your SendGrid API key
echo "SENDGRID_API_KEY=SG.your-key-here" >> .env
```

**Minimal `.env` for staging:**
```bash
GCP_PROJECT_ID=dcmco-prod-2026
GCP_REGION=australia-southeast1
ENVIRONMENT=staging
GCS_BUCKET_NAME=dcmco-website-staging
SENDGRID_API_KEY=SG.your-actual-api-key
```

### 3. Update main.ts (1 min)

Add FunctionsStack to `infrastructure/main.ts`:

```typescript
import { FunctionsStack } from "./stacks";
import { getFunctionsStackConfig } from "./config";

// ... existing code ...

const functionsConfig = getFunctionsStackConfig(envConfig);

// ... after StorageStack ...
new FunctionsStack(app, "dcmco-website-functions", functionsConfig);
```

### 4. Deploy (1 min)

```bash
# Generate provider bindings (first time only)
pnpm run get

# Deploy
pnpm run deploy
```

When prompted, type `yes`.

### 5. Get Function URL

Look for the output:

```
Outputs:

dcmco-website-functions:
  contact-form-url = "https://australia-southeast1-dcmco-prod-2026.cloudfunctions.net/..."
```

**Copy this URL** - you'll use it in your Next.js frontend.

## Test It

```bash
FUNCTION_URL="<your-function-url>"

curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "message": "Testing my deployed function!"
  }'
```

**Expected response:**
```json
{"success": true, "message": "Thank you for your message..."}
```

Check your email inbox!

## Next Steps

1. **Update Next.js frontend** with function URL:
   ```bash
   # In .env.local
   NEXT_PUBLIC_CONTACT_FORM_URL=<your-function-url>
   ```

2. **Test from frontend:**
   - Start Next.js: `pnpm dev`
   - Submit contact form
   - Verify email delivery

3. **Configure production:**
   - Set custom CORS origins
   - Update environment to `production`
   - Redeploy

## Troubleshooting

### Build fails

```bash
# Check function directory
ls -la functions/contact-form/

# Reinstall dependencies
cd functions/contact-form
npm install
cd ../..
```

### Deployment fails

```bash
# Check configuration
cd infrastructure
pnpm run verify

# Check .env file
cat .env
```

### Function returns "Origin not allowed"

Add your origin to `.env`:
```bash
ALLOWED_ORIGINS=http://localhost:3000,https://dcmco-staging.web.app
```

Redeploy:
```bash
cd infrastructure
pnpm run deploy
```

### SendGrid "403 Forbidden"

1. Verify your sender email in SendGrid
2. Wait a few minutes
3. Redeploy

## Full Documentation

For detailed information, see:
- [FUNCTIONS_DEPLOYMENT.md](docs/FUNCTIONS_DEPLOYMENT.md) - Complete deployment guide
- [TESTING.md](../functions/contact-form/TESTING.md) - Function testing guide
- [README.md](README.md) - Infrastructure overview
