# Firebase Hosting + GitHub Actions Setup Guide

This guide explains how to set up automated Firebase Hosting deployments using GitHub Actions.

## Overview

We have two workflows:
1. **deploy-firebase-staging.yml** - Deploys to production on push to `main`
2. **deploy-firebase-preview.yml** - Creates preview deployments for Pull Requests

---

## Setup Instructions

### Step 1: Generate Firebase Service Account

You have **two options** for authentication:

#### Option A: Automatic Setup (Recommended)

```bash
# Run in your project directory
firebase init hosting:github

# This interactive command will:
# 1. Link your GitHub repository
# 2. Create a service account automatically
# 3. Add FIREBASE_SERVICE_ACCOUNT secret to GitHub
# 4. Generate workflow files (which we've already created)
```

**Follow the prompts:**
- Select your Firebase project: `dcmco-prod-2026`
- GitHub repository: `shanefitzgerald/DCMCO-WEBSITE`
- Set up automatic deployment? `Yes`
- Set up a workflow for pull requests? `Yes`
- Overwrite existing workflows? `No` (we have custom workflows)

#### Option B: Manual Setup

```bash
# 1. Create a service account
gcloud iam service-accounts create firebase-deployer \
    --display-name="Firebase Deployer for GitHub Actions" \
    --project=dcmco-prod-2026

# 2. Grant Firebase permissions
gcloud projects add-iam-policy-binding dcmco-prod-2026 \
    --member="serviceAccount:firebase-deployer@dcmco-prod-2026.iam.gserviceaccount.com" \
    --role="roles/firebase.admin"

gcloud projects add-iam-policy-binding dcmco-prod-2026 \
    --member="serviceAccount:firebase-deployer@dcmco-prod-2026.iam.gserviceaccount.com" \
    --role="roles/firebasehosting.admin"

# 3. Create and download the key
gcloud iam service-accounts keys create firebase-service-account.json \
    --iam-account=firebase-deployer@dcmco-prod-2026.iam.gserviceaccount.com

# 4. Copy the JSON content
cat firebase-service-account.json

# 5. Add to GitHub Secrets (see next step)
# IMPORTANT: Delete the local key file after adding to GitHub
rm firebase-service-account.json
```

---

### Step 2: Add GitHub Secrets

Go to: **Settings → Secrets and variables → Actions → Secrets**

Add the following secret:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `FIREBASE_SERVICE_ACCOUNT` | Entire JSON content from step 1 | Service account key for Firebase deployment |

**Example JSON structure:**
```json
{
  "type": "service_account",
  "project_id": "dcmco-prod-2026",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-deployer@dcmco-prod-2026.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

---

### Step 3: Existing Secrets (Already Configured)

Your workflows also need these existing secrets for npm package authentication:

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT`

These should already be configured from your current GCS deployment setup.

---

## Workflow Details

### Staging Deployment Workflow

**File:** `.github/workflows/deploy-firebase-staging.yml`

**Triggers:**
- Push to `main` branch (automatic)
- Manual trigger via workflow_dispatch

**Steps:**
1. Checkout code
2. Setup Node.js and pnpm with caching
3. Authenticate to GCP (for npm packages)
4. Install dependencies
5. Build Next.js site
6. Deploy to Firebase Hosting (live channel)
7. Generate deployment summary

**Deployment URL:** `https://dcmco-prod-2026.web.app`

---

### Preview Deployment Workflow

**File:** `.github/workflows/deploy-firebase-preview.yml`

**Triggers:**
- Pull request opened, synchronized, or reopened

**Steps:**
1. Checkout code
2. Setup Node.js and pnpm
3. Authenticate to GCP (for npm packages)
4. Install dependencies
5. Build Next.js site
6. Deploy to Firebase Hosting preview channel
7. Comment on PR with preview URL

**Preview URL:** Dynamically generated (e.g., `https://dcmco-prod-2026--pr-123-abc123.web.app`)

**Preview Features:**
- Unique URL for each PR
- Automatically expires after 7 days
- Comment posted on PR with preview link
- No impact on production

---

## How Deployments Work

