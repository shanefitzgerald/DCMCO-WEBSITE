# Enterprise CDKTF Workflows Setup Guide

This document provides step-by-step instructions for setting up the enterprise-grade CDKTF deployment workflows.

## Overview

Three workflows have been created following 2026 best practices:

1. **PR Diff Workflow** - Shows infrastructure changes in pull requests
2. **Staging Deployment** - Auto-deploys to staging on merge to main
3. **Production Deployment** - Manual deployment with approval gates

## Key Features

- ✅ Workload Identity Federation (OIDC) - No service account keys
- ✅ Least-privilege GitHub token permissions
- ✅ Action version pinning with commit SHAs
- ✅ Manual provider generation (post-Dec 2025)
- ✅ GCS remote state backend
- ✅ Comprehensive caching (pnpm + .gen/)
- ✅ Environment approval gates for production

## Prerequisites

- GCP Project: `dcmco-prod-2026`
- GitHub repository with workflows enabled
- Admin access to both GCP and GitHub

## Setup Steps

### 1. Configure Workload Identity Federation in GCP

Workload Identity Federation allows GitHub Actions to authenticate to GCP without storing long-lived credentials.

```bash
# Set your project
export PROJECT_ID="dcmco-prod-2026"
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
export REPO_OWNER="your-github-org"
export REPO_NAME="dcmco-marketing-site"

# Create Workload Identity Pool
gcloud iam workload-identity-pools create github-actions \
  --project=$PROJECT_ID \
  --location=global \
  --display-name="GitHub Actions Pool" \
  --description="Identity pool for GitHub Actions workflows"

# Create OIDC Provider
gcloud iam workload-identity-pools providers create-oidc github-oidc \
  --project=$PROJECT_ID \
  --location=global \
  --workload-identity-pool=github-actions \
  --display-name="GitHub OIDC Provider" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --allowed-audiences="https://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions/providers/github-oidc" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner=='$REPO_OWNER'"

echo "✅ Workload Identity Pool created"
echo "Provider name: projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions/providers/github-oidc"
```

### 2. Create Service Account with Least-Privilege Permissions

```bash
# Create service account
gcloud iam service-accounts create github-actions \
  --project=$PROJECT_ID \
  --display-name="GitHub Actions Service Account" \
  --description="Service account for GitHub Actions CDKTF deployments"

export SA_EMAIL="github-actions@$PROJECT_ID.iam.gserviceaccount.com"

# Grant necessary permissions
# Storage Admin - for GCS buckets
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/storage.admin"

# Cloud Functions Developer - for Cloud Functions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/cloudfunctions.developer"

# Secret Manager Admin - for secrets
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/secretmanager.admin"

# Service Account User - to deploy as service accounts
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/iam.serviceAccountUser"

# Allow GitHub to impersonate this service account
gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL \
  --project=$PROJECT_ID \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions/attribute.repository/$REPO_OWNER/$REPO_NAME"

echo "✅ Service account created and configured"
echo "Service account: $SA_EMAIL"
```

### 3. Configure GCS Backend for Terraform State

```bash
# Create bucket for Terraform state
gsutil mb -p $PROJECT_ID -l australia-southeast1 gs://$PROJECT_ID-tfstate

# Enable versioning for disaster recovery
gsutil versioning set on gs://$PROJECT_ID-tfstate

# Restrict access
gsutil iam ch serviceAccount:$SA_EMAIL:objectAdmin gs://$PROJECT_ID-tfstate

echo "✅ State bucket created: gs://$PROJECT_ID-tfstate"
```

### 4. Update Infrastructure Code for Remote State

Create or update `infrastructure/backend.tf`:

```typescript
// Add to your main.ts or create a separate backend configuration
import { GcsBackend } from 'cdktf';

// In your stack or main file:
new GcsBackend(this, {
  bucket: 'dcmco-prod-2026-tfstate',
  prefix: 'terraform/state'
});
```

### 5. Configure GitHub Environments

#### Create Staging Environment

1. Go to your GitHub repository
2. Navigate to **Settings** > **Environments**
3. Click **New environment**
4. Name: `staging`
5. **Do not** add any protection rules
6. Click **Configure environment**

#### Create Production Environment

