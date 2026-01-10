# Infrastructure Architecture

This document describes the architecture and organization of the DCMCO website infrastructure.

## Project Structure

```
infrastructure/
├── main.ts                 # Main entry point - instantiates stacks
├── stacks/                 # Modular stack definitions
│   ├── base-stack.ts       # Base class with common configuration
│   ├── storage-stack.ts    # GCS bucket for static hosting
│   ├── index.ts            # Central exports
│   └── README.md           # Stack documentation
├── cdktf.json              # CDKTF configuration
├── tsconfig.json           # TypeScript configuration
├── package.json            # Dependencies and scripts
├── .env                    # Environment variables (gitignored)
├── .env.example            # Environment variable template
├── README.md               # Getting started guide
├── STAGING.md              # Staging deployment guide
└── ARCHITECTURE.md         # This file
```

## Stack Architecture

### Design Principles

1. **Modularity**: Each infrastructure component is a separate stack
2. **Reusability**: All stacks extend `BaseStack` for common functionality
3. **Type Safety**: TypeScript interfaces for all configurations
4. **Environment Isolation**: Configuration-driven staging/production separation
5. **Documentation**: Comprehensive JSDoc comments and markdown docs

### Stack Hierarchy

```
┌─────────────────────────────────────────┐
│           BaseStack                      │
│  - GCP Provider Configuration            │
│  - Common Labels & Naming                │
│  - Helper Methods                        │
└─────────────────────────────────────────┘
                  ▲
                  │ extends
    ┌─────────────┼─────────────┐
    │             │             │
┌───┴────┐   ┌───┴────┐   ┌────┴────┐
│Storage │   │  CDN   │   │Functions│
│ Stack  │   │ Stack  │   │  Stack  │
│        │   │(future)│   │ (future)│
└────────┘   └────────┘   └─────────┘
```

## Current Implementation

### StorageStack

**Purpose**: Hosts the static Next.js website on Google Cloud Storage

**Resources Created**:
- `google_storage_bucket` - GCS bucket configured for static hosting
- `google_storage_bucket_iam_binding` - Public read access

**Configuration**:
```typescript
{
  bucketName: "dcmco-website-staging",
  bucketLocation: "AUSTRALIA-SOUTHEAST1",
  publicAccess: true,
  domainName: undefined  // Not yet configured
}
```

**Features**:
- Website mode (index.html, 404.html)
- CORS enabled for GET/HEAD requests
- Uniform bucket-level access
- Automatic labeling
- Public read access