### Staging (Production) Deployment

```mermaid
graph LR
    A[Push to main] --> B[Build Next.js]
    B --> C[Deploy to Firebase]
    C --> D[Live at dcmco-prod-2026.web.app]
```

**Process:**
1. Developer pushes to `main` branch
2. GitHub Actions triggers workflow
3. Next.js site is built
4. Built files deployed to Firebase Hosting (live channel)
5. Site immediately available at production URL
6. Deployment summary posted to workflow run

### Preview Deployment

```mermaid
graph LR
    A[Open PR] --> B[Build Next.js]
    B --> C[Deploy to Preview]
    C --> D[Unique preview URL]
    D --> E[Comment on PR]
```

**Process:**
1. Developer opens a Pull Request
2. GitHub Actions triggers preview workflow
3. Next.js site is built
4. Deployed to unique preview channel
5. Preview URL posted as PR comment
6. Preview expires in 7 days

---

## Comparison: Firebase vs GCS

| Feature | GCS (Old) | Firebase Hosting (New) |
|---------|-----------|------------------------|
| **Deployment Command** | `gsutil rsync` | `firebase deploy` |
| **Authentication** | Workload Identity | Service Account JSON |
| **SSL** | Manual (Load Balancer) | Automatic |
| **CDN** | Manual (Load Balancer) | Built-in global CDN |
| **Preview Deploys** | Not available | Built-in for PRs |
| **Rollback** | Manual gsutil commands | `firebase hosting:rollback` |
| **Cache Headers** | Set via gsutil | Set via firebase.json |
| **URL** | storage.googleapis.com | dcmco-prod-2026.web.app |
| **Cost** | GCS + Load Balancer | Free tier: 10GB storage, 360MB/day bandwidth |

---

## Testing the Workflows

### Test Staging Deployment

```bash
# 1. Make a small change
echo "# Test" >> README.md

# 2. Commit and push to main
git add README.md
git commit -m "test: trigger Firebase deployment"
git push origin main

# 3. Watch the workflow
# Go to: https://github.com/shanefitzgerald/DCMCO-WEBSITE/actions
```

### Test Preview Deployment

```bash
# 1. Create a new branch
git checkout -b test/firebase-preview

# 2. Make a change
echo "# Preview test" >> README.md

# 3. Commit and push
git add README.md
git commit -m "test: preview deployment"
git push origin test/firebase-preview

# 4. Create a Pull Request on GitHub

# 5. Check for preview URL comment on the PR
```

---

## Deployment Summary

Each deployment generates a detailed summary including:

### Staging Deployment
- ✅ Status indicator
- 📦 Environment details (project, channel)
- 📊 Deployment metrics (timestamp, commit, actor)
- 🔗 Quick links (live site, Firebase console, commit)
- ⚡ Performance info (CDN, SSL, caching)

### Preview Deployment
- 🚀 Preview URL (unique per PR)
- 📦 Deployment details (expires in 7 days)
- 🔍 Testing checklist
- 💬 Posted as PR comment

---

## Rollback Procedure

If you need to rollback a deployment:

```bash
# 1. List recent deployments
firebase hosting:releases:list

# Example output:
# ┌─────────────────┬─────────────────────────┬──────────┐
# │ Release ID      │ Date                    │ Version  │
# ├─────────────────┼─────────────────────────┼──────────┤
# │ abc123def456    │ 2026-01-10T10:30:00Z   │ current  │
# │ def789ghi012    │ 2026-01-10T09:15:00Z   │          │
# └─────────────────┴─────────────────────────┴──────────┘

# 2. Rollback to previous version
firebase hosting:rollback

# Or specify a version
firebase hosting:rollback def789ghi012

# 3. Verify the rollback
curl -I https://dcmco-prod-2026.web.app
```

---

## Preview Channel Management

### List Active Previews

```bash
firebase hosting:channel:list
```

### Delete a Preview

```bash
# Delete specific preview
firebase hosting:channel:delete CHANNEL_ID

# Previews auto-expire after 7 days, so manual deletion is optional
```

---

## Troubleshooting

### Issue: "Permission Denied" Error

