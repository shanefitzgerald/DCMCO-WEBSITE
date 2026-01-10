# Deployment Guide

This document provides comprehensive procedures for managing Firebase Hosting deployments, handling failures, and performing rollbacks.

## Table of Contents

- [Automated Deployments](#automated-deployments)
- [Manual Deployment](#manual-deployment)
- [Rollback Procedures](#rollback-procedures)
- [Preview Deployments](#preview-deployments)
- [Debugging Failed Deployments](#debugging-failed-deployments)
- [Health Checks & Verification](#health-checks--verification)

---

## Automated Deployments

### Production Deployment (Main Branch)

**Workflow:** `.github/workflows/deploy-firebase-staging.yml`

Automatically deploys when code is pushed to the `main` branch.

**Process:**
1. Code is pushed to `main`
2. GitHub Actions triggers automatically
3. Dependencies are installed
4. Next.js site is built
5. Deployed to Firebase Hosting (live channel)
6. Site is immediately available at https://dcmco-prod-2026.web.app

**Monitoring:**
- [View Deployment History](https://github.com/shanefitzgerald/DCMCO-WEBSITE/actions/workflows/deploy-firebase-staging.yml)
- Check deployment summary in workflow run
- Verify live site after deployment

### Preview Deployments (Pull Requests)

**Workflow:** `.github/workflows/deploy-firebase-preview.yml`

Automatically creates preview deployments for Pull Requests.

**Process:**
1. Pull Request is opened or updated
2. GitHub Actions triggers automatically
3. Site is deployed to unique preview channel
4. Preview URL is posted as PR comment
5. Preview expires after 7 days

**Preview URL format:**
```
https://dcmco-prod-2026--pr-<number>-<hash>.web.app
```

---

## Manual Deployment

### Prerequisites

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Authenticate to Firebase
firebase login

# Verify project access
firebase projects:list
```

### Deploy to Production

```bash
# Build the site
pnpm build

# Preview deployment (optional)
firebase hosting:channel:deploy preview

# Deploy to live production
firebase deploy --only hosting --project dcmco-prod-2026
```

### Deploy with Message

```bash
firebase deploy --only hosting -m "Deploy version 1.2.3"
```

---

## Rollback Procedures

### Quick Rollback (Recommended)

Firebase Hosting maintains a history of all deployments. Rolling back is simple:

```bash
# 1. List recent deployments
firebase hosting:releases:list --project dcmco-prod-2026

# Example output:
# ┌─────────────────┬─────────────────────────┬──────────┐
# │ Release ID      │ Date                    │ Version  │
# ├─────────────────┼─────────────────────────┼──────────┤
# │ abc123def456    │ 2026-01-11T10:30:00Z   │ current  │
# │ def789ghi012    │ 2026-01-10T15:20:00Z   │          │
# │ ghi345jkl678    │ 2026-01-10T09:15:00Z   │          │
# └─────────────────┴─────────────────────────┴──────────┘

# 2. Rollback to previous version
firebase hosting:rollback --project dcmco-prod-2026

# Or rollback to specific version
firebase hosting:rollback def789ghi012 --project dcmco-prod-2026

# 3. Verify rollback
curl -I https://dcmco-prod-2026.web.app
```

**Rollback timing:**
- Command execution: ~5-10 seconds
- CDN propagation: ~1-2 minutes
- **Total time: ~2-3 minutes**

### Via GitHub Actions

You can also trigger a deployment of a previous commit:

```bash
# 1. Find the last good commit
git log --oneline -10

# 2. Checkout that commit
git checkout <commit-sha>

# 3. Push to main (this will trigger deployment)
git push origin HEAD:main --force

# WARNING: This rewrites history. Use with caution.
```

**Safer alternative:**

```bash
# 1. Create a revert commit
git revert <bad-commit-sha>

# 2. Push the revert
git push origin main

# This creates a new commit that undoes the changes
```

---

## Preview Deployments

### Create a Preview Channel

```bash
# Deploy to a preview channel
firebase hosting:channel:deploy preview-feature-x --expires 7d

# Output will include preview URL:
# ✔  Deploy complete!
# ✔  Preview URL: https://dcmco-prod-2026--preview-feature-x-abc123.web.app
```

### List Active Previews

```bash
firebase hosting:channel:list --project dcmco-prod-2026
```

### Delete a Preview

```bash
firebase hosting:channel:delete preview-feature-x --project dcmco-prod-2026
```

**Note:** Previews automatically expire after their expiration date (default 7 days).

---

## Debugging Failed Deployments

### Check Workflow Logs

1. Go to [Actions tab](https://github.com/shanefitzgerald/DCMCO-WEBSITE/actions)
2. Click on the failed workflow run
3. Expand the failed step
4. Check error messages

### Common Issues

#### 1. Build Failures

**Symptoms:**
```
Error: Build failed with exit code 1
```

**Solutions:**
```bash
# Test build locally
pnpm build

# Check TypeScript errors
pnpm run type-check

# Check linting
pnpm lint
```

#### 2. Authentication Failures

**Symptoms:**
```
Error: FIREBASE_SERVICE_ACCOUNT secret is missing or invalid
```

**Solutions:**
1. Verify `FIREBASE_SERVICE_ACCOUNT` secret exists in GitHub
2. Regenerate service account key if needed:
   ```bash
   gcloud iam service-accounts keys create firebase-key.json \
     --iam-account=firebase-deployer@dcmco-prod-2026.iam.gserviceaccount.com
   ```
3. Update GitHub secret with new key

#### 3. Permission Errors

**Symptoms:**
```
Error: Missing required permission firebasehosting.sites.update
```

**Solutions:**
```bash
# Grant Firebase Hosting Admin role
gcloud projects add-iam-policy-binding dcmco-prod-2026 \
  --member="serviceAccount:firebase-deployer@dcmco-prod-2026.iam.gserviceaccount.com" \
  --role="roles/firebasehosting.admin"
```

#### 4. Dependency Installation Failures

**Symptoms:**
```
Error: Failed to install @dcmco/design-system
```

**Solutions:**
1. Verify GCP authentication in workflow
2. Check Artifact Registry permissions
3. Verify `GCP_WORKLOAD_IDENTITY_PROVIDER` and `GCP_SERVICE_ACCOUNT` secrets

---

## Health Checks & Verification

### After Deployment

Always verify the deployment was successful:

```bash
# 1. Check site is accessible
curl -I https://dcmco-prod-2026.web.app

# Expected: HTTP/2 200

# 2. Check cache headers
curl -I https://dcmco-prod-2026.web.app/ | grep -i cache-control

# Expected for HTML: cache-control: public, max-age=0, must-revalidate

# 3. Check static assets
curl -I https://dcmco-prod-2026.web.app/_next/static/chunks/main.js | grep -i cache-control

# Expected: cache-control: public, max-age=31536000, immutable

# 4. Verify content
curl -s https://dcmco-prod-2026.web.app/ | grep -i "DCMCO"
```

### Monitoring

**Firebase Console:**
- [Hosting Dashboard](https://console.firebase.google.com/project/dcmco-prod-2026/hosting)
- View deployment history
- Monitor usage and bandwidth
- Check deployment status

**GitHub Actions:**
- [Deployment History](https://github.com/shanefitzgerald/DCMCO-WEBSITE/actions/workflows/deploy-firebase-staging.yml)
- View workflow runs
- Check deployment summaries
- Monitor build times

---

## Emergency Procedures

### Emergency Rollback

If the site is down or critically broken:

```bash
# Immediate rollback to previous version
firebase hosting:rollback --project dcmco-prod-2026

# Verify site is restored
curl -I https://dcmco-prod-2026.web.app
```

**Total time: ~2-3 minutes**

### Emergency Stop

To prevent further deployments:

1. Go to [Actions Settings](https://github.com/shanefitzgerald/DCMCO-WEBSITE/settings/actions)
2. Disable the workflow temporarily
3. Fix the issue
4. Re-enable the workflow

---

## Best Practices

### Before Pushing to Main

1. ✅ Test locally: `pnpm dev`
2. ✅ Build successfully: `pnpm build`
3. ✅ Run linting: `pnpm lint`
4. ✅ Check types: `pnpm run type-check`
5. ✅ Preview with Firebase: `firebase serve`

### After Deployment

1. ✅ Verify site loads: https://dcmco-prod-2026.web.app
2. ✅ Check for console errors (browser DevTools)
3. ✅ Test key user flows
4. ✅ Monitor for error reports

### For Large Changes

1. Create a Pull Request
2. Review preview deployment
3. Get team approval
4. Merge to main

---

## Additional Resources

- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [Firebase Hosting Configuration](docs/FIREBASE_HOSTING.md)
- [GitHub Actions Setup](docs/FIREBASE_GITHUB_ACTIONS.md)
- [Troubleshooting Guide](docs/FIREBASE_HOSTING.md#troubleshooting)

---

## Support

For deployment issues:

1. Check workflow logs in GitHub Actions
2. Review Firebase Console for deployment status
3. Check this documentation for common issues
4. Contact the development team
