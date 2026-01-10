# Environment Variable Setup Guide

This guide explains how to set up and manage environment variables for the DCMCO CDKTF infrastructure.

## Quick Start

### First Time Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit .env with your values:**
   ```bash
   nano .env
   # or
   vim .env
   # or use your preferred editor
   ```

3. **Set required variables:**
   - `GCP_PROJECT_ID`: Your Google Cloud project ID
   - `GCS_BUCKET_NAME`: Unique bucket name for your website

4. **Verify configuration:**
   ```bash
   pnpm run verify
   ```

5. **Test synthesis:**
   ```bash
   pnpm run synth
   ```

## Required Variables

### GCP_PROJECT_ID
**Required:** Yes
**Description:** Your Google Cloud Platform project ID
**Example:** `dcmco-prod-2026`
**How to find:** Run `gcloud config get-value project` or check GCP Console

```bash
GCP_PROJECT_ID=your-project-id
```

### GCS_BUCKET_NAME
**Required:** Yes
**Description:** Name of the GCS bucket for static website hosting
**Example:** `dcmco-website-staging`
**Note:** Must be globally unique across all of GCS

```bash
GCS_BUCKET_NAME=your-unique-bucket-name
```

## Optional Variables with Defaults

### GCP_REGION
**Required:** No
**Default:** `us-central1`
**Description:** Primary GCP region for resources
**Common values:**
- `us-central1` - Iowa, USA
- `us-east1` - South Carolina, USA
- `europe-west1` - Belgium
- `asia-southeast1` - Singapore
- `australia-southeast1` - Sydney

```bash
GCP_REGION=australia-southeast1
```

### ENVIRONMENT
**Required:** No
**Default:** `staging`
**Description:** Environment name for resource labeling and naming
**Common values:** `development`, `staging`, `production`, `test`

```bash
ENVIRONMENT=staging
```

### GCS_BUCKET_LOCATION
**Required:** No
**Default:** `US`
**Description:** GCS bucket location (uppercase)
**Options:**
- Multi-region: `US`, `EU`, `ASIA`
- Regional: `AUSTRALIA-SOUTHEAST1`, `US-CENTRAL1`, etc.

```bash
GCS_BUCKET_LOCATION=AUSTRALIA-SOUTHEAST1
```

## Optional Variables

### GCP_ZONE
**Required:** No
**Default:** None
**Description:** Specific zone within the region
**Example:** `australia-southeast1-a`

```bash
GCP_ZONE=australia-southeast1-a
```

### DOMAIN_NAME
**Required:** No
**Default:** None
**Description:** Custom domain for your website
**Example:** `example.com` or `www.example.com`
**Note:** Leave empty for staging; set for production

```bash
# DOMAIN_NAME=example.com  # Uncomment when ready
```

## Advanced Configuration

### ENABLE_BUCKET_VERSIONING
**Required:** No
**Default:** `false`
**Description:** Enable object versioning in GCS bucket
**Values:** `true`, `false`

```bash
ENABLE_BUCKET_VERSIONING=true
```

### BUCKET_LIFECYCLE_DAYS
**Required:** No
**Default:** None (never delete)
**Description:** Days until objects are automatically deleted
**Example:** `30` (delete after 30 days)

```bash
BUCKET_LIFECYCLE_DAYS=30
```

### UNIFORM_BUCKET_LEVEL_ACCESS
**Required:** No
**Default:** `true`
**Description:** Enable uniform bucket-level access (recommended for security)
**Values:** `true`, `false`

```bash
UNIFORM_BUCKET_LEVEL_ACCESS=true
```

## Environment-Specific Configurations

### Staging Environment

```bash
# .env for staging
GCP_PROJECT_ID=your-staging-project
GCP_REGION=australia-southeast1
ENVIRONMENT=staging
GCS_BUCKET_NAME=your-project-website-staging
GCS_BUCKET_LOCATION=AUSTRALIA-SOUTHEAST1
# DOMAIN_NAME=  # Leave empty/commented
```