**Cause:** Service account doesn't have necessary permissions

**Solution:**
```bash
# Grant Firebase Admin role
gcloud projects add-iam-policy-binding dcmco-prod-2026 \
    --member="serviceAccount:firebase-deployer@dcmco-prod-2026.iam.gserviceaccount.com" \
    --role="roles/firebase.admin"
```

### Issue: "Invalid Service Account" Error

**Cause:** FIREBASE_SERVICE_ACCOUNT secret is malformed

**Solution:**
1. Regenerate the service account key
2. Ensure you copy the ENTIRE JSON (including `{ }` braces)
3. Paste into GitHub secret without any modifications
4. No extra quotes or escaping needed

### Issue: Build Fails with npm Authentication Error

**Cause:** GCP authentication for Artifact Registry failed

**Solution:**
1. Verify `GCP_WORKLOAD_IDENTITY_PROVIDER` secret exists
2. Verify `GCP_SERVICE_ACCOUNT` secret exists
3. Check service account has Artifact Registry Reader role

### Issue: Preview URL Not Posted on PR

**Cause:** Missing `pull-requests: write` permission

**Solution:**
- Already configured in workflow:
```yaml
permissions:
  contents: read
  pull-requests: write
```

---

## Monitoring & Metrics

### Firebase Console

View deployment history and metrics:
- Go to: https://console.firebase.google.com/project/dcmco-prod-2026/hosting
- View live site usage
- See deployment history
- Check rollback options

### GitHub Actions

View workflow runs:
- Go to: https://github.com/shanefitzgerald/DCMCO-WEBSITE/actions
- Click on specific workflow run for details
- View deployment summary
- Check logs if deployment failed

---

## Migration from GCS

### What Changes

1. **Deployment URL:**
   - Old: `https://storage.googleapis.com/dcmco-website-staging-2026/index.html`
   - New: `https://dcmco-prod-2026.web.app`

2. **Workflow Files:**
   - Old: `.github/workflows/deploy-staging.yml` (GCS)
   - New: `.github/workflows/deploy-firebase-staging.yml` (Firebase)

3. **Secrets:**
   - Add: `FIREBASE_SERVICE_ACCOUNT`
   - Keep: Existing GCP secrets (for npm packages)

4. **Infrastructure:**
   - Old: CDKTF managing GCS buckets
   - New: Firebase Hosting (managed via Firebase Console)

### What Stays the Same

1. Build process (`pnpm build`)
2. npm package authentication (still needs GCP)
3. Next.js configuration (`next.config.mjs`)
4. Firebase configuration (`firebase.json`)

---

## Next Steps

1. ✅ **Set up service account** (completed in Step 1)
2. ✅ **Add GitHub secrets** (completed in Step 2)
3. 🔄 **Test staging deployment** (push to main)
4. 🔄 **Test preview deployment** (create a PR)
5. 🔄 **Verify both workflows work**
6. 🔄 **Update README** (change deployment URLs)
7. 🔄 **Deprecate GCS workflows** (optional)

---

## Cost Estimates

### Firebase Hosting Free Tier
- **Storage:** 10 GB (plenty for Next.js site)
- **Bandwidth:** 360 MB/day (~10.8 GB/month)
- **Custom domains:** Unlimited
- **SSL:** Free

### When You Exceed Free Tier
- **Storage:** $0.026/GB/month
- **Bandwidth:** $0.15/GB
- **Total cost for typical site:** $5-20/month

**Comparison:**
- GCS only: ~$5-10/month (storage + egress)
- GCS + Load Balancer: ~$20-30/month (adds LB cost)
- Firebase Hosting: $0-20/month (free tier + overages)

---

## Support

For issues with:
- **Workflows:** Check GitHub Actions logs
- **Firebase:** Check Firebase Console
- **Permissions:** Review service account roles in GCP Console
- **Build errors:** Check Next.js build logs

**Useful Commands:**
```bash
# Check Firebase CLI version
firebase --version

# Test Firebase deployment locally
firebase emulators:start

# View Firebase project info
firebase projects:list

# Check deployment status
firebase hosting:channel:list
```
