# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automated deployment of the DCMCO website to Firebase Hosting and Google Cloud Platform.

## Overview

The deployment pipeline uses a multi-environment strategy:
- **Preview**: Temporary preview channels for pull requests (Firebase Hosting)
- **Staging**: Automatic deployment to staging environment (Firebase Hosting)
- **Production**: Manual deployment to production environment (Firebase Hosting)
- **Cloud Functions**: Serverless backend for contact form (Google Cloud Functions)

## Table of Contents

- [Workflows](#workflows)
- [Required GitHub Secrets](#required-github-secrets)
- [Workflow Usage](#workflow-usage)
- [Monitoring Deployments](#monitoring-deployments)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Workflows

### 1. Deploy Preview (`deploy-preview.yml`)

**Purpose:** Create temporary preview deployments for pull requests.

**Triggers:**
- Pull request opened
- Pull request synchronized (new commits)
- Pull request reopened

**What it does:**
1. Checks out code and sets up Node.js with pnpm
2. Authenticates to GCP for Artifact Registry access
3. Installs dependencies and builds Next.js site
4. Deploys to Firebase Hosting preview channel (7-day expiry)
5. Posts PR comment with preview URL and testing checklist

**Deployment flow:**
```
PR opened/updated → Install deps → Build site → Deploy to preview channel → Comment on PR
```

**Features:**
- Automatic deployment on PR events
- Temporary preview URLs (expires in 7 days)
- PR comments with direct preview links
- Testing checklist for reviewers

---

### 2. Deploy to Staging (`deploy-staging.yml`)

**Purpose:** Automatically deploy the website to the staging environment.

**Triggers:**
- Push to `main` branch (automatic)
- Manual trigger via `workflow_dispatch`

**What it does:**
1. Checks out code and sets up Node.js with pnpm
2. Authenticates to GCP using Workload Identity Federation
3. Installs dependencies and builds Next.js site
4. Deploys to Firebase Hosting staging channel
5. Verifies deployment and runs smoke tests
6. Posts deployment summary to commit

**Deployment flow:**
```
Push to main → Install deps → Build site → Deploy to Firebase staging → Verify → Comment
```

**Environment:**
- **Firebase Channel:** `staging`
- **URL:** `https://dcmco-staging.web.app`

---

### 3. Deploy to Production (`deploy-production.yml`)

**Purpose:** Deploy the website to production with manual control and safety checks.

**Triggers:**
- Manual only via `workflow_dispatch`
- Requires typing "deploy" to confirm

**What it does:**
1. Validates deployment confirmation
2. Checks out code and sets up Node.js with pnpm
3. Authenticates to GCP using Workload Identity Federation
4. Installs dependencies and builds Next.js site
5. Deploys to Firebase Hosting live channel
6. Verifies deployment and runs smoke tests
7. Posts deployment summary to commit

**Deployment flow:**
```
Manual trigger + confirm → Install deps → Build site → Deploy to Firebase live → Verify → Comment
```

**Environment:**
- **Firebase Channel:** `live` (production)
- **URLs:**
  - `https://dcmco-prod-2026.web.app`
  - `https://dcmco.com.au` (when custom domain configured)
  - `https://www.dcmco.com.au`

**Safety features:**
- Manual trigger only (no automatic deployments)
- Confirmation step (must type "deploy")
- GitHub environment protection (can require approvals)

---

### 4. Deploy Cloud Functions - Staging (`deploy-functions-staging.yml`)

**Purpose:** Deploy Cloud Functions to staging environment for testing.

**Triggers:**
- Manual only via `workflow_dispatch`
- Optional "force" input to force deploy

**What it does:**
1. Checks out code and sets up Node.js with pnpm
2. Authenticates to GCP using Workload Identity Federation
3. Builds Cloud Function package (contact form handler)
4. Installs infrastructure dependencies (CDKTF)
5. Generates CDKTF provider bindings
6. Creates environment configuration
7. Synthesizes and deploys infrastructure via CDKTF
8. Extracts function URL from outputs
9. Runs comprehensive smoke tests (10 tests)
10. Posts deployment info to commit with testing instructions

**Deployment flow:**
```
Manual trigger → Build function → Install CDKTF → Deploy infra → Test function → Comment
```

**Environment:**
- **Function Name:** `dcmco-website-staging-contact-form`
- **Region:** `australia-southeast1`
- **Allowed Origins:** `http://localhost:3000`, `https://dcmco-staging.web.app`

**Tests run:**
- Function health check (valid submission)
- CORS preflight and validation
- Request validation (invalid email, missing fields)
- Spam protection (honeypot, suspicious emails)
- CORS origin rejection
- Method validation (GET rejection)
- Minimal submission test
- Response latency check

---

### 5. Deploy Cloud Functions - Production (`deploy-functions-production.yml`)

**Purpose:** Deploy Cloud Functions to production with manual control.

**Triggers:**
- Manual only via `workflow_dispatch`
- **Required confirmation:** Must type "deploy" to proceed

**What it does:**
1. Validates deployment confirmation
2. Checks out code and sets up Node.js with pnpm
3. Authenticates to GCP using Workload Identity Federation
4. Builds Cloud Function package
5. Installs infrastructure dependencies (CDKTF)
6. Generates CDKTF provider bindings
7. Creates environment configuration
8. Synthesizes and deploys infrastructure via CDKTF
9. Extracts function URL from outputs
10. Runs comprehensive smoke tests (10 tests)
11. Posts deployment info to commit with monitoring instructions

**Deployment flow:**
```
Manual trigger + confirm → Build function → Install CDKTF → Deploy infra → Test function → Comment
```

**Environment:**
- **Function Name:** `dcmco-website-production-contact-form`
- **Region:** `australia-southeast1`
- **Allowed Origins:**
  - `https://dcmco-prod-2026.web.app`
  - `https://dcmco.com.au`
  - `https://www.dcmco.com.au`

**Safety features:**
- Manual trigger only
- Confirmation step (must type "deploy")
- Production-specific configuration
- Post-deployment verification tests

---

## Required GitHub Secrets

Configure these secrets in your repository (Settings → Secrets and variables → Actions):

### Authentication Secrets

| Secret Name | Description | Example | Required For |
|------------|-------------|---------|--------------|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | WIF provider resource name | `projects/123/locations/global/workloadIdentityPools/pool/providers/provider` | All workflows |
| `GCP_SERVICE_ACCOUNT` | Service account email | `github-actions@project.iam.gserviceaccount.com` | All workflows |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON key | `{"type":"service_account",...}` | Website deployments |

### Cloud Functions Secrets

| Secret Name | Description | Example | Required For |
|------------|-------------|---------|--------------|
| `SENDGRID_API_KEY_STAGING` | SendGrid API key for staging | `SG.xxxxx` | Functions staging |
| `SENDGRID_API_KEY_PRODUCTION` | SendGrid API key for production | `SG.xxxxx` | Functions production |

### Notes

- All workflows use **Workload Identity Federation** (no static service account keys)
- Firebase service account is only used for Firebase Hosting CLI operations
- SendGrid API keys are stored in GCP Secret Manager after deployment

---

## Workflow Usage

### Deploying Website Preview (Pull Requests)

**Automatic deployment:**
1. Create a pull request
2. Preview automatically deploys
3. Check PR comments for preview URL
4. Test the preview site
5. Preview expires in 7 days

**What gets deployed:**
- Temporary Firebase Hosting preview channel
- Unique URL per PR (e.g., `pr123-abcd1234.web.app`)
- Automatically cleaned up after 7 days

---

### Deploying Website to Staging

**Automatic deployment:**
```bash
# Just push to main
git push origin main
```

**Manual deployment:**
1. Go to Actions → Deploy to Staging
2. Click "Run workflow"
3. Select branch (usually `main`)
4. Click "Run workflow"

**What gets deployed:**
- Firebase Hosting staging channel
- URL: `https://dcmco-staging.web.app`
- Latest code from `main` branch

---

### Deploying Website to Production

**Manual deployment only:**
1. Go to Actions → Deploy to Production
2. Click "Run workflow"
3. Type `deploy` in the confirmation field
4. Click "Run workflow"
5. If environment protection is enabled, approve the deployment

**What gets deployed:**
- Firebase Hosting live channel
- URLs: `https://dcmco-prod-2026.web.app`, `https://dcmco.com.au`
- Latest code from selected branch (usually `main`)

---

### Deploying Cloud Functions to Staging

**Manual deployment:**
1. Go to Actions → Deploy Cloud Functions (Staging)
2. Click "Run workflow"
3. Select branch (usually `main`)
4. Optionally check "force" to force deploy
5. Click "Run workflow"

**What gets deployed:**
- Cloud Function for contact form (staging)
- GCS bucket for function source code
- Secret Manager secret for SendGrid API key
- Function URL posted in commit comment

**After deployment:**
- Check commit comment for function URL
- Run manual tests using provided curl commands
- Monitor function logs in GCP console

---

### Deploying Cloud Functions to Production

**Manual deployment with confirmation:**
1. Go to Actions → Deploy Cloud Functions (Production)
2. Click "Run workflow"
3. Select branch (usually `main`)
4. **Type `deploy` in the confirmation field**
5. Click "Run workflow"

**What gets deployed:**
- Cloud Function for contact form (production)
- Production-specific configuration
- Production SendGrid API key
- Production CORS origins

**After deployment:**
- Update Next.js environment variable with function URL
- Test from production frontend
- Verify email delivery in SendGrid
- Monitor function logs

---

## Monitoring Deployments

### During Deployment

Watch the workflow run in the Actions tab:
- Each step shows real-time logs
- Failed steps are highlighted in red
- You can cancel running workflows if needed

### After Website Deployment

Check the deployment summary:
- **Staging:** `https://dcmco-staging.web.app`
- **Production:** `https://dcmco-prod-2026.web.app` or `https://dcmco.com.au`
- **Preview:** Check PR comment for unique URL

### After Function Deployment

Check the commit comment for:
- Function URL
- Manual testing commands
- Monitoring commands
- Next steps

**Monitor function logs:**
```bash
# Staging
gcloud functions logs read dcmco-website-staging-contact-form \
  --region=australia-southeast1 --limit=50

# Production
gcloud functions logs read dcmco-website-production-contact-form \
  --region=australia-southeast1 --limit=50
```

**Test deployed function:**
```bash
# Example curl command (see commit comment for exact URL)
curl -X POST "https://australia-southeast1-dcmco-prod-2026.cloudfunctions.net/..." \
  -H "Content-Type: application/json" \
  -H "Origin: https://dcmco-staging.web.app" \
  -d '{"name":"Test","email":"test@example.com","message":"Test message"}'
```

---

## Troubleshooting

### Authentication Failed

**Error:** "Failed to generate access token" or "Invalid service account"

**Solution:**
1. Verify WIF is set up correctly in GCP
2. Check `GCP_WORKLOAD_IDENTITY_PROVIDER` secret matches exactly
3. Verify `GCP_SERVICE_ACCOUNT` email is correct
4. Ensure service account has required IAM roles:
   - `roles/cloudfunctions.admin`
   - `roles/iam.serviceAccountUser`
   - `roles/storage.admin`
   - `roles/secretmanager.admin`

### CDKTF Deploy Failed

**Error:** "cdktf deploy failed" or "synthesis failed"

**Solutions:**
1. Check infrastructure logs for specific errors
2. Verify GCP project ID is correct
3. Ensure required GCP APIs are enabled:
   - Cloud Functions API
   - Cloud Storage API
   - Secret Manager API
   - Cloud Resource Manager API
4. Check service account has necessary permissions
5. Verify CDKTF provider bindings were generated (`pnpm run get`)

### Build Failed

**Error:** Next.js build errors

**Solutions:**
1. Test build locally: `pnpm run build`
2. Check for TypeScript errors: `pnpm run typecheck`
3. Verify dependencies install correctly
4. Review build logs for specific errors
5. Check Node.js version matches workflow (v20)

### Firebase Deploy Failed

**Error:** Firebase Hosting deployment errors

**Solutions:**
1. Verify Firebase project ID is correct (`dcmco-prod-2026`)
2. Check `FIREBASE_SERVICE_ACCOUNT` secret is valid JSON
3. Ensure Firebase Hosting is enabled in Firebase console
4. Verify `firebase.json` configuration is correct
5. Check that build output exists in `out/` directory

### Function Tests Failed

**Error:** Post-deployment tests failing

**Solutions:**
1. Check function logs for runtime errors
2. Verify SendGrid API key is valid
3. Check CORS origins are configured correctly
4. Ensure function has public invoker permissions
5. Wait 30-60 seconds after deployment for function to be ready
6. Review test script output for specific failure

### Website Not Accessible

**Issue:** 404 or blank page errors

**Solutions:**
1. Verify build completed successfully
2. Check that `index.html` exists in `out/` directory
3. Verify Firebase Hosting configuration in `firebase.json`
4. Check deployment logs for upload errors
5. Clear browser cache and try again
6. Check Firebase Hosting dashboard for deployment status

---

## Best Practices

### General

1. **Always test in preview/staging first** before deploying to production
2. **Monitor workflow runs** for failures or warnings
3. **Review deployment summaries** to verify correct configuration
4. **Keep secrets up to date** when rotating credentials
5. **Use semantic versioning** or tags for production releases

### Website Deployments

1. **Preview everything:** Use PR previews to test changes before merging
2. **Staging validation:** Push to main triggers staging deployment automatically
3. **Production caution:** Production deploys require manual confirmation
4. **Build verification:** Always check build logs for errors or warnings
5. **Post-deployment testing:** Verify the deployed site works correctly

### Cloud Functions Deployments

1. **Local testing first:** Test functions locally before deploying
2. **Staging validation:** Deploy to staging and run tests
3. **Production caution:** Requires manual confirmation for safety
4. **Monitor logs:** Check function logs after deployment
5. **Email verification:** Verify emails are delivered via SendGrid
6. **Update frontend:** Update environment variables with new function URL

### Security

- ✅ Uses Workload Identity Federation (no service account keys)
- ✅ Secrets are never logged or exposed
- ✅ Minimum required permissions on service account
- ✅ Production requires manual approval
- ✅ All deployments are audited in GitHub Actions logs
- ✅ Functions use Secret Manager for sensitive data

---

## Environment Summary

| Environment | Website URL | Function Suffix | Auto Deploy | Confirmation |
|------------|-------------|-----------------|-------------|--------------|
| **Preview** | `pr###-*****.web.app` | N/A | ✅ On PR | ❌ No |
| **Staging** | `dcmco-staging.web.app` | `-staging-` | ✅ On push to main | ❌ No |
| **Production** | `dcmco.com.au` | `-production-` | ❌ Manual only | ✅ Yes |

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review workflow logs in the Actions tab
3. Verify all secrets are configured correctly
4. Check GCP console for infrastructure issues
5. Review Firebase Hosting dashboard
6. Check function logs in GCP Console
7. Review infrastructure code in `/infrastructure`

---

## Related Documentation

- [Infrastructure README](../../infrastructure/README.md) - CDKTF infrastructure setup
- [Functions Deployment](../../infrastructure/docs/DEPLOYMENT_WORKFLOW.md) - Cloud Functions deployment guide
- [Functions Local Dev](../../functions/contact-form/LOCAL_DEV.md) - Local function development
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting) - Firebase Hosting documentation
- [Cloud Functions Docs](https://cloud.google.com/functions/docs) - Google Cloud Functions documentation
