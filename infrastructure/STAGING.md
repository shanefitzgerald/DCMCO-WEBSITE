# Staging Environment Guide

## Overview

This infrastructure is configured for a **staging environment** to test the website before production deployment.

## Configuration

### Current Setup

- **Environment**: `staging`
- **GCS Bucket**: `dcmco-website-staging`
- **Location**: `AUSTRALIA-SOUTHEAST1`
- **Project**: `dcmco-prod-2026`

### Accessing the Staging Site

After deployment, your staging website will be accessible via the GCS bucket URL:

```
https://storage.googleapis.com/dcmco-website-staging/index.html
```

Or using the GCS website endpoint (if configured):

```
https://dcmco-website-staging.storage.googleapis.com/index.html
```

**Note**: Since you don't own `dcmco.com.au` yet, the staging site will be accessed directly through Google Cloud Storage URLs.

## Deployment

### 1. Deploy Infrastructure

```bash
cd infrastructure
pnpm deploy
```

This will create:
- GCS bucket: `dcmco-website-staging`
- Public read access
- Website configuration (index.html, 404.html)
- CORS settings

### 2. Build and Upload Website

```bash
# Build the Next.js site
cd ..
pnpm build

# Upload to staging bucket
gsutil -m rsync -r -d out/ gs://dcmco-website-staging/

# Set cache control for static assets
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000" \
  "gs://dcmco-website-staging/_next/**"
```

### 3. Access Your Site

After upload, visit:
```
https://storage.googleapis.com/dcmco-website-staging/index.html
```

## Moving to Production

When you're ready to move to production:

1. **Update `.env`** file:
   ```bash
   GCS_BUCKET_NAME=dcmco-website-prod
   ENVIRONMENT=production
   ```

2. **Re-synthesize**:
   ```bash
   pnpm synth
   ```

3. **Deploy production**:
   ```bash
   pnpm deploy
   ```

## Custom Domain (Future)

Once you own `dcmco.com.au`, you can:

1. **Configure Cloud DNS** for your domain
2. **Set up a load balancer** pointing to the GCS bucket
3. **Add SSL certificate** via Google-managed certificates
4. **Update DNS records** to point to the load balancer

### Infrastructure Changes Needed

```typescript
// Add to main.ts when you have the domain

// 1. Reserve static IP
const staticIp = new ComputeAddress(this, "website-ip", {
  name: "dcmco-website-ip",
  region: config.region,
});

// 2. Create backend bucket
const backendBucket = new ComputeBackendBucket(this, "backend-bucket", {
  name: "dcmco-website-backend",
  bucketName: bucket.name,
  enableCdn: true,
});

// 3. Create URL map and load balancer
// 4. Create SSL certificate
// 5. Configure Cloud DNS
```

## Testing Checklist

Before deploying to production:

- [ ] Test all pages load correctly
- [ ] Verify images and assets load
- [ ] Test 404 page
- [ ] Check mobile responsiveness
- [ ] Test design system components
- [ ] Verify SEO meta tags
- [ ] Check page load performance
- [ ] Test CORS for any external APIs

## Environments Comparison

| Feature | Staging | Production (Future) |
|---------|---------|---------------------|
| Bucket | `dcmco-website-staging` | `dcmco-website-prod` |
| URL | GCS direct URL | Custom domain |
| CDN | No | Yes (Cloud CDN) |
| SSL | GCS default | Custom certificate |
| Cost | Minimal | Higher (CDN, Load Balancer) |

## Cost Estimate (Staging)

**Monthly costs** (estimated):
- GCS Storage (1GB): ~$0.02
- GCS Bandwidth (10GB): ~$0.12
- **Total**: ~$0.15/month

**Production will add**:
- Load Balancer: ~$18/month
- Cloud CDN: ~$0.08/GB
- SSL Certificate: Free (Google-managed)

## Useful Commands

```bash
# View bucket contents
gsutil ls gs://dcmco-website-staging/

# Check bucket size
gsutil du -sh gs://dcmco-website-staging/

# Make a single file public
gsutil acl ch -u AllUsers:R gs://dcmco-website-staging/index.html

# Delete all contents (careful!)
gsutil -m rm -r gs://dcmco-website-staging/**

# View access logs (if enabled)
gsutil ls gs://dcmco-website-staging-logs/
```

## Troubleshooting

### Website Not Loading

1. Check bucket exists:
   ```bash
   gsutil ls gs://dcmco-website-staging/
   ```

2. Verify public access:
   ```bash
   gsutil iam get gs://dcmco-website-staging/
   ```

3. Check files were uploaded:
   ```bash
   gsutil ls gs://dcmco-website-staging/index.html
   ```

### 404 Errors

- Ensure `404.html` is uploaded to the bucket root
- Verify website configuration in bucket settings

### CORS Errors

- Check CORS configuration in the Terraform output
- Verify the bucket CORS settings allow your domain

## Next Steps

1. Deploy staging infrastructure
2. Build and upload the website
3. Test the staging site thoroughly
4. Purchase domain when ready
5. Plan production infrastructure with custom domain
