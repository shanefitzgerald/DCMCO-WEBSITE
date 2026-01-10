# Deployment Workflow Guide

Complete guide for deploying Cloud Functions and integrating with GitHub Actions.

## Table of Contents

- [Manual Deployment](#manual-deployment)
- [GitHub Actions Integration](#github-actions-integration)
- [Environment Management](#environment-management)
- [Post-Deployment Testing](#post-deployment-testing)
- [Frontend Integration](#frontend-integration)
- [Troubleshooting](#troubleshooting)

---

## Manual Deployment

### Prerequisites

- Infrastructure dependencies installed (`cd infrastructure && pnpm install`)
- Provider bindings generated (`pnpm run get`)
- `.env` configured with required variables
- Function code built and packaged

### Step-by-Step Deployment

#### 1. Build the Function

```bash
# From project root
bash infrastructure/scripts/build-function.sh
```

**What happens:**
- Installs function dependencies
- Compiles TypeScript to JavaScript
- Bundles production dependencies (no devDependencies)
- Creates ZIP archive (~500KB - 2MB depending on dependencies)
- Outputs to: `infrastructure/function-source.zip`

**Time:** 30-60 seconds

#### 2. Configure Environment

```bash
cd infrastructure
cp .env.example .env
```

**Staging configuration:**
```bash
# GCP Configuration
GCP_PROJECT_ID=dcmco-prod-2026
GCP_REGION=australia-southeast1
ENVIRONMENT=staging

# Storage (if not already deployed)
GCS_BUCKET_NAME=dcmco-website-staging

# Cloud Functions
SENDGRID_API_KEY=SG.your-sendgrid-api-key
EMAIL_RECIPIENT=shanesrf@gmail.com
FROM_EMAIL=shanesrf@gmail.com
ALLOWED_ORIGINS=http://localhost:3000,https://dcmco-staging.web.app
```

#### 3. Deploy Infrastructure

```bash
# Generate provider bindings (first time only)
pnpm run get

# Preview changes
pnpm run plan

# Deploy
pnpm run deploy
```

**What happens during deploy:**

1. **Synth Phase** (5-10 seconds):
   - Loads configuration
   - Generates Terraform JSON
   - Validates resources

2. **Plan Phase** (10-20 seconds):
   - Terraform analyzes current state
   - Shows what will be created/updated/deleted

3. **Apply Phase** (2-5 minutes):
   - **GCS Bucket** (function source): Created in ~5 seconds
   - **Secret Manager** (SendGrid key): Created in ~10 seconds
   - **Function Source Upload**: ZIP uploaded to GCS (~5-10 seconds)
   - **Cloud Function**: Created/updated (~60-180 seconds)
     - Docker image built from source
     - Function deployed to region
     - IAM bindings applied
   - **Outputs**: Function URL and metadata

4. **Confirmation**:
   - You'll be prompted to type `yes` to proceed
   - Use `pnpm run deploy:auto` to skip confirmation (CI/CD)

**Total time:** 3-6 minutes

#### 4. Verify Deployment

```bash
# Check outputs
cat cdktf.out/stacks/dcmco-website-functions/outputs.json

# Or use terraform directly
cd cdktf.out/stacks/dcmco-website-functions
terraform output
```

**Example output:**
```json
{
  "contact-form-url": {
    "value": "https://australia-southeast1-dcmco-prod-2026.cloudfunctions.net/dcmco-website-staging-contact-form"
  },
  "contact-form-name": {
    "value": "dcmco-website-staging-contact-form"
  },
  "functions-bucket-name": {
    "value": "dcmco-website-staging-functions"
  },
  "sendgrid-secret-id": {
    "value": "dcmco-website-staging-sendgrid-api-key"
  }
}
```

#### 5. Test Deployed Function

```bash
# Set function URL from output
FUNCTION_URL="https://australia-southeast1-dcmco-prod-2026.cloudfunctions.net/dcmco-website-staging-contact-form"

# Test with curl
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Origin: https://dcmco-staging.web.app" \
  -d '{
    "name": "Test Deployment",
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

**Check SendGrid:**
- Go to https://app.sendgrid.com/email_activity
- Verify email was sent

---

## GitHub Actions Integration

### Strategy

**Recommended approach:** Separate workflows for different concerns

1. **deploy-staging.yml** - Deploys Next.js site to Firebase Hosting (existing)
2. **deploy-production.yml** - Deploys Next.js site to Firebase Hosting (existing)
3. **deploy-functions-staging.yml** - Deploys Cloud Functions to staging (new)
4. **deploy-functions-production.yml** - Deploys Cloud Functions to production (new)

**Why separate?**
- Functions change less frequently than frontend
- Avoid unnecessary function deploys (costly, slow)
- Independent versioning and rollback
- Clear deployment history

### Workflow: Deploy Functions to Staging

Create `.github/workflows/deploy-functions-staging.yml`:

```yaml
name: Deploy Cloud Functions (Staging)

on:
  push:
    branches: [main]
    paths:
      - 'functions/**'
      - 'infrastructure/stacks/functions-stack.ts'
      - 'infrastructure/config.ts'
      - 'infrastructure/.env.example'
  workflow_dispatch:
    inputs:
      force:
        description: 'Force deploy even if no changes detected'
        required: false
        default: 'false'

env:
  NODE_VERSION: '20'
  GCP_PROJECT_ID: 'dcmco-prod-2026'
  GCP_REGION: 'australia-southeast1'
  ENVIRONMENT: 'staging'

jobs:
  deploy-functions:
    runs-on: ubuntu-latest

    permissions:
      contents: read
      id-token: write  # Required for Workload Identity Federation

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      # ================================================================
      # Authenticate with GCP
      # ================================================================

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}

      # ================================================================
      # Build Cloud Function
      # ================================================================

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Build Cloud Function
        run: bash infrastructure/scripts/build-function.sh

      - name: Verify function package
        run: |
          ls -lh infrastructure/function-source.zip
          unzip -l infrastructure/function-source.zip | head -20

      # ================================================================
      # Deploy with CDKTF
      # ================================================================

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install infrastructure dependencies
        working-directory: ./infrastructure
        run: pnpm install

      - name: Generate CDKTF provider bindings
        working-directory: ./infrastructure
        run: pnpm run get

      - name: Create infrastructure .env file
        working-directory: ./infrastructure
        run: |
          cat > .env << EOF
          GCP_PROJECT_ID=${{ env.GCP_PROJECT_ID }}
          GCP_REGION=${{ env.GCP_REGION }}
          ENVIRONMENT=${{ env.ENVIRONMENT }}
          GCS_BUCKET_NAME=dcmco-website-staging
          SENDGRID_API_KEY=${{ secrets.SENDGRID_API_KEY_STAGING }}
          EMAIL_RECIPIENT=shanesrf@gmail.com
          FROM_EMAIL=shanesrf@gmail.com
          ALLOWED_ORIGINS=http://localhost:3000,https://dcmco-staging.web.app
          EOF

      - name: CDKTF Synth
        working-directory: ./infrastructure
        run: pnpm run synth

      - name: CDKTF Deploy
        working-directory: ./infrastructure
        run: pnpm run deploy:auto
        env:
          GOOGLE_CREDENTIALS: ${{ secrets.GCP_SERVICE_ACCOUNT_KEY }}

      # ================================================================
      # Test Deployed Function
      # ================================================================

      - name: Extract function URL
        id: function-url
        working-directory: ./infrastructure
        run: |
          URL=$(cat cdktf.out/stacks/dcmco-website-functions/outputs.json | jq -r '.["contact-form-url"].value')
          echo "url=$URL" >> $GITHUB_OUTPUT
          echo "Function URL: $URL"

      - name: Test function health
        run: |
          RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${{ steps.function-url.outputs.url }}" \
            -H "Content-Type: application/json" \
            -H "Origin: https://dcmco-staging.web.app" \
            -d '{
              "name": "GitHub Actions Test",
              "email": "ci-test@example.com",
              "message": "Automated deployment test from GitHub Actions"
            }')

          STATUS_CODE=$(echo "$RESPONSE" | tail -n1)
          BODY=$(echo "$RESPONSE" | head -n-1)

          echo "Status: $STATUS_CODE"
          echo "Response: $BODY"

          if [ "$STATUS_CODE" -ne 200 ]; then
            echo "❌ Function health check failed"
            exit 1
          fi

          if ! echo "$BODY" | jq -e '.success == true' > /dev/null; then
            echo "❌ Function returned error response"
            exit 1
          fi

          echo "✅ Function health check passed"

      - name: Test CORS
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "${{ steps.function-url.outputs.url }}" \
            -H "Origin: https://dcmco-staging.web.app" \
            -H "Access-Control-Request-Method: POST" \
            -H "Access-Control-Request-Headers: Content-Type")

          echo "CORS preflight status: $STATUS"

          if [ "$STATUS" -ne 204 ] && [ "$STATUS" -ne 200 ]; then
            echo "❌ CORS check failed"
            exit 1
          fi

          echo "✅ CORS check passed"

      # ================================================================
      # Update Repository with Function URL
      # ================================================================

      - name: Save function URL to output
        run: |
          mkdir -p .github/outputs
          echo "${{ steps.function-url.outputs.url }}" > .github/outputs/staging-function-url.txt
          cat .github/outputs/staging-function-url.txt

      - name: Comment on commit with function URL
        if: github.event_name == 'push'
        uses: actions/github-script@v7
        with:
          script: |
            const url = '${{ steps.function-url.outputs.url }}';
            const message = `### ✅ Cloud Functions Deployed (Staging)

            **Function URL:** \`${url}\`

            **Environment:** staging
            **Region:** ${{ env.GCP_REGION }}
            **Commit:** ${context.sha.substring(0, 7)}

            **Tests:**
            - ✅ Function health check passed
            - ✅ CORS configuration verified

            **Next steps:**
            1. Test manually: \`curl -X POST "${url}" -H "Content-Type: application/json" -H "Origin: https://dcmco-staging.web.app" -d '{"name":"Test","email":"test@example.com","message":"Test message"}'\`
            2. Update Next.js environment variables if needed
            3. Verify email delivery in SendGrid
            `;

            github.rest.repos.createCommitComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              commit_sha: context.sha,
              body: message
            });
```

### Workflow: Deploy Functions to Production

Create `.github/workflows/deploy-functions-production.yml`:

```yaml
name: Deploy Cloud Functions (Production)

on:
  release:
    types: [published]
  workflow_dispatch:
    inputs:
      confirm:
        description: 'Type "deploy" to confirm production deployment'
        required: true

env:
  NODE_VERSION: '20'
  GCP_PROJECT_ID: 'dcmco-prod-2026'
  GCP_REGION: 'australia-southeast1'
  ENVIRONMENT: 'production'

jobs:
  # Confirmation step for manual deploys
  validate:
    if: github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - name: Validate confirmation
        run: |
          if [ "${{ github.event.inputs.confirm }}" != "deploy" ]; then
            echo "❌ Deployment cancelled - confirmation required"
            exit 1
          fi
          echo "✅ Deployment confirmed"

  deploy-functions:
    needs: [validate]
    if: always() && (needs.validate.result == 'success' || github.event_name == 'release')
    runs-on: ubuntu-latest

    permissions:
      contents: read
      id-token: write

    steps:
      # Same steps as staging, but with production config:
      # - SENDGRID_API_KEY_PRODUCTION secret
      # - ALLOWED_ORIGINS: https://dcmco-prod-2026.web.app,https://dcmco.com.au
      # - Different bucket/function names
```

### Required GitHub Secrets

Set these in: **Settings → Secrets and variables → Actions**

**Staging:**
- `SENDGRID_API_KEY_STAGING` - SendGrid API key for staging
- `GCP_WORKLOAD_IDENTITY_PROVIDER` - Workload Identity Provider ID
- `GCP_SERVICE_ACCOUNT` - Service account email
- `GCP_SERVICE_ACCOUNT_KEY` - Service account JSON key (fallback)

**Production:**
- `SENDGRID_API_KEY_PRODUCTION` - SendGrid API key for production

**Example values:**
```bash
# Get from GCP
WORKLOAD_IDENTITY_PROVIDER=projects/123456789/locations/global/workloadIdentityPools/github-actions/providers/github
GCP_SERVICE_ACCOUNT=github-actions@dcmco-prod-2026.iam.gserviceaccount.com
```

---

## Environment Management

### Staging vs Production Configuration

**Staging:**
```bash
ENVIRONMENT=staging
ALLOWED_ORIGINS=http://localhost:3000,https://dcmco-staging.web.app
SENDGRID_API_KEY=<staging-key>
EMAIL_RECIPIENT=shanesrf@gmail.com
```

**Production:**
```bash
ENVIRONMENT=production
ALLOWED_ORIGINS=https://dcmco-prod-2026.web.app,https://dcmco.com.au,https://www.dcmco.com.au
SENDGRID_API_KEY=<production-key>
EMAIL_RECIPIENT=shanesrf@gmail.com  # Same or different
```

### Secret Management

**Option 1: Same SendGrid Account, Different API Keys (Recommended)**
- Create separate API keys in SendGrid for staging/production
- Track usage separately
- Revoke staging key without affecting production

**Option 2: Different SendGrid Accounts**
- Separate billing
- Isolated quotas
- More complex management

**Setting secrets:**
```bash
# Using gcloud (manual secret creation)
echo -n "SG.staging-key" | gcloud secrets create \
  dcmco-website-staging-sendgrid-api-key \
  --data-file=- \
  --project=dcmco-prod-2026

# Verify
gcloud secrets versions access latest \
  --secret=dcmco-website-staging-sendgrid-api-key \
  --project=dcmco-prod-2026
```

---

## Post-Deployment Testing

### Automated Smoke Tests

Create `infrastructure/scripts/test-deployed-function.sh`:

```bash
#!/bin/bash

set -e

FUNCTION_URL=$1
ORIGIN=${2:-"https://dcmco-staging.web.app"}

if [ -z "$FUNCTION_URL" ]; then
  echo "Usage: bash test-deployed-function.sh <function-url> [origin]"
  exit 1
fi

echo "Testing deployed function: $FUNCTION_URL"
echo "Origin: $ORIGIN"
echo ""

# Test 1: Health check
echo "Test 1: Health check (valid submission)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Origin: $ORIGIN" \
  -d '{
    "name": "Deployment Test",
    "email": "deploy-test@example.com",
    "message": "Automated deployment verification test"
  }')

STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$STATUS" != "200" ]; then
  echo "❌ FAILED: Expected 200, got $STATUS"
  echo "Response: $BODY"
  exit 1
fi

if ! echo "$BODY" | jq -e '.success == true' > /dev/null 2>&1; then
  echo "❌ FAILED: Response did not indicate success"
  echo "Response: $BODY"
  exit 1
fi

echo "✅ PASSED: Health check successful"
echo ""

# Test 2: CORS check
echo "Test 2: CORS preflight"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$FUNCTION_URL" \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type")

if [ "$STATUS" != "204" ] && [ "$STATUS" != "200" ]; then
  echo "❌ FAILED: CORS preflight returned $STATUS"
  exit 1
fi

echo "✅ PASSED: CORS configured correctly"
echo ""

# Test 3: Validation
echo "Test 3: Validation (invalid email)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Origin: $ORIGIN" \
  -d '{
    "name": "Test",
    "email": "not-an-email",
    "message": "Test message"
  }')

STATUS=$(echo "$RESPONSE" | tail -n1)

if [ "$STATUS" != "400" ]; then
  echo "❌ FAILED: Expected 400 for invalid email, got $STATUS"
  exit 1
fi

echo "✅ PASSED: Validation working"
echo ""

echo "========================================="
echo "✅ All tests passed!"
echo "========================================="
```

**Usage:**
```bash
bash infrastructure/scripts/test-deployed-function.sh \
  "https://australia-southeast1-dcmco-prod-2026.cloudfunctions.net/dcmco-website-staging-contact-form" \
  "https://dcmco-staging.web.app"
