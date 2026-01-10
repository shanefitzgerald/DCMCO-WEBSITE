# DCMCO Website Infrastructure

Infrastructure as Code for the DCMCO website using CDKTF (Cloud Development Kit for Terraform) and Google Cloud Platform.

This infrastructure uses a modular, TypeScript-based approach to manage cloud resources with strong typing, reusable components, and comprehensive documentation.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Available Commands](#available-commands)
- [Project Structure](#project-structure)
- [Deployed Infrastructure](#deployed-infrastructure)
- [Working with Stacks](#working-with-stacks)
- [Environment Management](#environment-management)
- [Deploying Website Content](#deploying-website-content)
- [Troubleshooting](#troubleshooting)
- [Safety & Best Practices](#safety--best-practices)
- [CI/CD Integration](#cicd-integration)
- [Resources](#resources)

## Prerequisites

### Required Software

- **Node.js**: v18.0.0 or higher ([Download](https://nodejs.org/))
- **pnpm**: v8.0.0 or higher (`npm install -g pnpm`)
- **Terraform**: v1.0.0 or higher ([Installation Guide](https://terraform.io))
- **CDKTF CLI**: v0.20.0 or higher (`npm install -g cdktf-cli@^0.20.0`)
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

## Installation

### 1. Install CDKTF CLI Globally

```bash
npm install -g cdktf-cli@^0.20.0
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
- `@cdktf/provider-google` - GCP provider bindings
- `constructs` - Infrastructure component framework
- `dotenv` - Environment variable management
- TypeScript and type definitions

### 4. Download GCP Provider Bindings

```bash
pnpm run get
```

This downloads the Terraform Google provider and generates TypeScript bindings in the `imports/` directory.

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

## Configuration

### Environment Variables

Edit the `.env` file with your settings:

```bash
# GCP Configuration
GCP_PROJECT_ID=dcmco-prod-2026              # Your GCP project ID
GCP_REGION=australia-southeast1              # Primary region
GCP_ZONE=australia-southeast1-a              # Primary zone

# GCS Bucket Configuration
GCS_BUCKET_NAME=dcmco-website-staging        # Bucket name (must be globally unique)
GCS_BUCKET_LOCATION=AUSTRALIA-SOUTHEAST1     # Bucket location

# Domain Configuration (optional - for future CDN setup)
# DOMAIN_NAME=dcmco.com.au                   # Uncomment when domain is ready

# Environment
ENVIRONMENT=staging                          # staging or production
```

### Environment Files

- **`.env`**: Your actual configuration (git-ignored, never commit this)
- **`.env.example`**: Template with documentation (committed to git)

### Changing Environments

To switch between staging and production:

```bash
# For staging
export ENVIRONMENT=staging
export GCS_BUCKET_NAME=dcmco-website-staging

# For production
export ENVIRONMENT=production
export GCS_BUCKET_NAME=dcmco-website-prod
```

Or create separate `.env.staging` and `.env.production` files and copy as needed.

## Available Commands

All commands should be run from the `infrastructure/` directory.

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

# 2. Build and preview
pnpm run build
pnpm run synth
pnpm run plan

# 3. Deploy
pnpm run deploy

# 4. (Later) Update and redeploy
# ... make changes to infrastructure code ...
pnpm run build
pnpm run plan
pnpm run deploy
```

## Project Structure

```
infrastructure/
├── main.ts                 # Main entry point - instantiates stacks
├── stacks/                 # Modular stack definitions
│   ├── base-stack.ts       # Abstract base class for all stacks
│   ├── storage-stack.ts    # GCS bucket for static website hosting
│   ├── index.ts            # Central export point for stacks
│   └── README.md           # Stack development documentation
├── cdktf.json              # CDKTF project configuration
├── tsconfig.json           # TypeScript compiler configuration
├── package.json            # Node.js dependencies and scripts
├── .env                    # Environment variables (git-ignored)
├── .env.example            # Environment template (committed)
├── .gitignore              # Git ignore rules
├── README.md               # This file
├── ARCHITECTURE.md         # Architecture documentation
├── STAGING.md              # Staging deployment guide
├── setup.sh                # Automated setup script
├── cdktf.out/              # Generated Terraform (git-ignored)
│   └── stacks/
│       └── dcmco-website-storage/
│           └── cdk.tf.json # Generated Terraform JSON
├── .terraform/             # Terraform plugins (git-ignored)
├── .gen/                   # Generated provider bindings (git-ignored)
├── imports/                # Provider TypeScript bindings (git-ignored)
└── terraform.*.tfstate     # Terraform state files (git-ignored)
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

### Future Stacks (Planned)

- **CdnStack**: Cloud CDN with Load Balancer for custom domain and global delivery
- **FunctionsStack**: Cloud Functions for serverless backend features

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
npx tsc --noEmit
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

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy Infrastructure

on:
  push:
    branches: [main]
    paths:
      - 'infrastructure/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.6.0

      - name: Install CDKTF
        run: npm install -g cdktf-cli@^0.20.0

      - name: Authenticate to GCP
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Install dependencies
        run: |
          cd infrastructure
          pnpm install
          pnpm run get

      - name: Deploy infrastructure
        run: |
          cd infrastructure
          pnpm run deploy:auto
        env:
          GCP_PROJECT_ID: dcmco-prod-2026
          GCP_REGION: australia-southeast1
          ENVIRONMENT: production
          GCS_BUCKET_NAME: dcmco-website-prod
```

### Environment Secrets

Required secrets in GitHub:
- `GCP_SA_KEY` - Service account JSON key with required permissions

## Resources

### Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Complete architecture overview
- [STAGING.md](./STAGING.md) - Staging deployment guide
- [stacks/README.md](./stacks/README.md) - Stack development guide

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
