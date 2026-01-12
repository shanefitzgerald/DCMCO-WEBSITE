# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automated deployment of the DCMCO website to Firebase Hosting.

## Overview

The deployment pipeline uses a three-stage strategy:
- **Preview**: Temporary preview channels for pull requests (automatic on PR)
- **Staging**: Automatic deployment to staging environment (automatic on merge to main)
- **Production**: Manual deployment to production environment (manual trigger with confirmation)

All workflows use Workload Identity Federation for secure GCP authentication without service account keys.

## Table of Contents

- [Active Workflows](#active-workflows)
- [Required GitHub Secrets](#required-github-secrets)
- [Workflow Usage](#workflow-usage)
- [Monitoring Deployments](#monitoring-deployments)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Active Workflows

### 1. Deploy Preview (`deploy-preview.yml`)

**Purpose:** Create temporary preview deployments for pull requests.

**Triggers:**
- Pull request opened
- Pull request synchronized (new commits)
- Pull request reopened

**What it does:**
1. Checks out code and sets up Node.js 20 with pnpm
2. Authenticates to GCP using Workload Identity Federation
3. Installs dependencies and builds Next.js site
4. Deploys to Firebase Hosting preview channel (7-day expiry)
5. Posts PR comment with preview URL and testing checklist

**Deployment flow:**
```
PR opened/updated → Build site → Deploy to preview channel → Comment on PR
```

**Features:**
- Automatic deployment on PR events
- Temporary preview URLs (expires in 7 days)
- PR comments with direct preview links
- Testing checklist for reviewers
- No manual intervention required

**Example preview URL:** `pr123-abcd1234.web.app`

---

### 2. Deploy to Staging (`deploy-staging.yml`)

**Purpose:** Automatically deploy the website to the staging environment.

**Triggers:**
- Push to `main` branch (automatic)
- Manual trigger via `workflow_dispatch`

**What it does:**
1. Checks out code and sets up Node.js 20 with pnpm
2. Authenticates to GCP using Workload Identity Federation
3. Installs dependencies and builds Next.js site
4. Deploys to Firebase Hosting staging site
5. Posts deployment summary to commit

**Deployment flow:**
```
Push to main → Build site → Deploy to Firebase staging → Post summary
```

**Environment:**
- **Firebase Site:** `dcmco-staging`
- **URL:** `https://dcmco-staging.web.app`
- **Auto-deploy:** ✅ Yes (on push to main)

---

### 3. Deploy to Production (`deploy-production.yml`)

**Purpose:** Deploy the website to production with manual control and safety checks.

**Triggers:**
- Release published (automatic)
- Manual trigger via `workflow_dispatch` (requires confirmation)

**What it does:**
1. Validates deployment confirmation (if manual trigger)
2. Checks out code and sets up Node.js 20 with pnpm
3. Authenticates to GCP using Workload Identity Federation
4. Installs dependencies and builds Next.js site
5. Deploys to Firebase Hosting production site
6. Posts deployment summary to commit

**Deployment flow:**
```
Manual trigger + confirm → Build site → Deploy to Firebase production → Post summary
```

**Environment:**
- **Firebase Site:** `dcmco-production`
- **URLs:**
  - `https://dcmco-production.web.app` (Firebase default)
  - `https://dcmco.com.au` (custom domain)
  - `https://www.dcmco.com.au` (www subdomain)
- **Auto-deploy:** ✅ Yes (on GitHub release), ❌ No (manual trigger requires confirmation)

**Safety features:**
- Manual trigger requires typing "deploy" to confirm
- Automatic deployment only on official GitHub releases
- GitHub environment protection can be configured for additional approvals

---

## Required GitHub Secrets

Configure these secrets in your repository (Settings → Secrets and variables → Actions):

### Authentication Secrets

| Secret Name | Description | Example | Required |
|------------|-------------|---------|----------|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | WIF provider resource name | `projects/123/locations/global/workloadIdentityPools/pool/providers/provider` | ✅ All workflows |
| `GCP_SERVICE_ACCOUNT` | Service account email for WIF | `github-actions@project.iam.gserviceaccount.com` | ✅ All workflows |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON key | `{"type":"service_account",...}` | ✅ All workflows |

### Required IAM Roles

The service account specified in `GCP_SERVICE_ACCOUNT` needs:
- `roles/firebasehosting.admin` - Deploy to Firebase Hosting
- `roles/artifactregistry.reader` - Access private npm packages (if used)

### Notes

- All workflows use **Workload Identity Federation** (no static service account keys in workflows)
- Firebase service account JSON is only used for Firebase Hosting CLI operations
- Secrets are never logged or exposed in workflow outputs

---

## Workflow Usage

### Deploying Website Preview (Pull Requests)

**Automatic deployment:**
1. Create a pull request against any branch
2. Preview automatically deploys
3. Check PR comments for preview URL
4. Test the preview site
5. Preview expires in 7 days

**What gets deployed:**
- Temporary Firebase Hosting preview channel
- Unique URL per PR (e.g., `pr123-abcd1234.web.app`)
- Automatically cleaned up after 7 days

**No action required** - deployment is fully automatic!

---

### Deploying Website to Staging

#### Automatic Deployment (Recommended)

```bash
# Simply merge your PR to main
git checkout main
git pull origin main
git merge your-feature-branch
git push origin main
```

The staging deployment will trigger automatically on push to `main`.

#### Manual Deployment

1. Go to Actions → Deploy to Firebase Hosting (Staging)
2. Click "Run workflow"
3. Select branch (usually `main`)
4. Click "Run workflow"

**What gets deployed:**
- Firebase Hosting staging site (`dcmco-staging`)
- URL: `https://dcmco-staging.web.app`
- Latest code from selected branch

---

### Deploying Website to Production

#### Option 1: Automatic via GitHub Release (Recommended)

1. Go to Releases → Draft a new release
2. Create a new tag (e.g., `v1.0.0`)
3. Add release notes
4. Click "Publish release"
5. Deployment triggers automatically

#### Option 2: Manual Deployment

1. Go to Actions → Deploy to Production (Firebase Hosting)
2. Click "Run workflow"
3. **Type `deploy` in the confirmation field**
4. Click "Run workflow"
5. If environment protection is enabled, approve the deployment

**What gets deployed:**
- Firebase Hosting production site (`dcmco-production`)
- URLs:
  - `https://dcmco-production.web.app` (Firebase)
  - `https://dcmco.com.au` (custom domain)
  - `https://www.dcmco.com.au`
- Latest code from selected branch (usually `main`)

**Safety features:**
- Manual deployments require confirmation
- Can be configured with GitHub environment protection rules
- All production deployments are audited in Actions logs

---

## Monitoring Deployments

### During Deployment

Watch the workflow run in the Actions tab:
- Each step shows real-time logs
- Failed steps are highlighted in red
- You can cancel running workflows if needed
- Duration: typically 2-4 minutes

### After Deployment

#### Preview Deployments
- Check PR comment for preview URL
- Click "Visit Preview" link
- Test all functionality
- Preview remains active for 7 days

#### Staging Deployments
- Visit: `https://dcmco-staging.web.app`
- Verify changes deployed correctly
- Check commit for deployment summary

#### Production Deployments
- Visit: `https://dcmco.com.au` or `https://www.dcmco.com.au`
- Verify production site is working
- Monitor for any errors or issues
- Check Firebase Hosting dashboard

### Deployment Verification

```bash
# Check Firebase Hosting status
firebase hosting:channel:list

# View recent deployments
firebase hosting:sites:list
```

---

## Troubleshooting

### Authentication Failed

**Error:** "Failed to generate access token" or "Invalid service account"

**Solutions:**
1. Verify Workload Identity Federation is set up in GCP
2. Check `GCP_WORKLOAD_IDENTITY_PROVIDER` secret matches exactly
3. Verify `GCP_SERVICE_ACCOUNT` email is correct
4. Ensure service account has required IAM roles:
   - `roles/firebasehosting.admin`
   - `roles/artifactregistry.reader` (if using private packages)
5. Verify the GitHub repository is configured in WIF identity pool

### Build Failed

**Error:** Next.js build errors or TypeScript errors

**Solutions:**
1. Test build locally: `pnpm run build`
2. Check for TypeScript errors: `pnpm run typecheck`
3. Verify dependencies install correctly: `pnpm install`
4. Review build logs for specific errors
5. Check Node.js version matches workflow (v20)
6. Ensure all environment variables are set

### Firebase Deploy Failed

**Error:** Firebase Hosting deployment errors

**Solutions:**
1. Verify Firebase project ID is correct (`dcmco-prod-2026`)
2. Check `FIREBASE_SERVICE_ACCOUNT` secret is valid JSON
3. Ensure Firebase Hosting is enabled in Firebase console
4. Verify `firebase.json` configuration is correct:
   ```json
   {
     "hosting": [
       {
         "target": "staging",
         "public": "out",
         "site": "dcmco-staging"
       },
       {
         "target": "production",
         "public": "out",
         "site": "dcmco-production"
       }
     ]
   }
   ```
5. Check that build output exists in `out/` directory
6. Verify Firebase site IDs match Pulumi configuration

### Website Not Accessible

**Issue:** 404 or blank page errors after deployment

**Solutions:**
1. Verify build completed successfully
2. Check that `index.html` exists in `out/` directory
3. Verify Next.js static export is configured:
   ```js
   // next.config.js
   module.exports = {
     output: 'export',
   }
   ```
4. Check deployment logs for upload errors
5. Clear browser cache and try again
6. Check Firebase Hosting dashboard for deployment status
7. Verify custom domain DNS is configured correctly (production only)

### Preview URL Not in PR Comment

**Issue:** Preview deploys but PR comment not posted

**Solutions:**
1. Verify workflow has `pull-requests: write` permission
2. Check Actions logs for comment posting errors
3. Manually find preview URL in workflow output
4. Ensure Firebase CLI returned preview URL

---

## Best Practices

### General

1. **Test in preview first** - Always create a PR to test changes in preview
2. **Monitor workflow runs** - Watch for failures or warnings
3. **Review deployment summaries** - Verify correct configuration
4. **Keep secrets up to date** - Rotate credentials periodically
5. **Use semantic versioning** - Tag releases with meaningful version numbers

### Development Workflow

```
feature branch → PR (preview deploy) → review → merge to main (staging deploy) → release (production deploy)
```

1. **Create feature branch** from `main`
2. **Open pull request** - Preview automatically deploys
3. **Test preview site** - Verify changes work correctly
4. **Get code review** - Have team review changes
5. **Merge to main** - Staging automatically deploys
6. **Test staging** - Verify changes in staging environment
7. **Create release** - Production automatically deploys (or manual trigger)
8. **Verify production** - Check production site

### Website Deployments

1. ✅ **Preview everything** - Use PR previews to test changes before merging
2. ✅ **Staging validation** - Verify changes in staging before production
3. ✅ **Production caution** - Production deploys require confirmation or release
4. ✅ **Build verification** - Always check build logs for errors or warnings
5. ✅ **Post-deployment testing** - Verify the deployed site works correctly
6. ✅ **Rollback plan** - Know how to rollback (deploy previous release)

### Security

- ✅ Uses Workload Identity Federation (no long-lived service account keys)
- ✅ Secrets are never logged or exposed
- ✅ Minimum required permissions on service account
- ✅ Production requires manual approval or release
- ✅ All deployments are audited in GitHub Actions logs
- ✅ Preview channels expire automatically (7 days)

---

## Environment Summary

| Environment | Firebase Site | URL | Trigger | Auto Deploy | Confirmation |
|------------|--------------|-----|---------|-------------|--------------|
| **Preview** | N/A (channel) | `pr###-*****.web.app` | PR opened/updated | ✅ Yes | ❌ No |
| **Staging** | `dcmco-staging` | `dcmco-staging.web.app` | Push to `main` | ✅ Yes | ❌ No |
| **Production** | `dcmco-production` | `dcmco.com.au` | Release or manual | ⚠️ Conditional | ✅ Yes (manual only) |

---

## Firebase Hosting Sites

The Pulumi infrastructure creates these Firebase Hosting sites:

| Site ID | Environment | Managed By |
|---------|-------------|------------|
| `dcmco-staging` | Staging | Pulumi |
| `dcmco-production` | Production | Pulumi |

View sites:
```bash
firebase hosting:sites:list
```

---

## Related Documentation

- [Infrastructure README](../../infrastructure/README.md) - Pulumi infrastructure setup
- [Infrastructure Configuration](../../infrastructure/MIGRATION_VERIFICATION.md) - Pulumi config verification
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting) - Firebase Hosting documentation
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports) - Next.js export documentation

---

## Support

For issues or questions:

1. **Check troubleshooting section** above
2. **Review workflow logs** in the Actions tab
3. **Verify secrets** are configured correctly
4. **Check Firebase console** for hosting status
5. **Review Pulumi infrastructure** in `/infrastructure`
6. **Check build locally** to reproduce issues
7. **Contact team** for GCP/Firebase access issues

---

## Notes

- **Infrastructure:** Firebase Hosting sites are managed by Pulumi (see `/infrastructure`)
- **Static Export:** Next.js builds to static HTML/CSS/JS in `out/` directory
- **No Server:** All workflows deploy static files only (no server-side rendering)
- **Custom Domains:** Production uses custom domains configured in Firebase Hosting
- **Artifact Registry:** Optional authentication for private npm packages
- **Workload Identity:** More secure than service account keys, auto-rotates credentials
