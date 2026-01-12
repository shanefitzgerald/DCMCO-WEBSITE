# DCMCO Website Infrastructure

Pulumi infrastructure as code for the DCMCO website, managing Firebase Hosting for staging and production environments.

## Overview

This Pulumi project manages Firebase Hosting sites for the DCMCO website. It creates separate hosting sites for staging and production environments within the same GCP/Firebase project.

## Architecture

- **Project**: `dcmco-prod-2026`
- **Region**: `australia-southeast1`
- **Stacks**:
  - `staging` - Staging environment
  - `production` - Production environment

## Resources Created

For each stack, Pulumi creates:

1. **Firebase API Services** - Enables required APIs:
   - `firebase.googleapis.com`
   - `firebasehosting.googleapis.com`
   - `identitytoolkit.googleapis.com`

2. **Firebase Web App** - A Firebase web application for the stack

3. **Firebase Hosting Site** - A hosting site with site ID `dcmco-{stack}`

## Outputs

Each stack exports:

- `firebaseProjectId` - GCP project ID
- `firebaseSiteId` - Firebase Hosting site ID (e.g., `dcmco-staging`)
- `firebaseSiteName` - Full resource name of the hosting site
- `firebaseDefaultUrl` - Default Firebase hosting URL (e.g., `https://dcmco-staging.web.app`)
- `firebaseAppId` - Firebase app ID
- `environment` - Current environment name (staging/production)
- `region` - Configured GCP region

View outputs:
```bash
pulumi stack output
```

## Prerequisites