1. Click **New environment**
2. Name: `production`
3. Enable **Required reviewers**
   - Add team members who can approve production deployments
   - Recommended: At least 2 reviewers
4. Optional: Enable **Wait timer** (5 minutes recommended)
5. Click **Configure environment**

### 6. Add GitHub Secrets

Navigate to **Settings** > **Secrets and variables** > **Actions**

Click **New repository secret** for each:

| Secret Name | Value | Description |
|------------|-------|-------------|
| `SENDGRID_API_KEY_STAGING` | `SG.xxx...` | SendGrid API key for staging |
| `SENDGRID_API_KEY_PRODUCTION` | `SG.xxx...` | SendGrid API key for production |

**Note**: The workflows use Workload Identity Federation, so no `GCP_SA_KEY` is needed.

### 7. Update Workflow Variables

Edit each workflow file to update these environment variables:

#### File: `.github/workflows/cdktf-pr-diff.yml`

```yaml
env:
  GCP_PROJECT_ID: dcmco-prod-2026  # ← Update
  GCP_REGION: australia-southeast1
  WORKLOAD_IDENTITY_PROVIDER: 'projects/123456789/locations/global/workloadIdentityPools/github-actions/providers/github-oidc'  # ← Update with your PROJECT_NUMBER
  SERVICE_ACCOUNT: 'github-actions@dcmco-prod-2026.iam.gserviceaccount.com'
```

#### File: `.github/workflows/cdktf-deploy-staging.yml`

Same updates as above.

#### File: `.github/workflows/cdktf-deploy-production.yml`

Same updates as above.

**To get your PROJECT_NUMBER:**
```bash
gcloud projects describe dcmco-prod-2026 --format="value(projectNumber)"
```

**Your WORKLOAD_IDENTITY_PROVIDER should be:**
```
projects/YOUR_PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions/providers/github-oidc
```

### 8. Remove Old Prebuilt Provider

The workflows handle provider generation automatically, but update your local environment:

```bash
cd infrastructure

# Remove old prebuilt provider
pnpm remove @cdktf/provider-google

# Verify package.json no longer lists it
grep "@cdktf/provider-google" package.json
# (Should return nothing)

# Generate bindings locally
pnpm run get

# Verify TypeScript compilation
pnpm run typecheck
```

### 9. Test the Workflows

#### Test PR Diff Workflow

1. Create a feature branch
2. Make a change to infrastructure (e.g., add a comment)
3. Push and create a pull request
4. Check that the workflow runs and posts a diff comment

```bash
git checkout -b test/cdktf-workflow
# Make a small change to infrastructure/main.ts
git add infrastructure/
git commit -m "test: trigger CDKTF diff workflow"
git push -u origin test/cdktf-workflow
# Create PR on GitHub
```

Expected result: PR comment showing infrastructure changes (or "no changes")

#### Test Staging Deployment

1. Merge your test PR to main
2. Check GitHub Actions for the staging deployment workflow
3. Verify it completes successfully
4. Check GCP to confirm resources are deployed

Expected result: Staging environment updated automatically

#### Test Production Deployment

1. Go to **Actions** > **Deploy Infrastructure - Production**
2. Click **Run workflow**
3. Fill in:
   - Confirm: `DEPLOY TO PRODUCTION`
   - Reason: `Testing production deployment workflow`
4. Click **Run workflow**
5. Approve the deployment when prompted
6. Verify successful deployment

Expected result: Production deployment succeeds with approval gate

## Workflow Details

### PR Diff Workflow

**Trigger**: Pull requests modifying `infrastructure/`

**What it does**:
1. Authenticates via Workload Identity Federation
2. Installs dependencies and generates provider bindings
3. Runs `cdktf diff` to detect changes
4. Posts diff as PR comment
5. Uploads diff artifact

**Caching**:
- pnpm store
- `.gen/` provider bindings

### Staging Deployment

**Trigger**: Push to `main` branch

**What it does**:
1. Authenticates via Workload Identity Federation
2. Generates provider bindings (with cache)
3. Creates/updates secrets in Secret Manager
4. Runs `cdktf deploy --auto-approve`
5. Verifies deployment
6. Uploads artifacts (30-day retention)

**Environment**: `staging` (no approval)

### Production Deployment

**Trigger**: Manual workflow dispatch only

