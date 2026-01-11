# DCMCO Website Infrastructure

Enterprise-grade Infrastructure as Code for the DCMCO website using CDKTF (Cloud Development Kit for Terraform) and Google Cloud Platform.

This infrastructure uses a modular, TypeScript-based approach to manage cloud resources with strong typing, reusable components, and comprehensive documentation.

## ⚠️ Important 2026 Update: Manual Provider Generation

**As of December 2025**, the CDKTF team sunset prebuilt provider packages. The `@cdktf/provider-google` npm package is no longer maintained.

**What this means:**
- You must generate provider bindings locally using `cdktf get`
- Bindings are generated from the Terraform registry into the `.gen/` directory
- The `.gen/` directory is gitignored and must be regenerated in each environment
- CI/CD workflows cache the `.gen/` directory for performance

**Migration Required:**
```bash
# Remove old prebuilt provider (if present)
pnpm remove @cdktf/provider-google

# Generate bindings locally
pnpm run get
```

See [Provider Generation](#provider-generation-2026-update) for detailed instructions.

## Table of Contents

- [Important 2026 Update: Manual Provider Generation](#️-important-2026-update-manual-provider-generation)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Provider Generation (2026 Update)](#provider-generation-2026-update)
- [Configuration](#configuration)
- [Available Commands](#available-commands)
- [Project Structure](#project-structure)
- [Deployed Infrastructure](#deployed-infrastructure)
- [Working with Stacks](#working-with-stacks)
- [Environment Management](#environment-management)
- [CI/CD Pipelines](#cicd-pipelines)
- [Deploying Website Content](#deploying-website-content)
- [Troubleshooting](#troubleshooting)
- [Safety & Best Practices](#safety--best-practices)
- [Resources](#resources)

## Prerequisites

### Required Software

- **Node.js**: v18.0.0 or higher ([Download](https://nodejs.org/))
- **pnpm**: v8.0.0 or higher (`npm install -g pnpm`)
- **Terraform**: v1.0.0 or higher ([Installation Guide](https://terraform.io))
- **CDKTF CLI**: v0.20.0 or higher (`pnpm install -g cdktf-cli@^0.20.0`)
- **GCP CLI**: Authenticated with proper permissions ([Installation Guide](https://cloud.google.com/sdk/docs/install))

### GCP Requirements

- **GCP Project**: An active Google Cloud project (e.g., `dcmco-prod-2026`)
- **Required APIs**: Enable these APIs in your project:
  - Cloud Storage API
  - Cloud Resource Manager API
  - (Future: Cloud CDN API, Cloud Functions API)
- **Permissions**: Your account needs these roles:
  - `roles/storage.admin` - Manage GCS buckets
  - `roles/iam.securityAdmin` - Manage IAM bindings
  - (Future: Additional roles for CDN and Functions)

### Verify Prerequisites

```bash
# Check versions
node --version        # Should be v18+
pnpm --version        # Should be v8+
terraform --version   # Should be v1.0+
cdktf --version      # Should be v0.20+
gcloud --version     # Should be installed

# Verify GCP authentication
gcloud auth list
gcloud config get-value project
```

## Getting Started

### 1. Install CDKTF CLI Globally

```bash
pnpm install -g cdktf-cli@^0.20.0
```

### 2. Install Terraform

```bash
# macOS (using Homebrew)
brew install terraform

# Ubuntu/Debian
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform

# Windows (using Chocolatey)
choco install terraform

# Or download from https://terraform.io
```

### 3. Install Project Dependencies

```bash
cd infrastructure
pnpm install
```

This will install:
- `cdktf` - Cloud Development Kit for Terraform
- `constructs` - Infrastructure component framework
- `dotenv` - Environment variable management
- TypeScript and type definitions

**Note**: The old `@cdktf/provider-google` package has been removed. Provider bindings are now generated locally.

### 4. Generate Provider Bindings

```bash
pnpm run get
```

This runs `cdktf get` which:
1. Reads `cdktf.json` to see which providers you need
2. Downloads the Google Terraform provider from the registry
3. Generates TypeScript bindings in the `.gen/` directory

**First-time setup may take 2-3 minutes.**

### 5. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 6. Authenticate with GCP

```bash
# Login to GCP
gcloud auth application-default login

# Set your project
gcloud config set project dcmco-prod-2026

# Verify authentication
gcloud auth list
```

## Provider Generation (2026 Update)

### Why Manual Provider Generation?

In December 2025, the CDKTF team sunset prebuilt provider packages. Previously, you could install `@cdktf/provider-google` from npm. Now, you must generate provider bindings locally from the Terraform registry.

**Benefits of this change:**
- Always up-to-date with latest Terraform providers
- Smaller npm package sizes
- More control over provider versions
- Consistent with Terraform workflows

### How It Works

**Old Way (Pre-2026):**
```typescript
// Install from npm
import { GoogleProvider } from '@cdktf/provider-google';
import { StorageBucket } from '@cdktf/provider-google/lib/storage-bucket';
```

**New Way (2026+):**
```typescript
// Generate locally with cdktf get
import { GoogleProvider } from './.gen/providers/google/provider';
import { StorageBucket } from './.gen/providers/google/storage-bucket';
```

### Configuration

Provider configuration is defined in `cdktf.json`:

```json
{
  "terraformProviders": [
    "google@~>5.0"
  ]
}
```

### Generating Bindings

**Command:**
```bash
pnpm run get
# or
cdktf get
```

**What happens:**
1. CDKTF reads `cdktf.json`
2. Downloads `hashicorp/google` provider from Terraform registry
3. Generates TypeScript bindings
4. Outputs to `.gen/providers/google/`

**Directory structure:**
```
infrastructure/
├── .gen/                          # Generated (gitignored)
│   └── providers/
│       └── google/
│           ├── provider/          # GoogleProvider
│           ├── storage-bucket/    # StorageBucket resource
│           ├── cloudfunctions2-function/
│           └── ...hundreds of other resources
```

### CI/CD Caching

Since `.gen/` is gitignored, CI/CD workflows must regenerate bindings on every run. To optimize performance, all workflows cache the `.gen/` directory:

```yaml
- name: Cache CDKTF provider bindings
  uses: actions/cache@v4
  with:
    path: infrastructure/.gen
    key: ${{ runner.os }}-cdktf-gen-${{ hashFiles('infrastructure/cdktf.json', 'infrastructure/package.json') }}
```

**Cache invalidation:** The cache automatically rebuilds when:
- `cdktf.json` changes (provider version update)
- `package.json` changes (CDKTF version update)
- OS changes (different runner)

### Migration from Prebuilt Providers

If you have an existing codebase using `@cdktf/provider-google`:

**Step 1: Remove prebuilt package**
```bash
pnpm remove @cdktf/provider-google
```

**Step 2: Update imports in your code**
```typescript
// Before
import { GoogleProvider } from '@cdktf/provider-google';
import { StorageBucket } from '@cdktf/provider-google/lib/storage-bucket';

// After
import { GoogleProvider } from './.gen/providers/google/provider';
import { StorageBucket } from './.gen/providers/google/storage-bucket';
```

**Step 3: Generate bindings**
```bash
pnpm run get
```

**Step 4: Verify**
```bash
pnpm run typecheck
pnpm run synth
```

### Troubleshooting Provider Generation

**Error: `Cannot find module './.gen/providers/google'`**

Solution: Generate bindings first
```bash
pnpm run get
```

**Error: Provider generation is slow**

This is normal on first run (2-3 minutes). Subsequent runs use cache. In CI/CD, the cache makes it much faster.

**Error: `Error downloading provider`**

Check your internet connection and Terraform registry access. Try clearing cache:
```bash
rm -rf .gen .terraform ~/.terraform.d/plugin-cache/
pnpm run get
```

## Configuration

### Environment Variables

The infrastructure uses environment variables for configuration. See [ENV_SETUP.md](./ENV_SETUP.md) for a comprehensive guide.

#### Quick Setup

```bash
# 1. Copy the example file
cp .env.example .env

# 2. Edit with your values
nano .env

# 3. Verify configuration
pnpm run verify
```

#### Required Variables

- `GCP_PROJECT_ID`: Your Google Cloud project ID
- `GCS_BUCKET_NAME`: Unique bucket name for your website

#### Optional Variables (with defaults)

- `GCP_REGION`: Region for resources (default: `us-central1`)
- `ENVIRONMENT`: Environment name (default: `staging`)
- `GCS_BUCKET_LOCATION`: Bucket location (default: `US`)
- `GCP_ZONE`: Specific zone (optional)
- `DOMAIN_NAME`: Custom domain (optional)

#### Example Configuration

```bash
# GCP Configuration
GCP_PROJECT_ID=your-project-id
GCP_REGION=australia-southeast1
GCP_ZONE=australia-southeast1-a

# Environment
ENVIRONMENT=staging

# GCS Bucket Configuration
GCS_BUCKET_NAME=your-project-website-staging
GCS_BUCKET_LOCATION=AUSTRALIA-SOUTHEAST1

# Optional: Domain (for production)
# DOMAIN_NAME=example.com
```

### Environment Files

- **`.env`**: Your actual configuration (git-ignored, never commit)
- **`.env.example`**: Template with placeholders and documentation
- **`.env.staging.example`**: Pre-configured staging template
- **`.env.production.example`**: Pre-configured production template
- **`ENV_SETUP.md`**: Comprehensive environment variable guide

### Configuration Validation

The infrastructure includes automatic validation:

```bash
# Run full verification including config validation
pnpm run verify

# The config module will:
# ✓ Check required variables are set
# ✓ Validate variable formats
# ✓ Apply defaults for optional variables
# ✓ Print configuration summary
```

### Switching Environments

#### Method 1: Use environment-specific templates

```bash
# Copy staging template
cp .env.staging.example .env
# Edit with your staging values
pnpm run deploy

# Copy production template
cp .env.production.example .env
# Edit with your production values
pnpm run deploy
```

#### Method 2: Maintain separate .env files

```bash
# Create environment-specific configs
cp .env.example .env.staging
cp .env.example .env.production

# Edit each with appropriate values
# ...

# Switch environments
cp .env.staging .env  # For staging
cp .env.production .env  # For production
```

#### Method 3: Override via environment variables

```bash
# Temporarily override for a single command
GCP_PROJECT_ID=other-project pnpm run synth
```

### Configuration in Code

Environment variables are loaded and validated in [config.ts](infrastructure/config.ts):

```typescript
// Load configuration with validation
import { loadEnvironmentConfig, getStorageStackConfig } from "./config";

const envConfig = loadEnvironmentConfig();
const config = getStorageStackConfig(envConfig);

// Use in stacks
new StorageStack(app, "storage", config);
```

See [ENV_SETUP.md](./ENV_SETUP.md) for detailed documentation on:
- All available variables
- Validation rules
- Best practices
- Troubleshooting
- Adding new variables

## Available Commands

All commands should be run from the `infrastructure/` directory.

### Verification & Testing

```bash
# Run full verification suite
pnpm run verify

# Type checking only
pnpm run typecheck

# Type checking in watch mode
pnpm run typecheck:watch

# Lint (type check + validation)
pnpm run lint

# Type check + synth
pnpm run validate

# Type check + diff
pnpm run check
```

**Quick Start**: Run `pnpm run verify` before any deployment to check all prerequisites and validate your configuration. See [VERIFICATION_CHECKLIST.md](./VERIFICATION_CHECKLIST.md) for details.

### Development Commands

```bash
# Install dependencies
pnpm install

# Download provider bindings
pnpm run get

# Build TypeScript to JavaScript
pnpm run build

# Generate Terraform configuration
pnpm run synth
```

### Planning & Previewing

```bash
# Preview what will be created/changed (detailed)
pnpm run plan

# Show differences from current state
pnpm run diff
```

### Deployment

```bash
# Deploy with interactive confirmation
pnpm run deploy

# Deploy automatically (no confirmation - use for CI/CD)
pnpm run deploy:auto
```

### Destruction

```bash
# Destroy infrastructure with confirmation
pnpm run destroy

# Destroy automatically (DANGEROUS - no confirmation)
pnpm run destroy:auto
```

### Complete Workflow Example

```bash
# 1. Install and setup
pnpm install
pnpm run get

# 2. Verify everything is configured correctly
pnpm run verify

# 3. Build and preview
pnpm run build
pnpm run synth
pnpm run plan

# 4. Deploy
pnpm run deploy

# 5. (Later) Update and redeploy
# ... make changes to infrastructure code ...
pnpm run typecheck
pnpm run build
pnpm run check      # type check + diff
pnpm run deploy
```

## Project Structure

```
infrastructure/
├── main.ts                       # Main entry point - instantiates stacks
├── stacks/                       # Modular stack definitions
│   ├── base-stack.ts             # Abstract base class for all stacks
│   ├── storage-stack.ts          # GCS bucket for static website hosting
│   ├── index.ts                  # Central export point for stacks
│   └── README.md                 # Stack development documentation
├── cdktf.json                    # CDKTF project configuration
├── tsconfig.json                 # TypeScript compiler configuration
├── package.json                  # Node.js dependencies and scripts
├── .env                          # Environment variables (git-ignored)
├── .env.example                  # Environment template (committed)
├── .gitignore                    # Git ignore rules
├── README.md                     # This file
├── ARCHITECTURE.md               # Architecture documentation
├── STAGING.md                    # Staging deployment guide
├── VERIFICATION_CHECKLIST.md     # Verification and testing guide
├── QUICK_START.md                # Quick reference for common tasks
├── verify.sh                     # Automated verification script
├── setup.sh                      # Automated setup script
├── cdktf.out/                    # Generated Terraform (git-ignored)
│   └── stacks/
│       └── dcmco-website-storage/
│           └── cdk.tf.json       # Generated Terraform JSON
├── .terraform/                   # Terraform plugins (git-ignored)
├── .gen/                         # Generated provider bindings (git-ignored)
├── imports/                      # Provider TypeScript bindings (git-ignored)
└── terraform.*.tfstate           # Terraform state files (git-ignored)
```

### Key Files Explained

- **`main.ts`**: Entry point that loads configuration and creates stacks
- **`stacks/base-stack.ts`**: Base class with GCP provider and helper methods
- **`stacks/storage-stack.ts`**: Creates GCS bucket for static hosting
- **`cdktf.json`**: Configures CDKTF project settings and providers
- **`.env`**: Your environment-specific configuration (never commit!)
- **`cdktf.out/`**: Generated Terraform configuration files

## Deployed Infrastructure

### Current Stacks

#### StorageStack

Creates a Google Cloud Storage bucket for static website hosting.

**Resources Created:**
- `google_storage_bucket` - GCS bucket with website configuration
- `google_storage_bucket_iam_binding` - Public read access

**Features:**
- Website mode (index.html, 404.html support)
- CORS enabled for cross-origin requests
- Uniform bucket-level access
- Automatic resource labeling
- Public read access for website content

**Outputs:**
- `bucket-name` - Name of the created bucket
- `bucket-url` - GCS URL (gs://bucket-name)
- `website-url` - Public HTTPS URL to access the site

#### FunctionsStack

Creates Cloud Functions (Gen 2) for serverless backend features.

**Resources Created:**
- `google_storage_bucket` - GCS bucket for function source code
- `google_secret_manager_secret` - SendGrid API key storage
- `google_cloudfunctions2_function` - Contact form handler
- `google_cloudfunctions2_function_iam_member` - Public invoker access
- `google_secret_manager_secret_iam_member` - Secret accessor permissions

**Features:**
- Contact form email delivery via SendGrid
- CORS protection with configurable origins
- Spam protection (honeypot, email validation)
- Automatic scaling (0-10 instances)
- Secure secret management
- Comprehensive request validation

**Outputs:**
- `contact-form-url` - HTTPS URL of the deployed function
- `contact-form-name` - Function name
- `functions-bucket-name` - Source code bucket name
- `sendgrid-secret-id` - Secret Manager secret ID

**Setup:**

```bash
# 1. Build the function
bash scripts/build-function.sh

# 2. Configure SendGrid API key
echo "SENDGRID_API_KEY=SG.your-key-here" >> .env

# 3. Deploy
pnpm run deploy
```

See [docs/FUNCTIONS_DEPLOYMENT.md](./docs/FUNCTIONS_DEPLOYMENT.md) for detailed setup guide.

### Future Stacks (Planned)

- **CdnStack**: Cloud CDN with Load Balancer for custom domain and global delivery

See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete architecture documentation.

## Working with Stacks

### Understanding the Stack Architecture

All stacks extend the `BaseStack` class which provides:
- GCP provider configuration
- Helper methods for consistent labeling
- Helper methods for standardized naming
- TypeScript type safety

### Creating a New Stack

1. **Create the stack file** in `stacks/`:

```typescript
// stacks/my-stack.ts
import { Construct } from "constructs";
import { TerraformOutput } from "cdktf";
import { BaseStack, BaseStackConfig } from "./base-stack";

export interface MyStackConfig extends BaseStackConfig {
  customProperty: string;
}

export class MyStack extends BaseStack {
  constructor(scope: Construct, id: string, config: MyStackConfig) {
    super(scope, id, config);

    // Add your GCP resources here
    // Provider is already configured via BaseStack
    // Use this.getLabels() for consistent labeling
    // Use this.getResourceName("name") for naming
  }
}
```

2. **Export from `stacks/index.ts`**:

```typescript
export { MyStack, MyStackConfig } from "./my-stack";
```

3. **Use in `main.ts`**:

```typescript
import { MyStack } from "./stacks";

new MyStack(app, "my-stack", {
  ...config,
  customProperty: "value",
});
```

See [stacks/README.md](./stacks/README.md) for detailed stack development guide.

## Environment Management

### Staging Environment

Current configuration for testing and development:

```bash
ENVIRONMENT=staging
GCS_BUCKET_NAME=dcmco-website-staging
```

**Access URL**: https://storage.googleapis.com/dcmco-website-staging/index.html

**Purpose**:
- Test infrastructure changes
- Preview website updates
- Validate deployments before production

### Production Environment (Future)

Configuration for live website:

```bash
ENVIRONMENT=production
GCS_BUCKET_NAME=dcmco-website-prod
DOMAIN_NAME=dcmco.com.au  # When domain is purchased
```

**Access URL**: https://dcmco.com.au (after CDN setup)

### Switching Environments

**Option 1: Multiple .env files**

```bash
# Create environment-specific files
cp .env.example .env.staging
cp .env.example .env.production

# Edit each with appropriate values
# ...

# Switch environments
cp .env.staging .env
pnpm run deploy

cp .env.production .env
pnpm run deploy
```

**Option 2: Environment variables**

```bash
# Override .env values
ENVIRONMENT=production GCS_BUCKET_NAME=dcmco-website-prod pnpm run deploy
```

## Deploying Website Content

After infrastructure is deployed, build and upload your Next.js website:

### 1. Build the Website

```bash
# From project root
cd ..
pnpm build
```

This creates an `out/` directory with static HTML files.

### 2. Upload to GCS Bucket

```bash
# Sync to staging
gsutil -m rsync -r -d out/ gs://dcmco-website-staging/

# Or to production
gsutil -m rsync -r -d out/ gs://dcmco-website-prod/
```

The `-d` flag deletes files in the bucket that aren't in `out/`.

### 3. Set Cache Headers (Optional but Recommended)

```bash
# Set long cache for static assets
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
  "gs://dcmco-website-staging/_next/static/**"

# Set short cache for HTML pages
gsutil -m setmeta -h "Cache-Control:public, max-age=3600" \
  "gs://dcmco-website-staging/*.html"
```

### 4. Verify Deployment

Visit the website URL from the Terraform outputs:

```bash
# Get the URL
cd infrastructure
pnpm run synth
# Check the website-url output
```

## Troubleshooting

### Authentication Issues

**Problem**: "Error: google: could not find default credentials"

**Solution**:
```bash
# Re-authenticate with GCP
gcloud auth application-default login

# Verify authentication
gcloud auth list
gcloud config get-value project

# Check credentials file exists
ls ~/.config/gcloud/application_default_credentials.json
```

### Provider Download Issues

**Problem**: "Error downloading provider" or "Error generating bindings"

**Solution**:
```bash
# Clear cached providers and bindings
rm -rf .gen imports .terraform

# Re-download
pnpm run get

# If still failing, try clearing global cache
rm -rf ~/.terraform.d/plugin-cache/
```

### State Lock Issues

**Problem**: "Error acquiring the state lock"

**Solution**:
```bash
# Wait for other operations to complete, or if stuck:
cd cdktf.out/stacks/dcmco-website-storage
terraform force-unlock LOCK_ID
```

### Bucket Already Exists

**Problem**: "Error creating bucket: googleapi: Error 409: You already own this bucket"

**Solution**:
```bash
# Import existing bucket into state
cd cdktf.out/stacks/dcmco-website-storage
terraform import google_storage_bucket.website-bucket dcmco-website-staging

# Or use a different bucket name in .env
```

### State Drift

**Problem**: "Actual state differs from expected"

**Solution**:
```bash
# View current state
cd cdktf.out/stacks/dcmco-website-storage
terraform state list
terraform state show google_storage_bucket.website-bucket

# Refresh state from GCP
terraform refresh

# Apply to fix drift
cd ../../..
pnpm run deploy
```

### Build Errors

**Problem**: TypeScript compilation errors

**Solution**:
```bash
# Clean build
rm -rf *.js *.d.ts stacks/*.js stacks/*.d.ts

# Rebuild
pnpm run build

# Check for type errors
pnpm exec tsc --noEmit
```

### Permission Denied

**Problem**: "Error 403: ... does not have permission"

**Solution**:
```bash
# Check your current roles
gcloud projects get-iam-policy dcmco-prod-2026 \
  --flatten="bindings[].members" \
  --filter="bindings.members:user:YOUR_EMAIL"

# You need at minimum:
# - roles/storage.admin
# - roles/iam.securityAdmin

# Contact project owner to grant permissions
```

## Safety & Best Practices

### State File Management

⚠️ **CRITICAL**: Terraform state files contain sensitive information

- **Never commit** `.tfstate` files to git (they're git-ignored)
- **Backup** state files regularly
- **Future**: Use remote state (GCS backend) for production

### Environment Variables

⚠️ **NEVER commit** `.env` file to git

- Contains project IDs and configuration
- Use `.env.example` as template
- Each developer maintains their own `.env`

### Deployment Safety

✅ **Always run `plan` before `deploy`**

```bash
# Safe workflow
pnpm run plan    # Review changes
pnpm run deploy  # Apply after review
```

❌ **Avoid `deploy:auto` unless necessary**

```bash
# Only use in CI/CD or when absolutely sure
pnpm run deploy:auto
```

### Resource Naming

- Use environment prefixes (staging-, prod-)
- GCS bucket names must be globally unique
- Follow naming convention: `dcmco-website-{env}-{resource}`

### Access Control

- Use least-privilege IAM roles
- Never make buckets public unless necessary
- Review IAM bindings regularly
- Use service accounts for automation

### Cost Management

- Delete unused staging resources
- Monitor GCS storage usage
- Set lifecycle policies for old objects
- Review egress costs monthly

### Disaster Recovery

**Backup Strategy**:
1. Infrastructure code in Git (source of truth)
2. State files backed up locally
3. (Future) Remote state with versioning

**Recovery Process**:
1. Clone repository
2. Restore `.env` from backup
3. Run `pnpm run deploy:auto`
4. Rebuild and upload website content

## CI/CD Pipelines

This project includes three enterprise-grade GitHub Actions workflows following 2026 best practices:

### 1. PR Diff Workflow ([`.github/workflows/cdktf-pr-diff.yml`](../.github/workflows/cdktf-pr-diff.yml))

**Trigger**: Pull requests modifying `infrastructure/`

**Purpose**: Show infrastructure changes as PR comments for review

**Features**:
- ✅ Workload Identity Federation (OIDC) authentication
- ✅ Automatic provider binding generation with caching
- ✅ Posts diff as PR comment
- ✅ Detects "no changes" scenarios
- ✅ Uploads diff artifacts for auditing

### 2. Staging Deployment ([`.github/workflows/cdktf-deploy-staging.yml`](../.github/workflows/cdktf-deploy-staging.yml))

**Trigger**: Merge to `main` branch

**Purpose**: Automatically deploy to staging environment

**Features**:
- ✅ Automatic deployment on merge
- ✅ Secret Manager integration for sensitive values
- ✅ Infrastructure verification step
- ✅ Deployment artifact retention (30 days)
- ✅ Concurrency control (no parallel deploys)

**Environment**: `staging` (no approval required)

### 3. Production Deployment ([`.github/workflows/cdktf-deploy-production.yml`](../.github/workflows/cdktf-deploy-production.yml))

**Trigger**: Manual workflow dispatch only

**Purpose**: Deploy to production with strict controls

**Safety Features**:
- 🔒 Requires typing "DEPLOY TO PRODUCTION" to confirm
- 🔒 Requires deployment reason
- 🔒 Requires GitHub Environment approval gate
- 🔒 Shows deployment plan before applying
- 🔒 Creates deployment record (retained 365 days)
- 🔒 Never cancels in-progress deployments

**Environment**: `production` (requires approval from designated reviewers)

### Security Best Practices (2026)

All workflows implement:

✅ **Workload Identity Federation (OIDC)** - No long-lived service account keys
✅ **Least-privilege permissions** - `id-token: write`, `contents: read` only
✅ **Pinned action versions** - Full commit SHAs, not mutable tags
✅ **Manual provider generation** - Post-Dec 2025 CDKTF requirement
✅ **State management** - GCS remote backend with locking
✅ **Caching** - pnpm store and `.gen/` directory cached
✅ **Concurrency control** - Prevents simultaneous deployments

### Setup Requirements

**1. Configure Workload Identity Federation in GCP**

```bash
# Create Workload Identity Pool
gcloud iam workload-identity-pools create github-actions \
  --location=global \
  --display-name="GitHub Actions Pool"

# Create OIDC provider
gcloud iam workload-identity-pools providers create-oidc github-oidc \
  --location=global \
  --workload-identity-pool=github-actions \
  --issuer-uri=https://token.actions.githubusercontent.com \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository_owner=='your-org'"
```

**2. Create Service Account**

```bash
# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# Grant permissions
gcloud projects add-iam-policy-binding dcmco-prod-2026 \
  --member="serviceAccount:github-actions@dcmco-prod-2026.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# Allow GitHub to impersonate
gcloud iam service-accounts add-iam-policy-binding \
  github-actions@dcmco-prod-2026.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions/attribute.repository/YOUR_ORG/YOUR_REPO"
```

**3. Configure GitHub Environment**

1. Go to your repository Settings > Environments
2. Create `staging` environment (no protection rules)
3. Create `production` environment with:
   - Required reviewers: Add team members who can approve production deploys
   - Wait timer: Optional 5-minute delay

**4. Add GitHub Secrets**

Required secrets:
- `SENDGRID_API_KEY_STAGING` - SendGrid key for staging
- `SENDGRID_API_KEY_PRODUCTION` - SendGrid key for production

**5. Update Workflow Variables**

Edit the workflow files to update:
- `WORKLOAD_IDENTITY_PROVIDER`: Your pool provider path
- `SERVICE_ACCOUNT`: Your service account email
- `GCP_PROJECT_ID`: Your GCP project ID

### Workflow Outputs

Each workflow provides:
- Deployment status summary
- Links to deployed resources
- Artifact uploads for debugging
- Step-by-step execution logs

See the workflow files for complete implementation details.

## Resources

### Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Complete architecture overview
- [STAGING.md](./STAGING.md) - Staging deployment guide
- [stacks/README.md](./stacks/README.md) - Stack development guide
- [VERIFICATION_CHECKLIST.md](./VERIFICATION_CHECKLIST.md) - Comprehensive verification checklist and Definition of Done
- [QUICK_START.md](./QUICK_START.md) - Quick reference guide for common tasks
- [ENV_SETUP.md](./ENV_SETUP.md) - Environment variable configuration guide

### External Resources

- [CDKTF Documentation](https://developer.hashicorp.com/terraform/cdktf)
- [CDKTF TypeScript Guide](https://developer.hashicorp.com/terraform/cdktf/create-and-deploy/typescript)
- [GCP Storage Documentation](https://cloud.google.com/storage/docs)
- [Terraform GCP Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [GCS Static Website Hosting](https://cloud.google.com/storage/docs/hosting-static-website)

### Support

- **Issues**: Report bugs or request features on GitHub
- **Questions**: Check ARCHITECTURE.md and stacks/README.md first
- **GCP Billing**: Monitor costs in [GCP Console](https://console.cloud.google.com/billing)

## License

MIT License - Copyright (c) 2026 DCM CO