1. **Pulumi CLI** - [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. **Node.js 18+** - For running TypeScript
3. **pnpm** - Package manager
4. **GCP Authentication** - Authenticated with `gcloud`
5. **Firebase CLI** (for deployments) - Install with `npm install -g firebase-tools`

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Select a Stack

```bash
# For staging
pulumi stack select staging

# For production
pulumi stack select production
```

### 3. Preview Changes

```bash
pulumi preview
```

### 4. Deploy Infrastructure

```bash
pulumi up
```

This will create the Firebase Hosting sites in your GCP project.

## Deploying Static Files

After Pulumi creates the infrastructure, use Firebase CLI to deploy your static files:

### Initial Setup

1. Initialize Firebase in your project root (if not already done):
   ```bash
   firebase init hosting
   ```

2. Configure `firebase.json` with both sites:
   ```json
   {
     "hosting": [
       {
         "target": "staging",
         "public": "out",
         "site": "dcmco-staging",
         "ignore": ["firebase.json", "**/.*", "**/node_modules/**"]
       },
       {
         "target": "production",
         "public": "out",
         "site": "dcmco-production",
         "ignore": ["firebase.json", "**/.*", "**/node_modules/**"]
       }
     ]
   }
   ```

3. Set up hosting targets:
   ```bash
   firebase target:apply hosting staging dcmco-staging
   firebase target:apply hosting production dcmco-production
   ```

### Deploy to Staging

```bash
# Build your Next.js app
npm run build

# Deploy to staging
firebase deploy --only hosting:staging
```

### Deploy to Production

```bash
# Build your Next.js app
npm run build

# Deploy to production
firebase deploy --only hosting:production
```

## URLs

After deployment, your sites will be available at:

- **Staging**: https://dcmco-staging.web.app
- **Production**: https://dcmco-production.web.app

## Configuration System

### Overview

This project uses Pulumi's built-in configuration management with type-safe helpers from [config.ts](config.ts). Configuration is stored in `Pulumi.{stack}.yaml` files with environment-specific values.

### Configuration Files

- **[config.ts](config.ts)** - Type-safe configuration helpers and schema
- **[Pulumi.staging.yaml](Pulumi.staging.yaml)** - Staging environment config
- **[Pulumi.production.yaml](Pulumi.production.yaml)** - Production environment config

### Switching Between Stacks

```bash
# Switch to staging
pulumi stack select staging

# Switch to production
pulumi stack select production

# List all stacks
pulumi stack ls
```

### Viewing Configuration

```bash
# View all configuration for current stack
pulumi config

# View specific config value
pulumi config get dcmco-website:environment

# View all outputs
pulumi stack output
```

### Adding New Configuration Values

#### 1. Add Plain Text Config

```bash
# Switch to the stack you want to configure
pulumi stack select staging

# Set the configuration value
pulumi config set dcmco-website:myNewConfig "value"
```

#### 2. Add Secret Config

```bash
# Use --secret flag for sensitive values
pulumi config set dcmco-website:apiKey --secret

# Or provide the value inline (less secure - visible in shell history)
pulumi config set dcmco-website:apiKey "secret-value" --secret
```

#### 3. Update Type Definitions (Optional but Recommended)

Update [config.ts](config.ts) to include your new config value:

```typescript
export interface StackConfig {
  projectId: string;
  region: string;
  environment: string;
  myNewConfig: string;  // Add your new field
}

export function getConfig(): StackConfig {
  const stack = pulumi.getStack();
  const gcpConfig = new pulumi.Config("gcp");
  const appConfig = new pulumi.Config("dcmco-website");

  return {
    projectId: gcpConfig.require("project"),
    region: gcpConfig.get("region") || "australia-southeast1",
    environment: stack,
    myNewConfig: appConfig.require("myNewConfig"),  // Add retrieval
  };
}
```

### Working with Secrets

Secrets are encrypted using Pulumi's secrets provider and stored in `Pulumi.{stack}.yaml` with a `secure:` prefix.

#### Set a Secret

```bash
# Interactive (recommended - won't show in shell history)
pulumi config set dcmco-website:sendgridApiKey --secret
# You'll be prompted to enter the value

# Or inline (appears in shell history)
pulumi config set dcmco-website:sendgridApiKey "SG.abc123..." --secret
```

#### View a Secret (Decrypted)

```bash
# Show decrypted value (requires passphrase)
pulumi config get dcmco-website:sendgridApiKey --show-secrets
```

#### Use a Secret in Code

```typescript
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config("dcmco-website");
const apiKey = config.requireSecret("sendgridApiKey");

// Use as Output<string> in resources
new SomeResource("name", {
  apiKey: apiKey,
});
```

### Current Configuration Schema

**GCP Settings:**
- `gcp:project` - GCP project ID
- `gcp:region` - GCP region (default: australia-southeast1)

**Application Settings:**
- `dcmco-website:environment` - Environment name (staging/production)
- `dcmco-website:bucketName` - GCS bucket name
- `dcmco-website:allowedOrigins` - Comma-separated CORS origins
- `dcmco-website:emailFrom` - Email sender address
- `dcmco-website:emailReplyTo` - Email reply-to address
- `dcmco-website:sendgridApiKey` - SendGrid API key (secret)

### Example: Adding a New Environment

```bash
# Create new stack
pulumi stack init development

# Configure GCP settings
pulumi config set gcp:project dcmco-prod-2026
pulumi config set gcp:region australia-southeast1

# Configure application settings
pulumi config set dcmco-website:environment development
pulumi config set dcmco-website:bucketName dcmco-development-bucket
pulumi config set dcmco-website:allowedOrigins "http://localhost:3000"
pulumi config set dcmco-website:emailFrom noreply@dev.dcmco.com.au
pulumi config set dcmco-website:emailReplyTo hello@dcmco.com.au

# Add secrets
pulumi config set dcmco-website:sendgridApiKey --secret

# Deploy
pulumi up
```

### Common Configuration Operations

```bash
# Copy config from staging to new stack
pulumi stack select staging
pulumi stack output --json > staging-config.json
pulumi stack select development
# Manually set values based on staging-config.json

# Remove a config value
pulumi config rm dcmco-website:oldConfig

# List only secrets
pulumi config --show-secrets | grep "secure:"
```

### Configuration Best Practices

1. **Never commit plain text secrets** - Always use `--secret` flag
2. **Use separate secrets per environment** - Different API keys for staging/production
3. **Document new config values** - Update this README when adding config
4. **Use type-safe helpers** - Import from `config.ts` instead of using `Config()` directly
5. **Version control stack files** - `Pulumi.*.yaml` files should be committed (secrets are encrypted)

## Common Commands

```bash
# List all stacks
pulumi stack ls

# View stack outputs
pulumi stack output

# Refresh state from GCP
pulumi refresh

# Destroy resources (careful!)
pulumi destroy
```

## Project Structure

```
infrastructure/
├── index.ts                    # Main Pulumi program
├── config.ts                   # Type-safe configuration helpers
├── package.json                # Node.js dependencies
├── tsconfig.json               # TypeScript configuration
├── Pulumi.yaml                 # Pulumi project configuration
├── Pulumi.staging.yaml         # Staging stack config (with encrypted secrets)
├── Pulumi.production.yaml      # Production stack config (with encrypted secrets)
├── MIGRATION_VERIFICATION.md   # Configuration migration verification guide
└── README.md                   # This file
```

## Notes

- The Firebase project must already exist in GCP
- Stack names (`staging`, `production`) are used to create unique site IDs
- Static files are deployed using Firebase CLI, not Pulumi
- Pulumi manages infrastructure; Firebase CLI handles content deployment
- Both stacks use the same GCP project but create separate hosting sites

## Troubleshooting

### API Not Enabled Error

If you get an API not enabled error, Pulumi should automatically enable it. If not, manually enable:

```bash
gcloud services enable firebase.googleapis.com
gcloud services enable firebasehosting.googleapis.com
gcloud services enable identitytoolkit.googleapis.com
```

### Firebase CLI Authentication

Make sure you're logged in to Firebase:

```bash
firebase login
```

### Site Not Found

If Firebase CLI can't find the site, ensure Pulumi has successfully created it:

```bash
pulumi stack output firebaseSiteId
```

## License

MIT
