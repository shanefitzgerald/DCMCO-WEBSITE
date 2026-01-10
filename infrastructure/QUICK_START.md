# CDKTF Infrastructure - Quick Start Guide

## First Time Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment file
cp .env.example .env

# 3. Edit .env with your settings
# Set GCP_PROJECT_ID, GCP_REGION, etc.

# 4. Authenticate with GCP
gcloud auth login
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID

# 5. Run verification
pnpm run verify
```

## Daily Development Workflow

```bash
# 1. Type check your code
pnpm run typecheck

# 2. Generate Terraform configuration
pnpm run synth

# 3. See what changes will be made
pnpm run diff

# 4. Deploy when ready
pnpm run deploy
```

## Quick Commands

```bash
# Verification
pnpm run verify           # Full verification suite
pnpm run typecheck       # Type checking only
pnpm run validate        # Type check + synth
pnpm run check           # Type check + diff

# Development
pnpm run typecheck:watch # Watch mode for type checking
pnpm run watch           # Watch mode for compilation

# Deployment
pnpm run synth           # Generate Terraform JSON
pnpm run diff            # Show deployment plan
pnpm run deploy          # Deploy infrastructure
pnpm run destroy         # Destroy infrastructure

# Maintenance
pnpm run upgrade         # Update CDKTF to latest
```

## Pre-Deployment Checklist

Quick checklist before deploying:

```bash
# 1. Verify everything passes
pnpm run verify

# 2. Check what will change
pnpm run diff

# 3. Confirm you're in the right project
gcloud config get-value project

# 4. Deploy!
pnpm run deploy
```

## Troubleshooting

### "cdktf: command not found"
```bash
pnpm install -g cdktf-cli
```

### "Authentication error"
```bash
gcloud auth application-default login
```

### "Environment variable not set"
```bash
# Make sure .env exists and is configured
cp .env.example .env
# Edit .env with your values
```

### "TypeScript errors"
```bash
# See detailed errors
pnpm run typecheck

# Make sure dependencies are installed
pnpm install
```

## Need Help?

See [VERIFICATION_CHECKLIST.md](./VERIFICATION_CHECKLIST.md) for comprehensive documentation.