```

---

## Frontend Integration

### Strategy: Environment Variables

**Step 1: Get function URL from CDKTF output**

After deployment, extract URL:
```bash
cd infrastructure
URL=$(cat cdktf.out/stacks/dcmco-website-functions/outputs.json | jq -r '.["contact-form-url"].value')
echo "NEXT_PUBLIC_CONTACT_FORM_URL=$URL"
```

**Step 2: Set in Next.js environment**

**Local development (.env.local):**
```bash
# Use local function
NEXT_PUBLIC_CONTACT_FORM_URL=http://localhost:8080
```

**Staging (Firebase Hosting environment config):**
```bash
# Set via firebase.json
firebase functions:config:set \
  next.public_contact_form_url="https://australia-southeast1-dcmco-prod-2026.cloudfunctions.net/dcmco-website-staging-contact-form"
```

**Or hardcode in build** (simpler for static sites):

```typescript
// lib/config.ts
export const CONTACT_FORM_URL =
  process.env.NEXT_PUBLIC_CONTACT_FORM_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://australia-southeast1-dcmco-prod-2026.cloudfunctions.net/dcmco-website-production-contact-form'
    : 'http://localhost:8080');
```

**Step 3: Update GitHub Actions**

In `.github/workflows/deploy-staging.yml`, add after function deployment:

```yaml
- name: Set function URL in Firebase config
  run: |
    FUNCTION_URL="<from-cdktf-output>"

    # Update .env for Next.js build
    echo "NEXT_PUBLIC_CONTACT_FORM_URL=$FUNCTION_URL" >> .env.production

    # Build Next.js with new URL
    pnpm build
