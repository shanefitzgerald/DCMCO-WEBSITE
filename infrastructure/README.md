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

## Stack Configuration

View current stack configuration:

```bash
pulumi config
```

Set configuration values:

```bash
pulumi config set gcp:project dcmco-prod-2026
pulumi config set gcp:region australia-southeast1
```

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
├── index.ts              # Main Pulumi program
├── package.json          # Node.js dependencies
├── tsconfig.json         # TypeScript configuration
├── Pulumi.yaml          # Pulumi project configuration
├── Pulumi.staging.yaml  # Staging stack config
└── Pulumi.production.yaml # Production stack config
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