**Outputs**:
- Bucket name
- Bucket URL (gs://)
- Website URL (https://)

## Planned Implementations

### CdnStack (Future)

Will provide global CDN and custom domain support:

**Planned Resources**:
- `google_compute_backend_bucket` - Connect GCS to load balancer
- `google_compute_url_map` - URL routing
- `google_compute_target_https_proxy` - HTTPS termination
- `google_compute_global_forwarding_rule` - External IP
- `google_compute_managed_ssl_certificate` - Auto SSL cert
- `google_dns_record_set` - Domain DNS records

**Benefits**:
- Custom domain (dcmco.com.au)
- Global CDN caching
- Automatic HTTPS
- Better performance

### FunctionsStack (Future)

Will provide serverless backend features:

**Planned Resources**:
- `google_cloudfunctions2_function` - Contact form handler
- `google_cloudfunctions2_function` - Newsletter subscription
- `google_storage_bucket` - Function source code bucket
- `google_cloudfunctions_function_iam_member` - Public invoker

**Use Cases**:
- Contact form submissions
- Newsletter signups
- Analytics events
- Form validation

## Environment Configuration

### Staging Environment

Current deployment configuration:

```bash
# GCP
GCP_PROJECT_ID=dcmco-prod-2026
GCP_REGION=australia-southeast1
GCP_ZONE=australia-southeast1-a

# Storage
GCS_BUCKET_NAME=dcmco-website-staging
GCS_BUCKET_LOCATION=AUSTRALIA-SOUTHEAST1

# Environment
ENVIRONMENT=staging
```

**Access URL**: https://storage.googleapis.com/dcmco-website-staging/index.html

### Production Environment (Future)

When ready for production:

```bash
# Storage
GCS_BUCKET_NAME=dcmco-website-prod
ENVIRONMENT=production

# Domain (when purchased)
DOMAIN_NAME=dcmco.com.au
```

**Access URL**: https://dcmco.com.au (after CDN setup)

## Deployment Flow

### Current Flow (Staging)

```
┌──────────────┐
│  Developer   │
└──────┬───────┘
       │
       │ pnpm build
       ▼
┌──────────────┐
│  Next.js     │
│  Build       │
│  (out/)      │
└──────┬───────┘
       │
       │ gsutil rsync
       ▼
┌──────────────┐
│  GCS Bucket  │
│  (staging)   │
└──────┬───────┘
       │
       │ Public URL
       ▼
┌──────────────┐
│   Browser    │
└──────────────┘
```

### Future Flow (Production with CDN)

```
┌──────────────┐
│  Developer   │
└──────┬───────┘
       │
       │ pnpm build
       ▼
┌──────────────┐
│  Next.js     │
│  Build       │
└──────┬───────┘
       │
       │ gsutil rsync
       ▼
┌──────────────┐
│  GCS Bucket  │◄────┐
│  (prod)      │     │
└──────┬───────┘     │
       │             │
       │ Backend     │
       ▼             │
┌──────────────┐     │
│  Cloud CDN   │     │ Origin Fetch
│  + Load      │     │
│  Balancer    │─────┘
└──────┬───────┘
       │
       │ Custom Domain
       │ (dcmco.com.au)
       ▼
┌──────────────┐
│   Browser    │
└──────────────┘
```

## Infrastructure Commands

```bash
# Navigate to infrastructure
cd infrastructure

# Install dependencies
pnpm install

# Build TypeScript
pnpm run build

# Generate Terraform config
pnpm run synth

# Preview changes
pnpm run plan

# Deploy (with confirmation)
pnpm run deploy

# Deploy (skip confirmation)
pnpm run deploy:auto

# Destroy infrastructure
pnpm run destroy
```

## Resource Naming Convention

All resources follow this pattern:

```
dcmco-website-{environment}-{resource-type}
```

**Examples**:
- `dcmco-website-staging-bucket` (GCS bucket)
- `dcmco-website-prod-backend` (Backend bucket)
- `dcmco-website-prod-ssl-cert` (SSL certificate)

## Labels

All resources are tagged with:

```typescript
{
  environment: "staging" | "production",
  managed_by: "cdktf",
  project: "dcmco-website",
  component: "storage" | "cdn" | "functions"
}
```

## State Management

**Current**: Local state files
- Location: `infrastructure/terraform.*.tfstate`
- Gitignored for security

**Future**: Remote state (recommended for production)
- Google Cloud Storage backend
- State locking with Cloud Storage
- Team collaboration support

**Migration path**:
```typescript
// In cdktf.json or via backend block
{
  "terraformBackend": {
    "gcs": {
      "bucket": "dcmco-terraform-state",
      "prefix": "website"
    }
  }
}
```

## Security Considerations

1. **Secrets Management**:
   - `.env` is gitignored
   - Use `.env.example` as template
   - Never commit credentials

2. **IAM Permissions**:
   - Bucket uses uniform bucket-level access
   - Public access limited to object viewer role
   - Functions will use least-privilege IAM

3. **State Files**:
   - Local state files gitignored
   - Contains sensitive data
   - Backup regularly

4. **HTTPS Only**:
   - Storage URLs use HTTPS
   - Future CDN will enforce HTTPS
   - HSTS headers recommended

## Monitoring & Observability (Future)

Planned monitoring setup:

- **Cloud Monitoring**: Resource metrics and alerts
- **Cloud Logging**: Access logs and error tracking
- **Uptime Checks**: Website availability monitoring
- **Custom Dashboards**: Performance and usage metrics

## Cost Optimization

Current costs are minimal (staging):

- **GCS Storage**: ~$0.02/GB/month (AUSTRALIA-SOUTHEAST1)
- **Network Egress**: First 1GB free, then ~$0.19/GB
- **Operations**: Negligible for static site

Future production costs:

- **Cloud CDN**: ~$0.08/GB (much cheaper than direct GCS egress)
- **Load Balancer**: ~$18/month base + traffic
- **SSL Cert**: Free (Google-managed)
- **Cloud Functions**: Free tier: 2M invocations/month

## Disaster Recovery

**Backup Strategy**:
1. Source code in Git (primary backup)
2. Build artifacts can be regenerated
3. Terraform state backed up locally
4. Future: Remote state with versioning

**Recovery Steps**:
1. Clone repository
2. Run `pnpm install` in infrastructure/
3. Copy `.env.example` to `.env`
4. Run `pnpm run deploy:auto`
5. Build and upload Next.js site

**RTO** (Recovery Time Objective): ~15 minutes
**RPO** (Recovery Point Objective): Last Git commit

## Next Steps

1. ✅ Set up base infrastructure with StorageStack
2. ✅ Deploy to staging environment
3. ⏳ Purchase domain (dcmco.com.au)
4. ⏳ Implement CdnStack for custom domain
5. ⏳ Set up Cloud DNS
6. ⏳ Configure production environment
7. ⏳ Implement FunctionsStack for forms
8. ⏳ Set up monitoring and alerts
9. ⏳ Configure remote state backend
10. ⏳ Implement CI/CD pipeline
