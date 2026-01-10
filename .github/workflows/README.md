# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automated deployment of the DCMCO website to Google Cloud Storage.

## Workflows

### 1. Test GCP Authentication (`test-gcp-auth.yml`)

**Purpose:** Validate that Workload Identity Federation is configured correctly.

**Trigger:** Manual (`workflow_dispatch`)

**What it does:**
- Authenticates to GCP using Workload Identity Federation
- Tests access to GCS buckets
- Verifies the authentication setup

**When to use:**
- After initial WIF setup
- When troubleshooting authentication issues
- Before deploying to ensure credentials work

### 2. Deploy to Staging (`deploy-staging.yml`)

**Purpose:** Automatically deploy the website to the staging environment.

**Triggers:**
- Push to `main` branch (automatic)
- Manual trigger via `workflow_dispatch`

**What it does:**
1. Checks out code and sets up Node.js, pnpm, Terraform
2. Authenticates to GCP using Workload Identity Federation
3. Deploys infrastructure using CDKTF (creates/updates GCS bucket)
4. Builds the Next.js static site
5. Uploads the site to GCS
6. Sets appropriate cache headers
7. Verifies the deployment

**Deployment flow:**
```
Push to main → Install deps → Auth to GCP → Deploy infra → Build site → Upload to GCS → Verify
```

### 3. Deploy to Production (`deploy-production.yml`)

**Purpose:** Deploy the website to production with extra safety checks.

**Trigger:** Manual only with confirmation required

**What it does:**
- Same as staging deployment, but:
  - Requires typing "deploy" to confirm
  - Uses production bucket and configuration
  - Includes custom domain support
  - Has production environment protection

**Safety features:**
- Manual trigger only (no automatic deployments)
- Confirmation step (must type "deploy")
- GitHub environment protection (can require approvals)

## Required GitHub Secrets

Configure these secrets in your repository (Settings → Secrets and variables → Actions):

### Authentication Secrets

| Secret Name | Description | Example |
|------------|-------------|---------|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | WIF provider resource name | `projects/123/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider` |
| `GCP_SERVICE_ACCOUNT` | Service account email | `github-actions@project.iam.gserviceaccount.com` |

### Infrastructure Secrets

| Secret Name | Description | Example | Required For |
|------------|-------------|---------|--------------|
| `GCP_PROJECT_ID` | GCP project ID | `dcmco-prod-2026` | Both |
| `GCP_REGION` | GCP region | `australia-southeast1` | Both |
| `GCS_BUCKET_LOCATION` | Bucket location/region | `AUSTRALIA-SOUTHEAST1` | Both |
| `GCS_BUCKET_NAME_STAGING` | Staging bucket name | `dcmco-website-staging` | Staging |
| `GCS_BUCKET_NAME_PRODUCTION` | Production bucket name | `dcmco-website-production` | Production |
| `DOMAIN_NAME` | Custom domain (optional) | `www.example.com` | Production only |

## Setting Up GitHub Environments

For better control and protection, configure GitHub environments:

### Staging Environment

1. Go to Settings → Environments → New environment
2. Name: `staging`
3. Optional: Add environment secrets specific to staging
4. No protection rules needed (auto-deploy on push to main)

### Production Environment

1. Go to Settings → Environments → New environment
2. Name: `production`
3. **Recommended protection rules:**
   - ✅ Required reviewers (1-2 team members)
   - ✅ Wait timer (optional: 5 minutes to allow cancellation)
   - ✅ Deployment branches: `main` only

This ensures production deployments require manual approval.

## Workflow Usage

### Deploying to Staging

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

### Deploying to Production

**Manual deployment only:**
1. Go to Actions → Deploy to Production
2. Click "Run workflow"
3. Type `deploy` in the confirmation field
4. Click "Run workflow"
5. If environment protection is enabled, approve the deployment

### Testing Authentication

1. Go to Actions → Test GCP Authentication
2. Click "Run workflow"
3. Select branch
4. Click "Run workflow"

## Monitoring Deployments

### During Deployment

Watch the workflow run in the Actions tab:
- Each step shows real-time logs
- Failed steps are highlighted in red
- You can cancel running workflows if needed

### After Deployment

Check the deployment summary at the bottom of each workflow run:
- Direct links to the deployed website
- GCS bucket link
- Configuration details

### Verifying the Website

Staging URL:
```
https://storage.googleapis.com/[BUCKET_NAME]/index.html
```

Production URL (if using custom domain):
```
https://[DOMAIN_NAME]
```

Production URL (direct GCS):
```
https://storage.googleapis.com/[BUCKET_NAME]/index.html
```

## Troubleshooting

### Authentication Failed

**Error:** "Failed to generate access token"

**Solution:**
1. Verify WIF is set up correctly in GCP
2. Check `GCP_WORKLOAD_IDENTITY_PROVIDER` secret matches exactly
3. Verify `GCP_SERVICE_ACCOUNT` email is correct
4. Run the "Test GCP Authentication" workflow

### CDKTF Deploy Failed

**Error:** "cdktf deploy failed"

**Solutions:**
1. Check infrastructure logs for specific errors
2. Verify GCP project ID is correct
3. Ensure required GCP APIs are enabled
4. Check service account has necessary permissions

### Build Failed

**Error:** Next.js build errors

**Solutions:**
1. Test build locally: `pnpm run build`
2. Check for TypeScript errors
3. Verify environment variables are set correctly
4. Review build logs for specific errors

### Upload to GCS Failed

**Error:** "gsutil rsync failed"

**Solutions:**
1. Verify bucket name is correct
2. Check service account has Storage Admin permissions
3. Ensure bucket exists (CDKTF should create it)
4. Check GCP project ID matches

### Website Not Accessible

**Issue:** 404 or 403 errors when accessing the site

**Solutions:**
1. Verify bucket has public read access
2. Check that `index.html` exists in bucket
3. Verify bucket IAM allows `allUsers` storage.objectViewer
4. Check CORS configuration if needed

## Workflow Customization

### Adding Environment Variables

To add build-time environment variables:

```yaml
- name: Build Next.js site
  run: pnpm run build
  env:
    NEXT_PUBLIC_API_URL: ${{ secrets.API_URL }}
    NEXT_PUBLIC_ENV: staging
```

### Modifying Cache Headers

Edit the cache control step in the workflow:

```yaml
- name: Set Cache-Control headers
  run: |
    # Customize cache duration (in seconds)
    gsutil -m setmeta -h "Cache-Control:public, max-age=86400" \
      'gs://${{ secrets.GCS_BUCKET_NAME_STAGING }}/**/*.js'
```

### Adding Notifications

Add Slack/Discord notifications on deployment:

```yaml
- name: Notify Slack
  if: always()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "Deployment ${{ job.status }}: ${{ github.repository }}"
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

## Best Practices

1. **Always test in staging first** before deploying to production
2. **Use environment protection** for production deployments
3. **Monitor workflow runs** for failures or warnings
4. **Review deployment summaries** to verify correct configuration
5. **Keep secrets up to date** when rotating credentials
6. **Test the "Test GCP Authentication" workflow** periodically
7. **Use semantic versioning** or tags for production releases

## Security Considerations

- ✅ Uses Workload Identity Federation (no service account keys)
- ✅ Secrets are never logged or exposed
- ✅ Minimum required permissions on service account
- ✅ Production requires manual approval
- ✅ All deployments are audited in GitHub Actions logs

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review workflow logs in the Actions tab
3. Verify all secrets are configured correctly
4. Check GCP console for infrastructure issues
5. Review CDKTF infrastructure code in `/infrastructure`