**What it does**:
1. Validates confirmation phrase and reason
2. Waits for GitHub Environment approval
3. Authenticates via Workload Identity Federation
4. Shows deployment plan
5. Deploys with `cdktf deploy --auto-approve`
6. Creates deployment record
7. Uploads artifacts (365-day retention)

**Environment**: `production` (requires approval)

## Security Considerations

### Why Workload Identity Federation?

**Old way (insecure):**
```yaml
- uses: google-github-actions/auth@v2
  with:
    credentials_json: ${{ secrets.GCP_SA_KEY }}  # ❌ Long-lived key
```

**New way (secure):**
```yaml
- uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: ${{ env.WORKLOAD_IDENTITY_PROVIDER }}  # ✅ OIDC
    service_account: ${{ env.SERVICE_ACCOUNT }}
```

**Benefits**:
- No long-lived credentials stored in GitHub
- Automatic credential rotation
- Audit trail via GCP logs
- Scoped to specific repository

### Why Pin Action Versions to SHAs?

**Vulnerable:**
```yaml
uses: actions/checkout@v4  # ❌ Mutable tag
```

**Secure:**
```yaml
uses: actions/checkout@692973e3d937129bcbf40652eb9f2f61becf3332  # ✅ Immutable SHA (v4.1.7)
```

**Protection against**:
- Tag hijacking
- Supply chain attacks
- Malicious updates to existing versions

### Least-Privilege Permissions

```yaml
permissions:
  id-token: write  # Only for OIDC auth
  contents: read   # Only for checkout
```

Prevents:
- Workflow from modifying code
- Workflow from accessing other secrets
- Privilege escalation attacks

## Troubleshooting

### Workflow fails with "authentication error"

**Problem**: Workload Identity Federation not configured correctly

**Solution**:
1. Verify PROJECT_NUMBER is correct in workflow
2. Check service account has Workload Identity User role:
```bash
gcloud iam service-accounts get-iam-policy github-actions@dcmco-prod-2026.iam.gserviceaccount.com
```
3. Verify repository owner matches in attribute condition

### Provider generation is slow in workflows

**Normal**: First run takes 2-3 minutes to generate bindings

**If persistent**: Check cache is working:
- Verify `actions/cache@v4` step succeeds
- Cache key: `${{ runner.os }}-cdktf-gen-${{ hashFiles(...) }}`
- Cache should restore on subsequent runs

### Production deployment doesn't wait for approval

**Problem**: GitHub Environment not configured

**Solution**:
1. Go to Settings > Environments > production
2. Enable "Required reviewers"
3. Add reviewers
4. Save

### State conflicts / lock errors

**Problem**: Multiple deployments running simultaneously

**Solution**:
- Staging/Production use different concurrency groups
- Wait for one deployment to complete
- If stuck, manually unlock:
```bash
cd infrastructure
terraform force-unlock <LOCK_ID>
```

## Maintenance

### Updating Action Versions

When updating to newer action versions:

1. Find the latest release
2. Get the full commit SHA
3. Update workflow with SHA and comment with version:

```yaml
uses: actions/checkout@<NEW_SHA>  # v4.2.0
```

### Updating CDKTF Version

1. Update in `package.json`
2. Update in workflows:
```yaml
env:
  CDKTF_VERSION: '0.21.0'  # Update
```
3. Regenerate provider bindings:
```bash
pnpm run get
```
4. Test locally before merging

### Monitoring Deployments

- **GitHub Actions**: Repository > Actions tab
- **GCP Logs**: Cloud Logging for function execution
- **State**: GCS bucket `dcmco-prod-2026-tfstate`
- **Artifacts**: Retained 30 days (staging), 365 days (production)

## Next Steps

1. ✅ Complete all setup steps above
2. ✅ Test each workflow
3. ✅ Document deployment procedures for your team
4. ✅ Set up monitoring and alerting
5. ✅ Schedule regular security audits

## Additional Resources

- [Workload Identity Federation Guide](https://cloud.google.com/iam/docs/workload-identity-federation)
- [GitHub Actions Security Hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [CDKTF Documentation](https://developer.hashicorp.com/terraform/cdktf)
- [Infrastructure README](infrastructure/README.md)

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review workflow logs in GitHub Actions
3. Check GCP Cloud Logging for GCP-side errors
4. Verify all environment variables are set correctly
