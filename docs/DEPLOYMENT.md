# Deployment Procedures & Rollback Guide

This document provides comprehensive procedures for managing deployments, handling failures, and performing rollbacks.

## Table of Contents

- [Manual Rollback Procedures](#manual-rollback-procedures)
- [Emergency Stop Deployment](#emergency-stop-deployment)
- [Automated Rollback (Future)](#automated-rollback-future)
- [Debugging Failed Deployments](#debugging-failed-deployments)
- [Common Failure Patterns](#common-failure-patterns)
- [Health Checks & Verification](#health-checks--verification)

---

## Manual Rollback Procedures

### Overview

A rollback restores your website to a previous working version when a deployment fails or introduces critical issues. This section covers step-by-step manual rollback procedures.

**When to rollback:**
- Deployment introduced critical bugs
- Website is inaccessible after deployment
- Build succeeded but runtime errors occur
- User-reported issues after deployment

**Timing expectations:**
- Identification: ~2-5 minutes
- Download previous version: ~1-2 minutes
- Upload and verification: ~2-3 minutes
- **Total time: ~5-10 minutes**

---

### Step 1: Identify the Last Good Deployment

#### Option A: Via GitHub Actions UI

1. **Navigate to Actions tab:**
   ```
   https://github.com/shanefitzgerald/DCMCO-WEBSITE/actions
   ```

2. **Find the last successful deployment:**
   - Look for green checkmarks (✓)
   - Note the workflow run number
   - Click on the successful run
   - Note the commit SHA (first 7 characters)

   **Example:**
   ```
   ✓ Deploy to Staging #42
   Triggered by @shanefitzgerald
   Commit: abc1234
   Completed: 2026-01-10 10:30:00 UTC
   ```

3. **Verify the deployment was working:**
   - Check the "Deployment Summary" section
   - Note the deployment timestamp
   - Verify the website URL from that deployment

#### Option B: Via GitHub CLI

```bash
# List recent successful deployments
gh run list \
  --workflow=deploy-staging.yml \
  --status=success \
  --limit=5 \
  --json conclusion,databaseId,headSha,startedAt,displayTitle

# Example output:
# [
#   {
#     "conclusion": "success",
#     "databaseId": 20875509100,
#     "headSha": "abc123def456...",
#     "startedAt": "2026-01-10T10:30:00Z",
#     "displayTitle": "feat: add homepage section"
#   }
# ]

# Get commit SHA from a specific run
gh run view 20875509100 --json headSha --jq '.headSha'
```

#### Option C: Via GCS Bucket (if versioning enabled)

```bash
# List recent versions of index.html
gsutil ls -a gs://dcmco-website-staging-2026/index.html

# Example output:
# gs://dcmco-website-staging-2026/index.html#1704884400000000
# gs://dcmco-website-staging-2026/index.html#1704880800000000
# gs://dcmco-website-staging-2026/index.html#1704877200000000
```

---

### Step 2: Download the Previous Version

#### Option A: From Git Commit

```bash
# Navigate to your repository
cd /path/to/dcmco-website

# Create a temporary directory for the rollback
mkdir -p /tmp/rollback-$(date +%Y%m%d-%H%M%S)
cd /tmp/rollback-*

# Clone the repository at the specific commit
git clone https://github.com/shanefitzgerald/DCMCO-WEBSITE.git .
git checkout abc1234  # Replace with the good commit SHA

# Authenticate with GCP Artifact Registry
cp .npmrc.example .npmrc
npx google-artifactregistry-auth --repo-config=.npmrc --credential-config=.npmrc

# Install dependencies
pnpm install --frozen-lockfile

# Build the site
pnpm run build

# Verify the build succeeded
ls -la out/
```

**Expected output:**
```
out/
├── 404.html
├── _next/
│   └── static/
├── index.html
└── ... (other static files)
```

#### Option B: From GCS Bucket Version (if versioning enabled)

```bash
# Download a specific version from GCS
# Note: Requires bucket versioning to be enabled

# List versions with metadata
gsutil ls -aL gs://dcmco-website-staging-2026/

# Download entire bucket version to local directory
mkdir -p /tmp/rollback-download
gsutil -m rsync -r -d \
  gs://dcmco-website-staging-2026/ \
  /tmp/rollback-download/

# Or download specific version (if generation number known)
gsutil cp \
  gs://dcmco-website-staging-2026/index.html#1704884400000000 \
  /tmp/rollback-download/index.html
```

---

### Step 3: Re-upload the Previous Version

#### Staging Environment Rollback

```bash
# Authenticate to GCP (if not already authenticated)
gcloud auth login
gcloud config set project dcmco-prod-2026

# Upload the rollback version
cd /tmp/rollback-*/out  # Or /tmp/rollback-download

# Perform the upload with rsync (overwrites current files)
gsutil -m rsync -r -d . gs://dcmco-website-staging-2026/

# Expected output:
# Building synchronization state...
# Starting synchronization...
# Copying file://./index.html [Content-Type=text/html]...
# Copying file://./_next/static/... [Content-Type=application/javascript]...
# ...
# Operation completed over X objects/Y MB
```

**Important flags:**
- `-m`: Parallel upload (faster)
- `-r`: Recursive (all files and folders)
- `-d`: Delete files in destination that don't exist in source

#### Production Environment Rollback

**⚠️ PRODUCTION ROLLBACK REQUIRES EXTRA CARE**

```bash
# 1. Create a backup of current production first
mkdir -p /tmp/production-backup-$(date +%Y%m%d-%H%M%S)
gsutil -m rsync -r \
  gs://dcmco-website-production-2026/ \
  /tmp/production-backup-*/

# 2. Verify you have the correct rollback version
ls -la /tmp/rollback-*/out/index.html
cat /tmp/rollback-*/out/index.html | head -20

# 3. Upload the rollback version
gsutil -m rsync -r -d \
  /tmp/rollback-*/out/ \
  gs://dcmco-website-production-2026/

# 4. Verify the upload completed
gsutil ls -lh gs://dcmco-website-production-2026/
```

---

### Step 4: Restore Cache Headers

After uploading, you need to restore the cache-control headers:

```bash
# Set cache headers for different file types
BUCKET="gs://dcmco-website-staging-2026"  # Or production bucket

# HTML files - Always revalidate
gsutil -m setmeta -h "Cache-Control:public, max-age=0, must-revalidate" \
  "${BUCKET}/**/*.html"

# Next.js hashed static assets - Cache forever
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
  "${BUCKET}/_next/static/**"

# Images - Cache for 30 days
gsutil -m setmeta -h "Cache-Control:public, max-age=2592000" \
  "${BUCKET}/**/*.png" \
  "${BUCKET}/**/*.jpg" \
  "${BUCKET}/**/*.jpeg" \
  "${BUCKET}/**/*.svg" \
  "${BUCKET}/**/*.webp"

# Fonts - Cache for 1 year
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
  "${BUCKET}/**/*.woff" \
  "${BUCKET}/**/*.woff2"

# CSS/JS (non-hashed) - Cache for 1 hour
gsutil -m setmeta -h "Cache-Control:public, max-age=3600" \
  "${BUCKET}/**/*.css" \
  "${BUCKET}/**/*.js"
```

---

### Step 5: Verify the Rollback

#### Quick Verification

```bash
# Test if the website is accessible
curl -f -s -o /dev/null https://storage.googleapis.com/dcmco-website-staging-2026/index.html
echo $?  # Should output 0 for success

# View the index page
curl https://storage.googleapis.com/dcmco-website-staging-2026/index.html | head -50
```

#### Thorough Verification

1. **Browser test:**
   - Open: `https://storage.googleapis.com/dcmco-website-staging-2026/index.html`
   - Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
   - Verify page loads correctly
   - Check browser console for errors
   - Test critical user flows

2. **Check specific files:**
   ```bash
   # Verify Next.js chunks loaded
   curl -I https://storage.googleapis.com/dcmco-website-staging-2026/_next/static/chunks/main.js

   # Should return 200 OK
   ```

3. **Compare file counts:**
   ```bash
   # Count files in bucket
   gsutil ls -r gs://dcmco-website-staging-2026/** | wc -l

   # Compare with expected count from good deployment
   ```

4. **Check cache headers:**
   ```bash
   # Verify immutable assets have correct headers
   gcloud storage objects describe \
     "gs://dcmco-website-staging-2026/_next/static/chunks/main.js" \
     --format="value(cacheControl)"

   # Should output: public, max-age=31536000, immutable
   ```

---

### Step 6: Invalidate CDN Cache (if applicable)

If you're using Cloud CDN:

```bash
# Invalidate all paths
gcloud compute url-maps invalidate-cdn-cache dcmco-website-cdn \
  --path "/*" \
  --async

# Check invalidation status
gcloud compute operations list \
  --filter="operationType:invalidateCache" \
  --limit=1
```

**Expected time for CDN invalidation:** 5-15 minutes

---

### Risk Assessment: Manual Rollback

| Risk Level | Scenario | Mitigation |
|------------|----------|------------|
| **Low** | Staging rollback during business hours | Full backup exists, can re-deploy anytime |
| **Medium** | Staging rollback during off-hours | Limited monitoring, may delay issue detection |
| **High** | Production rollback during business hours | User-facing, create backup first, notify team |
| **Critical** | Production rollback during peak traffic | Coordinate with team, plan rollback window, have backup ready |

**Best practices:**
- ✅ Always create a backup before rollback
- ✅ Test staging rollback procedure first
- ✅ Document the reason for rollback
- ✅ Create a post-mortem issue
- ✅ Fix the issue before re-deploying

---

## Emergency Stop Deployment

### Scenario 1: Cancel a Running Workflow

#### Via GitHub UI

1. Navigate to: `https://github.com/shanefitzgerald/DCMCO-WEBSITE/actions`
2. Click on the running workflow (orange dot)
3. Click the "Cancel workflow" button (top right)
4. Confirm cancellation

**Timing:** Cancellation is immediate, cleanup may take 10-30 seconds

#### Via GitHub CLI

```bash
# List running workflows
gh run list --workflow=deploy-staging.yml --status=in_progress

# Cancel a specific run
gh run cancel 20875509100

# Cancel all running workflows for a workflow file
gh run list --workflow=deploy-staging.yml --status=in_progress --json databaseId --jq '.[].databaseId' | \
  xargs -I {} gh run cancel {}
```

**Example output:**
```
✓ Cancelled run 'Deploy to Staging #42'
```

---

### Scenario 2: Prevent Auto-Deployments Temporarily

#### Option A: Disable Workflow File (Recommended)

1. **Via GitHub UI:**
   - Go to: `Actions` tab
   - Click on workflow name (e.g., "Deploy to Staging")
   - Click "..." (three dots) → "Disable workflow"

2. **Via GitHub CLI:**
   ```bash
   # Disable staging deployments
   gh workflow disable deploy-staging.yml

   # Verify it's disabled
   gh workflow view deploy-staging.yml

   # Re-enable when ready
   gh workflow enable deploy-staging.yml
   ```

**Effect:**
- Workflow will not run on push events
- Manual triggers still work (if using `workflow_dispatch`)
- Can be re-enabled anytime

**Timing:** Immediate effect

#### Option B: Add Workflow Skip Condition

Create a repository variable to control deployments:

```bash
# Create a deployment gate variable
gh variable set DEPLOYMENTS_ENABLED --body "false"

# Re-enable deployments
gh variable set DEPLOYMENTS_ENABLED --body "true"
```

Then modify your workflow to check this variable:

```yaml
jobs:
  deploy:
    if: ${{ vars.DEPLOYMENTS_ENABLED != 'false' }}
    runs-on: ubuntu-latest
    # ... rest of job
```

**Effect:**
- Workflow runs but skips deployment steps
- Provides more granular control
- Can gate specific environments

---

### Scenario 3: Emergency Production Freeze

**When to use:**
- Critical bug discovered in production
- Security vulnerability detected
- Major incident in progress

**Steps:**

```bash
# 1. Disable production workflow
gh workflow disable deploy-production.yml

# 2. Create an incident issue
gh issue create \
  --title "🚨 PRODUCTION FREEZE - [Reason]" \
  --body "Production deployments frozen due to: [reason]

  **Actions taken:**
  - Disabled production workflow
  - Investigating issue

  **Next steps:**
  1. [ ] Identify root cause
  2. [ ] Test fix in staging
  3. [ ] Document incident
  4. [ ] Re-enable deployments

  **Timeline:**
  - Freeze initiated: $(date)
  - Expected resolution: TBD
  " \
  --label "incident,production,critical"

# 3. Notify team (if Slack configured)
# Post to #incidents channel manually

# 4. When resolved, re-enable
gh workflow enable deploy-production.yml

# 5. Close the incident issue
gh issue close <issue-number> --comment "Production freeze lifted. Root cause: [explanation]"
```

---

## Automated Rollback (Future)

### Design Proposal

**Trigger conditions for automatic rollback:**

1. **Health Check Failure:**
   - HTTP endpoint returns non-200 status
   - Critical API endpoint fails
   - Homepage load time > 5 seconds

2. **Error Rate Threshold:**
   - JavaScript errors reported > 10% of sessions
   - 404 errors spike above baseline
   - Lighthouse score drops below threshold

3. **Availability Threshold:**
   - Website inaccessible for > 2 minutes
   - CDN reports 50x errors
   - Load balancer health check fails

### Implementation Approach

```yaml
# Future workflow addition
jobs:
  deploy:
    # ... existing deployment steps

  health-check:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - name: Wait for propagation
        run: sleep 60

      - name: Health check
        id: health
        run: |
          # Check homepage loads
          STATUS=$(curl -s -o /dev/null -w '%{http_code}' ${{ env.WEBSITE_URL }})

          if [ "$STATUS" != "200" ]; then
            echo "Health check failed: HTTP $STATUS"
            echo "healthy=false" >> $GITHUB_OUTPUT
            exit 1
          fi

          # Check critical assets load
          curl -f ${{ env.WEBSITE_URL }}/_next/static/chunks/main.js

          echo "healthy=true" >> $GITHUB_OUTPUT

      - name: Trigger rollback on failure
        if: failure() && steps.health.outputs.healthy == 'false'
        uses: actions/github-script@v7
        with:
          script: |
            // Trigger rollback workflow
            await github.rest.actions.createWorkflowDispatch({
              owner: context.repo.owner,
              repo: context.repo.repo,
              workflow_id: 'rollback.yml',
              ref: 'main',
              inputs: {
                environment: 'staging',
                reason: 'health-check-failure'
              }
            });
```

### Rollback Workflow (rollback.yml)

```yaml
name: Rollback Deployment

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to rollback'
        required: true
        type: choice
        options:
          - staging
          - production
      reason:
        description: 'Reason for rollback'
        required: true
        type: string

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}

    steps:
      - name: Find last successful deployment
        id: find-last-good
        uses: actions/github-script@v7
        with:
          script: |
            const runs = await github.rest.actions.listWorkflowRuns({
              owner: context.repo.owner,
              repo: context.repo.repo,
              workflow_id: 'deploy-${{ inputs.environment }}.yml',
              status: 'success',
              per_page: 10
            });

            // Find the second-most-recent (current is most recent but failed)
            const lastGood = runs.data.workflow_runs[1];
            console.log('Last good deployment:', lastGood.head_sha);
            core.setOutput('sha', lastGood.head_sha);
            core.setOutput('run_id', lastGood.id);

      - name: Checkout last good version
        uses: actions/checkout@v4
        with:
          ref: ${{ steps.find-last-good.outputs.sha }}

      # ... build and deploy steps (reuse from deploy workflow)

      - name: Create rollback issue
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '🔄 Automatic Rollback: ${{ inputs.environment }}',
              body: `Automated rollback performed.

              **Details:**
              - Environment: ${{ inputs.environment }}
              - Reason: ${{ inputs.reason }}
              - Rolled back to: ${{ steps.find-last-good.outputs.sha }}
              - Previous deployment: ${{ steps.find-last-good.outputs.run_id }}

              **Next steps:**
              1. Investigate the failed deployment
              2. Fix the issue
              3. Test in staging
              4. Re-deploy when ready`,
              labels: ['rollback', 'automated', '${{ inputs.environment }}']
            });
```

---

## Debugging Failed Deployments

### Step 1: Access Workflow Logs

#### Via GitHub UI

1. Navigate to: `https://github.com/shanefitzgerald/DCMCO-WEBSITE/actions`
2. Click on the failed workflow run (red X)
3. Click on the "deploy" job
4. Expand failed steps to view logs
5. Use the search box to filter logs

**Tip:** Click the "..." menu → "View raw logs" for full output

#### Via GitHub CLI

```bash
# View logs for a specific run
gh run view 20875509100 --log

# View logs for a specific job
gh run view 20875509100 --job=59984142757 --log

# Save logs to file
gh run view 20875509100 --log > deployment-failure.log

# Search logs for errors
gh run view 20875509100 --log | grep -i "error"

# View only failed steps
gh run view 20875509100 --log | grep -A 20 "##\[error\]"
```

---

### Step 2: Download Artifacts

If your workflow uploads artifacts (logs, build output):

```bash
# List artifacts for a run
gh run view 20875509100 --json artifacts

# Download all artifacts
gh run download 20875509100

# Download specific artifact
gh run download 20875509100 --name build-logs
```

---

### Step 3: Reproduce Locally

```bash
# Clone and checkout the failing commit
git clone https://github.com/shanefitzgerald/DCMCO-WEBSITE.git
cd DCMCO-WEBSITE
git checkout <failing-commit-sha>

# Follow the exact workflow steps
pnpm install --frozen-lockfile

# Check for errors during install
echo $?  # Non-zero indicates failure

# Try building
pnpm run build

# Check infrastructure
cd infrastructure
pnpm install --frozen-lockfile
pnpm run get
pnpm run synth
```

---

## Common Failure Patterns

### 1. CDKTF Synth Failure

**Symptoms:**
```
ERROR: synthesis failed, run "cdktf get" to generate providers in imports
```

**Cause:** Provider bindings not generated

**Fix:**
```bash
cd infrastructure
pnpm run get
pnpm run synth
```

**Prevention:** This is cached in the workflow; cache key might be invalidated

---

### 2. Authentication Failures

**Symptoms:**
```
401 Unauthorized: Request had invalid authentication credentials
```

**Causes:**
- GCP authentication expired
- Artifact Registry token expired
- Missing workload identity binding

**Fix:**
```bash
# Re-authenticate locally
gcloud auth login
gcloud auth application-default login

# For Artifact Registry
npx google-artifactregistry-auth --repo-config=.npmrc --credential-config=.npmrc
```

**Workflow fix:** Workload Identity Federation handles this; check the service account has correct roles

---

### 3. Build Out of Memory

**Symptoms:**
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Cause:** Next.js build requires more memory

**Fix in workflow:**
```yaml
- name: Build Next.js site
  run: NODE_OPTIONS="--max-old-space-size=4096" pnpm run build
```

---

### 4. Dependency Installation Timeout

**Symptoms:**
```
ERR_PNPM_FETCH_TIMEOUT: Request to ... timed out
```

**Cause:** Network issues or registry unavailable

**Fix:**
```bash
# Retry with increased timeout
pnpm install --network-timeout=300000
```

---

### 5. GCS Bucket Permission Denied

**Symptoms:**
```
AccessDeniedException: 403 Caller does not have storage.objects.create permission
```

**Cause:** Service account missing IAM roles

**Fix:**
```bash
# Grant required permissions
gcloud storage buckets add-iam-policy-binding \
  gs://dcmco-website-staging-2026 \
  --member="serviceAccount:github-actions@dcmco-prod-2026.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

---

### 6. Terraform State Lock

**Symptoms:**
```
Error: Error acquiring the state lock
Lock Info:
  ID: <uuid>
  Path: dcmco-terraform-state/terraform/state/staging/dcmco-website-storage/default.tflock
```

**Cause:** Previous deployment didn't release lock (crashed)

**Fix:**
```bash
# DANGER: Only do this if you're sure no deployment is running

# Option 1: Wait for lock to expire (usually 20 minutes)

# Option 2: Force unlock (use with caution)
cd infrastructure
export TF_INPUT=false
terraform force-unlock <lock-id>
```

---

## Health Checks & Verification

### Pre-Deployment Checks

```bash
# Run these before deployment
pnpm run lint        # Code quality
pnpm run build       # Build succeeds
pnpm run type-check  # TypeScript types valid
```

### Post-Deployment Verification Script

Create `scripts/verify-deployment.sh`:

```bash
#!/bin/bash
set -e

ENVIRONMENT=${1:-staging}
BUCKET="dcmco-website-${ENVIRONMENT}-2026"

echo "🔍 Verifying deployment to ${ENVIRONMENT}..."

# 1. Check bucket exists
echo "Checking bucket exists..."
gsutil ls "gs://${BUCKET}" > /dev/null

# 2. Check index.html exists and is accessible
echo "Checking index.html..."
STATUS=$(curl -s -o /dev/null -w '%{http_code}' \
  "https://storage.googleapis.com/${BUCKET}/index.html")

if [ "$STATUS" != "200" ]; then
  echo "❌ Index.html returned HTTP $STATUS"
  exit 1
fi

# 3. Check critical assets
echo "Checking static assets..."
curl -f "https://storage.googleapis.com/${BUCKET}/_next/static/chunks/main.js" > /dev/null

# 4. Check file count
echo "Checking file count..."
FILE_COUNT=$(gsutil ls -r "gs://${BUCKET}/**" | grep -v ':$' | wc -l)
echo "Files deployed: $FILE_COUNT"

if [ "$FILE_COUNT" -lt 10 ]; then
  echo "⚠️  Warning: Low file count. Expected > 10 files"
fi

# 5. Verify cache headers
echo "Checking cache headers..."
CACHE_HEADER=$(gcloud storage objects describe \
  "gs://${BUCKET}/_next/static/chunks/main.js" \
  --format="value(cacheControl)")

if [[ "$CACHE_HEADER" != *"immutable"* ]]; then
  echo "⚠️  Warning: Static assets missing immutable cache header"
fi

echo "✅ Deployment verification complete!"
```

Usage:
```bash
chmod +x scripts/verify-deployment.sh
./scripts/verify-deployment.sh staging
./scripts/verify-deployment.sh production
```

---

## Contact & Escalation

### For Help

1. **GitHub Issues:**
   - Create issue: `https://github.com/shanefitzgerald/DCMCO-WEBSITE/issues/new`
   - Tag: `deployment`, `help-wanted`

2. **Check Documentation:**
   - [Main README](../README.md)
   - [Performance Guide](../.github/PERFORMANCE.md)

3. **Review Workflow Runs:**
   - [Staging Deployments](https://github.com/shanefitzgerald/DCMCO-WEBSITE/actions/workflows/deploy-staging.yml)
   - [Production Deployments](https://github.com/shanefitzgerald/DCMCO-WEBSITE/actions/workflows/deploy-production.yml)

### Escalation Path

**Level 1 - Minor Issues (Self-Service):**
- Failed staging deployment
- Cache header issues
- Build errors

**Action:** Follow this guide, create issue for tracking

**Level 2 - Major Issues (Team Notification):**
- Production deployment failure
- Rollback required
- Data loss risk

**Action:** Create incident issue, notify team via Slack

**Level 3 - Critical Issues (Immediate Response):**
- Production down
- Security vulnerability
- Data breach

**Action:** Production freeze, page on-call engineer, create incident report

---

## Appendix: Quick Reference Commands

### Rollback Checklist

```bash
# 1. Find last good commit
gh run list --workflow=deploy-staging.yml --status=success --limit=5

# 2. Checkout and build
git checkout <good-commit-sha>
pnpm install && pnpm run build

# 3. Upload
gsutil -m rsync -r -d out/ gs://dcmco-website-staging-2026/

# 4. Set cache headers (use script above)

# 5. Verify
curl -f https://storage.googleapis.com/dcmco-website-staging-2026/index.html
```

### Emergency Stop

```bash
# Cancel running workflow
gh run cancel <run-id>

# Disable workflow
gh workflow disable deploy-production.yml

# Create incident issue
gh issue create --title "🚨 PRODUCTION FREEZE" --label "incident,critical"
```

### Debug Workflow

```bash
# View logs
gh run view <run-id> --log | grep -i error

# Download artifacts
gh run download <run-id>

# Reproduce locally
git checkout <failing-commit> && pnpm install && pnpm run build
```

---

**Document version:** 1.0.0
**Last updated:** 2026-01-10
**Maintained by:** DevOps Team
