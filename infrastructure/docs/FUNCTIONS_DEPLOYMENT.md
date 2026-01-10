# Cloud Functions Deployment Guide

Complete guide for deploying the contact form Cloud Function using CDKTF.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Architecture Overview](#architecture-overview)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Build Process](#build-process)
- [Deployment](#deployment)
- [Managing Secrets](#managing-secrets)
- [Testing](#testing)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Cost Estimation](#cost-estimation)

---

## Prerequisites

### Required Tools

- **Node.js 20+** - Runtime for Cloud Functions and infrastructure
- **pnpm** - Package manager
- **Google Cloud SDK (gcloud)** - For authentication and manual operations
- **SendGrid Account** - For email delivery

### Required Permissions

Your GCP service account needs these IAM roles:

- `roles/cloudfunctions.admin` - Create/update Cloud Functions
- `roles/storage.admin` - Create buckets and upload function source
- `roles/secretmanager.admin` - Manage SendGrid API key secret
- `roles/iam.serviceAccountUser` - Allow function to use service accounts

### SendGrid Setup

1. **Create SendGrid Account**
   - Sign up at [SendGrid](https://signup.sendgrid.com/)
   - Free tier: 100 emails/day

2. **Verify Sender Email**
   - Go to [Sender Authentication](https://app.sendgrid.com/settings/sender_auth)
   - Add and verify your FROM email address (e.g., `shanesrf@gmail.com`)
   - For production: Verify your custom domain

3. **Create API Key**
   - Go to [API Keys](https://app.sendgrid.com/settings/api_keys)
   - Create new key with "Mail Send" permissions
   - Copy the key (starts with `SG.`)
   - **Save it securely** - you won't see it again!

---

## Architecture Overview

### Resources Created

```
Cloud Functions Stack
├── GCS Bucket (function source code)
│   ├── Versioning enabled
│   └── Lifecycle: Keep last 3 versions
├── Secret Manager Secret (SendGrid API key)
│   └── Secret version (latest)
├── Cloud Function Gen 2 (contact-form)
│   ├── Runtime: nodejs20
│   ├── Memory: 256MB (configurable)
│   ├── Timeout: 60s (configurable)
│   ├── Min instances: 0 (scale to zero)
│   └── Max instances: 10 (rate limiting)
└── IAM Bindings
    ├── Public invoker (allUsers)
    └── Secret accessor (function service account)
```

### Function Behavior

1. Receives POST request from Next.js frontend
2. Validates CORS origin
3. Validates form data (name, email, message)
4. Checks for spam (honeypot, suspicious emails)
5. Retrieves SendGrid API key from Secret Manager
6. Sends email via SendGrid API
7. Returns success/error response

---

## Quick Start

### 1. Build the Function

```bash
# From project root
bash infrastructure/scripts/build-function.sh
```

This creates `infrastructure/function-source.zip` containing:
- Compiled JavaScript (`dist/`)
- Dependencies (`node_modules/`)
- `package.json`

### 2. Configure Environment

```bash
cd infrastructure
cp .env.example .env
```

Edit `.env` and set:

```bash
# GCP Configuration
GCP_PROJECT_ID=dcmco-prod-2026
GCP_REGION=australia-southeast1
ENVIRONMENT=staging

# SendGrid Configuration
SENDGRID_API_KEY=SG.your-actual-api-key-here
EMAIL_RECIPIENT=shanesrf@gmail.com
FROM_EMAIL=shanesrf@gmail.com

# CORS Origins (optional - uses environment defaults if not set)
ALLOWED_ORIGINS=http://localhost:3000,https://dcmco-staging.web.app
```

### 3. Update main.ts to Include Functions Stack

```typescript
// infrastructure/main.ts
import { App } from "cdktf";
import { StorageStack, FunctionsStack } from "./stacks";
import {
  loadEnvironmentConfig,
  getStorageStackConfig,
  getFunctionsStackConfig,
  printConfigSummary,
  ConfigurationError
} from "./config";

const app = new App();

let config, storageConfig, functionsConfig;
try {
  config = loadEnvironmentConfig();
  printConfigSummary(config);
  storageConfig = getStorageStackConfig(config);
  functionsConfig = getFunctionsStackConfig(config);
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error(`\n❌ Configuration Error:\n${error.message}\n`);
    process.exit(1);
  }
  throw error;
}

// Create stacks
new StorageStack(app, "dcmco-website-storage", storageConfig);
new FunctionsStack(app, "dcmco-website-functions", functionsConfig);

app.synth();
```

### 4. Deploy

```bash
cd infrastructure

# Install dependencies and generate provider bindings
pnpm install
pnpm run get

# Validate configuration
pnpm run verify

# Plan deployment (see what will be created)
pnpm run plan

# Deploy to GCP
pnpm run deploy
```

When prompted, type `yes` to confirm.

### 5. Get Function URL

After deployment, the function URL is output:

```
Outputs:

dcmco-website-functions:
  contact-form-url = "https://australia-southeast1-dcmco-prod-2026.cloudfunctions.net/dcmco-website-staging-contact-form"
```

---

## Configuration

### Environment Variables

#### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `GCP_PROJECT_ID` | GCP project ID | `dcmco-prod-2026` |
| `GCP_REGION` | GCP region for function | `australia-southeast1` |
| `ENVIRONMENT` | Environment name | `staging` or `production` |
| `SENDGRID_API_KEY` | SendGrid API key | `SG.xyz123...` |

#### Optional (with defaults)

| Variable | Default | Description |
|----------|---------|-------------|
| `EMAIL_RECIPIENT` | `shanesrf@gmail.com` | Contact form recipient |
| `FROM_EMAIL` | Same as `EMAIL_RECIPIENT` | SendGrid sender (must be verified) |
| `ALLOWED_ORIGINS` | Based on environment | Comma-separated CORS origins |
| `FUNCTION_MEMORY_MB` | `256` | Memory allocation (128-8192) |
| `FUNCTION_TIMEOUT_SECONDS` | `60` | Timeout (1-540) |
| `FUNCTION_MAX_INSTANCES` | `10` | Max concurrent instances |
| `FUNCTION_MIN_INSTANCES` | `0` | Min instances (0 = scale to zero) |

### Default Allowed Origins

**Staging:**
```
http://localhost:3000
https://dcmco-staging.web.app
```

**Production:**
```
http://localhost:3000
https://dcmco-prod-2026.web.app
```

**Custom domains:** Override with `ALLOWED_ORIGINS`:
```bash
ALLOWED_ORIGINS=http://localhost:3000,https://dcmco.com.au,https://www.dcmco.com.au
```

---

## Build Process

### Manual Build

```bash
cd functions/contact-form

# Install dependencies
npm install

# Build TypeScript
npm run build

# Create ZIP manually
zip -r ../../infrastructure/function-source.zip \
  dist/ \
  package.json \
  package-lock.json \
  node_modules/
```

### Automated Build Script

```bash
bash infrastructure/scripts/build-function.sh
```

**What it does:**
1. Validates function directory exists
2. Installs production dependencies
3. Compiles TypeScript to `dist/`
4. Creates temporary build directory
5. Copies `dist/`, `package.json`, `node_modules/`
6. Creates ZIP archive
7. Cleans up temp files
8. Shows package contents

**Output:**
```
infrastructure/function-source.zip
```

### What's Included in the ZIP

```
function-source.zip
├── dist/
│   └── index.js          (compiled TypeScript)
├── package.json
├── package-lock.json
└── node_modules/
    ├── @google-cloud/functions-framework/
    ├── @sendgrid/mail/
    ├── joi/
    └── ... (all production dependencies)
```

---

## Deployment

### First-Time Deployment

```bash
# 1. Build function
bash infrastructure/scripts/build-function.sh

# 2. Configure environment
cd infrastructure
cp .env.example .env
# Edit .env with your values

# 3. Generate provider bindings
pnpm run get

# 4. Plan deployment
pnpm run plan

# 5. Deploy
pnpm run deploy
```

### Update Deployment

After making changes to the function code:

```bash
# 1. Rebuild function
bash infrastructure/scripts/build-function.sh

# 2. Deploy changes
cd infrastructure
pnpm run deploy
```

CDKTF will detect the ZIP file change and update the Cloud Function.

### Deployment Strategies

#### Staging Deployment

```bash
# .env
ENVIRONMENT=staging
GCP_REGION=australia-southeast1
ALLOWED_ORIGINS=http://localhost:3000,https://dcmco-staging.web.app
```

```bash
pnpm run deploy
```

#### Production Deployment

```bash
# .env
ENVIRONMENT=production
GCP_REGION=australia-southeast1
ALLOWED_ORIGINS=https://dcmco.com.au,https://www.dcmco.com.au
```

```bash
pnpm run deploy
```

### Blue-Green Deployment

For zero-downtime deployments:

1. Deploy new version to a different function name
2. Test the new function
3. Update frontend to use new URL
4. Delete old function after validation

---

## Managing Secrets

### SendGrid API Key Storage

The SendGrid API key is stored in **Google Secret Manager**, not in environment variables.

### Adding Secret During Deployment

**Option 1: Via CDKTF (from .env)**

```bash
# infrastructure/.env
SENDGRID_API_KEY=SG.your-key-here
```

When you run `pnpm run deploy`, CDKTF creates the secret.

**⚠️ Warning:** This stores the secret in Terraform state. For production, use Option 2.

**Option 2: Manual Secret Creation (Recommended for Production)**

```bash
# Create secret (without value)
cd infrastructure
pnpm run deploy  # Creates secret structure

# Add secret value manually
echo -n "SG.your-key-here" | gcloud secrets versions add \
  dcmco-website-staging-sendgrid-api-key \
  --project=dcmco-prod-2026 \
  --data-file=-
```

### Updating the Secret

```bash
# Add new version
echo -n "SG.new-key-here" | gcloud secrets versions add \
  dcmco-website-staging-sendgrid-api-key \
  --project=dcmco-prod-2026 \
  --data-file=-

# Function automatically uses "latest" version
# No redeployment needed!
```

### Viewing Secret Metadata

```bash
gcloud secrets describe \
  dcmco-website-staging-sendgrid-api-key \
  --project=dcmco-prod-2026
```

### Deleting a Secret

```bash
gcloud secrets delete \
  dcmco-website-staging-sendgrid-api-key \
  --project=dcmco-prod-2026
```

---

## Testing

### Test Deployed Function

```bash
# Get function URL from deployment output
FUNCTION_URL="https://australia-southeast1-dcmco-prod-2026.cloudfunctions.net/dcmco-website-staging-contact-form"

# Test valid submission
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "message": "Testing deployed function"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Thank you for your message. We will get back to you soon!"
}
```

### Test CORS

```bash
# Valid origin
curl -X OPTIONS "$FUNCTION_URL" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Invalid origin (should fail)
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Origin: https://malicious-site.com" \
  -d '{"name":"Hacker","email":"hack@evil.com","message":"Should be rejected"}'
```

### Test Spam Protection

```bash
# Honeypot (returns success but doesn't send email)
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "name": "Bot",
    "email": "bot@spam.com",
    "message": "Spam message",
    "honeypot": "Filled by bot"
  }'

# Suspicious email pattern (rejected)
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "name": "Test",
    "email": "test@test.com",
    "message": "Should be rejected"
  }'
```

### Integration Test from Next.js

```typescript
// In your Next.js app
const response = await fetch(process.env.NEXT_PUBLIC_CONTACT_FORM_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Jane Smith',
    email: 'jane@example.com',
    message: 'Interested in your AI consulting services.',
  }),
});

const result = await response.json();
console.log(result);
```

---

## Monitoring

### View Function Logs

```bash
# Stream logs in real-time
gcloud functions logs read \
  dcmco-website-staging-contact-form \
  --project=dcmco-prod-2026 \
  --region=australia-southeast1 \
  --gen2 \
  --tail

# View recent logs
gcloud functions logs read \
  dcmco-website-staging-contact-form \
  --project=dcmco-prod-2026 \
  --region=australia-southeast1 \
  --gen2 \
  --limit=50
```

### Cloud Console Monitoring

**Function Metrics:**
- Go to [Cloud Functions Console](https://console.cloud.google.com/functions)
- Select your function
- View: Invocations, Execution time, Memory usage, Errors

**SendGrid Activity:**
- Go to [SendGrid Email Activity](https://app.sendgrid.com/email_activity)
- View: Delivered, Bounced, Spam reports

### Set Up Alerts

```bash
# Create alert for function errors
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Contact Form Errors" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=300s
```

---

## Troubleshooting

### Common Issues

#### 1. `function-source.zip not found`

**Error:**
```
Error: ENOENT: no such file or directory, open 'infrastructure/function-source.zip'
```

**Solution:**
```bash
bash infrastructure/scripts/build-function.sh
```

#### 2. `SENDGRID_API_KEY not set`

**Warning during deployment:**
```
⚠️  WARNING: SENDGRID_API_KEY not provided.
```

**Solution:**
Add to `infrastructure/.env`:
```bash
SENDGRID_API_KEY=SG.your-key-here
```

Or add manually after deployment:
```bash
echo -n "SG.your-key-here" | gcloud secrets versions add \
  dcmco-website-staging-sendgrid-api-key \
  --data-file=-
```

#### 3. `Origin not allowed` (CORS error)

**Error response:**
```json
{"success": false, "error": "Origin not allowed"}
```

**Solution:**
Check `ALLOWED_ORIGINS` in `infrastructure/.env`:
```bash
ALLOWED_ORIGINS=http://localhost:3000,https://dcmco-staging.web.app
```

Redeploy after changing origins.

#### 4. SendGrid `403 Forbidden`

**Error in logs:**
```
SendGrid error: Forbidden - could not verify your access
```

**Cause:** FROM email not verified in SendGrid

**Solution:**
1. Go to [SendGrid Sender Authentication](https://app.sendgrid.com/settings/sender_auth)
2. Verify the email address in `FROM_EMAIL`
3. Wait a few minutes for verification to propagate

#### 5. Function Timeout

**Error in logs:**
```
Function execution took 60001 ms, finished with status: 'timeout'
```

**Solution:**
Increase timeout in `infrastructure/.env`:
```bash
FUNCTION_TIMEOUT_SECONDS=120
```

Redeploy.

#### 6. Permission Denied

**Error:**
```
Permission 'cloudfunctions.functions.create' denied
```

**Solution:**
Grant required IAM roles:
```bash
gcloud projects add-iam-policy-binding dcmco-prod-2026 \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT" \
  --role="roles/cloudfunctions.admin"
```

### Debug Mode

Enable verbose logging in the function:

```typescript
// In functions/contact-form/src/index.ts
// Set NODE_ENV=development for verbose logs
console.log('Request body:', req.body);
console.log('CORS origin:', req.headers.origin);
```

Rebuild and redeploy:
```bash
bash infrastructure/scripts/build-function.sh
cd infrastructure && pnpm run deploy
```

---

## Cost Estimation

### Cloud Functions Gen 2 Pricing (australia-southeast1)

**Invocations:**
- Free: 2 million invocations/month
- After: $0.40 per million

**Compute Time (256MB memory):**
- Free: 400,000 GB-seconds/month
- After: $0.0000025 per GB-second

**Network Egress:**
- First 1GB: Free
- After: $0.12 per GB

### Secret Manager Pricing

**Secret Storage:**
- Free: 6 active secret versions
- After: $0.06 per secret version/month

**Secret Access:**
- Free: 10,000 access operations/month
- After: $0.03 per 10,000 operations

### Storage Pricing (function source)

**GCS Storage:**
- $0.023 per GB/month (Regional australia-southeast1)

### Example Cost Calculation

**Assumptions:**
- 1,000 form submissions/month
- Average execution time: 1 second
- Function memory: 256MB
- 1 secret version
- Source code: 10MB

**Monthly Cost:**
- Invocations: 1,000 = **FREE** (< 2M limit)
- Compute: 1,000 × 1s × 0.25GB = 250 GB-seconds = **FREE** (< 400K limit)
- Secret storage: 1 version = **FREE** (< 6 versions)
- Secret access: 1,000 operations = **FREE** (< 10K limit)
- GCS storage: 0.01GB × $0.023 = **$0.0002**

**Total: ~$0.00 per month** (within free tier!)

For production with higher traffic (10,000 submissions/month):
**Total: ~$0.50 per month**

---

## Next Steps

After successful deployment:

1. **Test the function** with curl or Postman
2. **Update Next.js frontend** with function URL
3. **Set up monitoring alerts** for errors
4. **Configure custom domain** (optional)
5. **Enable Cloud Armor** for DDoS protection (production)
6. **Set up CI/CD** for automated deployments

---

## Resources

- [Cloud Functions Gen 2 Documentation](https://cloud.google.com/functions/docs/2nd-gen)
- [CDKTF Google Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [SendGrid API Documentation](https://docs.sendgrid.com/api-reference/mail-send/mail-send)
- [Google Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Cloud Functions Pricing](https://cloud.google.com/functions/pricing)