```

**Step 4: Use in Next.js**

```typescript
// components/ContactForm.tsx
import { CONTACT_FORM_URL } from '@/lib/config';

const handleSubmit = async (data: ContactFormData) => {
  const response = await fetch(CONTACT_FORM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to submit form');
  }

  return response.json();
};
```

---

## Troubleshooting

### Deployment Fails

**Error: "function source not found"**
```bash
# Rebuild function
bash infrastructure/scripts/build-function.sh

# Verify ZIP exists
ls -lh infrastructure/function-source.zip
```

**Error: "SendGrid API key invalid"**
```bash
# Test key locally
curl -X "POST" "https://api.sendgrid.com/v3/mail/send" \
  -H "Authorization: Bearer SG.your-key" \
  -H "Content-Type: application/json" \
  -d '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"from@example.com"},"subject":"Test","content":[{"type":"text/plain","value":"Test"}]}'

# Update secret in GCP
echo -n "SG.new-key" | gcloud secrets versions add \
  dcmco-website-staging-sendgrid-api-key \
  --data-file=-
```

### Function Returns 500

**Check logs:**
```bash
gcloud functions logs read \
  dcmco-website-staging-contact-form \
  --region=australia-southeast1 \
  --limit=50
```

### CORS Errors

**Verify allowed origins:**
```bash
# Check function environment variables
gcloud functions describe dcmco-website-staging-contact-form \
  --region=australia-southeast1 \
  --format="value(serviceConfig.environmentVariables)"
```

**Update origins:**
```bash
# Edit infrastructure/.env
ALLOWED_ORIGINS=https://new-origin.com,https://dcmco-staging.web.app

# Redeploy
cd infrastructure
pnpm run deploy
```

---

## Summary

**Manual Deployment:**
1. Build function: `bash infrastructure/scripts/build-function.sh`
2. Configure `.env`
3. Deploy: `cd infrastructure && pnpm run deploy`
4. Test: `bash infrastructure/scripts/test-deployed-function.sh <url>`

**GitHub Actions:**
- Separate workflows for staging/production
- Trigger on function code changes
- Automated testing after deployment
- Function URL saved to outputs

**Environment Management:**
- Different SendGrid keys per environment
- Different CORS origins
- Same recipient email (or different if needed)
- Secrets managed in GCP Secret Manager + GitHub Secrets

**Frontend Integration:**
- Function URL from CDKTF outputs
- Set as Next.js environment variable
- Hardcode per environment or read from config
- Update during build in GitHub Actions
