# DCMCO Infrastructure

Infrastructure as Code for the DCMCO website using CDKTF (Cloud Development Kit for Terraform) and Google Cloud Platform.

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **pnpm**: v8.0.0 or higher
- **Terraform**: v1.0.0 or higher
- **CDKTF CLI**: v0.20.0 or higher
- **GCP CLI**: Authenticated with proper permissions

## Installation

### 1. Install CDKTF CLI globally

```bash
npm install -g cdktf-cli@^0.20.0
```

### 2. Install Terraform

```bash
# macOS
brew install terraform

# Or download from https://terraform.io
```

### 3. Install project dependencies

```bash
cd infrastructure
pnpm install
```

### 4. Configure environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 5. Authenticate with GCP

```bash
gcloud auth application-default login
gcloud config set project dcmco-prod-2026
```

## Configuration

Edit `.env` file with your settings:

```bash
GCP_PROJECT_ID=dcmco-prod-2026
GCP_REGION=australia-southeast1
GCP_ZONE=australia-southeast1-a
GCS_BUCKET_NAME=dcmco-website-prod
GCS_BUCKET_LOCATION=AUSTRALIA-SOUTHEAST1
ENVIRONMENT=production
```

## Usage

### Generate Terraform Configuration

```bash
pnpm get          # Download provider bindings
pnpm synth        # Generate Terraform JSON
```

### Plan Infrastructure Changes

```bash
pnpm plan         # Show what will be created/changed
pnpm diff         # Show differences
```

### Deploy Infrastructure

```bash
pnpm deploy       # Deploy with confirmation prompt
pnpm deploy:auto  # Deploy without confirmation (CI/CD)
```

### Destroy Infrastructure

```bash
pnpm destroy      # Destroy with confirmation prompt
pnpm destroy:auto # Destroy without confirmation
```

## Infrastructure Components

### GCS Bucket

- **Purpose**: Static website hosting
- **Location**: Australia Southeast 1
- **Access**: Public read access for website content
- **Features**:
  - CORS enabled for cross-origin requests
  - Custom 404 page support
  - Labeled for easy identification

### Outputs

After deployment, you'll get:

- `bucket-name`: The name of the created GCS bucket
- `bucket-url`: The base URL of the bucket
- `website-url`: Direct URL to access the website

## Project Structure

```
infrastructure/
├── cdktf.json              # CDKTF configuration
├── package.json            # Node dependencies
├── tsconfig.json           # TypeScript configuration
├── main.ts                 # Main infrastructure stack
├── .env.example            # Environment variables template
├── .env                    # Your environment variables (git-ignored)
├── .gitignore              # Git ignore rules
├── cdktf.out/              # Generated Terraform (git-ignored)
└── README.md               # This file
```

## Deploying Website Content

After infrastructure is deployed, upload your built Next.js site:

```bash
# Build the Next.js site
cd ..
pnpm build

# Upload to GCS bucket
gsutil -m rsync -r -d out/ gs://dcmco-website-prod/

# Set cache control for static assets
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000" \
  "gs://dcmco-website-prod/_next/**"
```

## Troubleshooting

### Authentication Issues

```bash
# Re-authenticate with GCP
gcloud auth application-default login

# Verify authentication
gcloud auth list
gcloud config get-value project
```

### Provider Download Issues

```bash
# Clear cache and re-download
rm -rf .gen imports
pnpm get
```

### State Issues

```bash
# View current state
cd cdktf.out/stacks/dcmco-website
terraform state list

# If state is corrupted, you may need to re-import
terraform import google_storage_bucket.website-bucket dcmco-website-prod
```

## CI/CD Integration

For automated deployments:

```yaml
# Example GitHub Actions workflow
- name: Deploy Infrastructure
  run: |
    cd infrastructure
    pnpm install
    pnpm deploy:auto
  env:
    GOOGLE_APPLICATION_CREDENTIALS: ${{ secrets.GCP_SA_KEY }}
    GCP_PROJECT_ID: dcmco-prod-2026
```

## Security Notes

- Never commit `.env` file
- Never commit Terraform state files
- Use service accounts for CI/CD
- Enable bucket versioning for production
- Consider Cloud CDN for better performance
- Implement Cloud Armor for DDoS protection

## Resources

- [CDKTF Documentation](https://developer.hashicorp.com/terraform/cdktf)
- [GCP Storage Documentation](https://cloud.google.com/storage/docs)
- [Terraform GCP Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)

## License

MIT License - Copyright (c) 2026 DCM CO