Quick setup:
```bash
cp .env.staging.example .env
# Edit with your values
pnpm run verify
```

### Production Environment

```bash
# .env for production
GCP_PROJECT_ID=your-production-project
GCP_REGION=australia-southeast1
ENVIRONMENT=production
GCS_BUCKET_NAME=your-project-website-prod
GCS_BUCKET_LOCATION=AUSTRALIA-SOUTHEAST1
DOMAIN_NAME=yourdomain.com
ENABLE_BUCKET_VERSIONING=true
```

Quick setup:
```bash
cp .env.production.example .env
# Edit with your values
pnpm run verify
```

## How Environment Variables are Used

### In main.ts

The main entry point loads configuration using the `config.ts` module:

```typescript
import { loadEnvironmentConfig, getStorageStackConfig } from "./config";

// Load and validate configuration
const envConfig = loadEnvironmentConfig();
const config = getStorageStackConfig(envConfig);

// Use configuration in stacks
new StorageStack(app, "dcmco-website-storage", config);
```

### In Stack Constructors

Stacks receive configuration through their constructor:

```typescript
export class StorageStack extends BaseStack {
  constructor(scope: Construct, id: string, config: StorageStackConfig) {
    super(scope, id, config);

    // Access configuration values
    const bucket = new StorageBucket(this, "bucket", {
      name: config.bucketName,
      location: config.bucketLocation,
      // ... other config
    });
  }
}
```

### Configuration Flow

```
.env file
  ↓
loadEnvironmentConfig() (config.ts)
  ↓
Validates required variables
  ↓
Applies defaults for optional variables
  ↓
Returns typed EnvironmentConfig
  ↓
getStorageStackConfig()
  ↓
Converts to StorageStackConfig
  ↓
Passed to stack constructors
```

## Switching Between Environments

### Method 1: Multiple .env Files

Create environment-specific files:

```bash
# Create staging config
cp .env.example .env.staging
# Edit .env.staging with staging values

# Create production config
cp .env.example .env.production
# Edit .env.production with production values
```

Switch environments:

```bash
# Switch to staging
cp .env.staging .env
pnpm run verify
pnpm run deploy

# Switch to production
cp .env.production .env
pnpm run verify
pnpm run deploy
```

### Method 2: Environment Variables Override

Override specific values without changing .env:

```bash
# Deploy to different project temporarily
GCP_PROJECT_ID=other-project pnpm run deploy

# Deploy different bucket
GCS_BUCKET_NAME=test-bucket pnpm run synth
```

### Method 3: Script-Based Switching

Create helper scripts:

```bash
# scripts/deploy-staging.sh
#!/bin/bash
cp .env.staging .env
pnpm run verify && pnpm run deploy

# scripts/deploy-production.sh
#!/bin/bash
cp .env.production .env
pnpm run verify && pnpm run deploy
```

## Validation and Error Handling

The configuration system includes comprehensive validation:

### Required Variable Validation

If required variables are missing:

```
❌ Configuration Error:
Missing required environment variables: GCP_PROJECT_ID, GCS_BUCKET_NAME

Please copy .env.example to .env and fill in the required values:
  cp .env.example .env

Then edit .env with your configuration.
```

### Format Validation

Invalid formats trigger warnings:

```
Warning: GCP_PROJECT_ID "INVALID-ID" may not be valid.
Project IDs must be 6-30 characters, start with a lowercase letter,
and contain only lowercase letters, numbers, and hyphens.
```

### Value Validation

Invalid values throw errors:

```
❌ Configuration Error:
BUCKET_LIFECYCLE_DAYS must be at least 1, got: 0
```

## Accessing Configuration in New Stacks

When creating new stacks, extend the configuration interface:

### 1. Extend BaseStackConfig

```typescript
// In your new stack file
export interface YourStackConfig extends BaseStackConfig {
  // Add your stack-specific config
  customOption: string;
  enableFeature?: boolean;
}
```

### 2. Update EnvironmentConfig

```typescript
// In config.ts
export interface EnvironmentConfig {
  // ... existing config ...

  // Add new environment variable
  CUSTOM_OPTION?: string;
}
```

### 3. Load in loadEnvironmentConfig()

```typescript
// In config.ts
export function loadEnvironmentConfig(): EnvironmentConfig {
  return {
    // ... existing config ...

    // Load new variable
    CUSTOM_OPTION: getEnvVar("CUSTOM_OPTION"),
  };
}
```

### 4. Add to Stack Config Converter

```typescript
// Create converter function
export function getYourStackConfig(envConfig: EnvironmentConfig): YourStackConfig {
  return {
    ...getStorageStackConfig(envConfig),  // Include base config
    customOption: envConfig.CUSTOM_OPTION || "default-value",
    enableFeature: getBooleanEnvVar("ENABLE_FEATURE", false),
  };
}
```

### 5. Use in main.ts

```typescript
// In main.ts
const envConfig = loadEnvironmentConfig();
const yourConfig = getYourStackConfig(envConfig);

new YourStack(app, "your-stack", yourConfig);
```

## Best Practices

### Security

1. **Never commit .env files**
   - They're git-ignored by default
   - Verify with: `git status`

2. **Use different projects for environments**
   - Staging: `company-staging-project`
   - Production: `company-prod-project`

3. **Rotate credentials regularly**
   - GCP service accounts
   - API keys
   - Access tokens

4. **Limit environment variable exposure**
   - Don't log sensitive values
   - Don't echo .env contents
   - Use secret management for CI/CD

### Organization

1. **Use consistent naming**
   ```
   {company}-{app}-{environment}-{resource}
   dcmco-website-staging-bucket
   dcmco-website-prod-bucket
   ```

2. **Document custom variables**
   - Add comments in .env.example
   - Update this guide
   - Add validation in config.ts

3. **Version control examples**
   - Commit: .env.example, .env.staging.example, .env.production.example
   - Never commit: .env, .env.local, .env.*.local

### Validation

1. **Always run verification first**
   ```bash
   pnpm run verify
   ```

2. **Test with synth before deploy**
   ```bash
   pnpm run synth
   pnpm run diff  # Review changes
   pnpm run deploy
   ```

3. **Validate in CI/CD**
   ```yaml
   - name: Validate configuration
     run: |
       cd infrastructure
       pnpm run verify
   ```

## Troubleshooting

### "Missing required environment variables"

**Cause:** .env file doesn't exist or is missing required variables

**Solution:**
```bash
cp .env.example .env
# Edit .env with your values
pnpm run verify
```

### "Could not load .env file"

**Cause:** .env file doesn't exist or has wrong permissions

**Solution:**
```bash
# Check if file exists
ls -la .env

# If missing, create it
cp .env.example .env

# Fix permissions if needed
chmod 600 .env
```

### Configuration not updating

**Cause:** Cached environment variables or stale terminal

**Solution:**
```bash
# Restart terminal or
unset $(grep -v '^#' .env | sed -E 's/(.*)=.*/\1/' | xargs)

# Reload environment
source .env

# Or just restart your shell
```

### "Bucket name already exists"

**Cause:** GCS bucket names must be globally unique

**Solution:**
```bash
# Try a more unique name
GCS_BUCKET_NAME=your-company-website-staging-$(date +%s)
```

## Additional Resources

- [GCP Regions and Zones](https://cloud.google.com/compute/docs/regions-zones)
- [GCS Bucket Naming Guidelines](https://cloud.google.com/storage/docs/naming-buckets)
- [GCP Project ID Requirements](https://cloud.google.com/resource-manager/docs/creating-managing-projects)
- [dotenv Documentation](https://github.com/motdotla/dotenv)

## Support

If you encounter issues with environment configuration:

1. Run `pnpm run verify` for detailed diagnostics
2. Check [VERIFICATION_CHECKLIST.md](./VERIFICATION_CHECKLIST.md)
3. Review error messages in the output
4. Consult this guide for variable requirements
