# CDKTF Infrastructure - Definition of Done Checklist

This checklist ensures comprehensive verification of the CDKTF infrastructure before deployment.

## Automated Verification

### Quick Commands

```bash
# Run full verification suite
pnpm run verify

# Type checking only
pnpm run typecheck

# Type checking + synth
pnpm run validate

# Type checking + diff (shows what will change)
pnpm run check
```

### Pre-Deployment Checks (Automated)

Run `pnpm run verify` to automatically check:

- [x] Node.js version (>= 18.0.0)
- [x] pnpm installed and working
- [x] CDKTF CLI installed
- [x] Terraform installed (or bundled version available)
- [x] gcloud CLI installed
- [x] GCP authentication configured
- [x] Application Default Credentials set up
- [x] Environment variables loaded from .env
- [x] Required environment variables present
- [x] node_modules installed
- [x] Key dependencies present (cdktf, @cdktf/provider-google)
- [x] TypeScript compilation passes
- [x] cdktf.json is valid
- [x] cdktf synth runs successfully
- [x] Terraform JSON files are valid
- [x] GCP project is accessible
- [x] Required GCP APIs are enabled

## Manual Verification Steps

### 1. Pre-Synth Verification

#### Environment Setup
- [ ] Copy `.env.example` to `.env` and configure values
- [ ] Verify `GCP_PROJECT_ID` matches your target GCP project
- [ ] Verify `GCP_REGION` is correct (default: australia-southeast1)
- [ ] Verify `GCS_BUCKET_NAME` follows naming conventions
- [ ] Verify `ENVIRONMENT` is set correctly (staging/production)
- [ ] If production: Uncomment and set `DOMAIN_NAME`

#### Authentication
- [ ] Run `gcloud auth login` and authenticate
- [ ] Run `gcloud auth application-default login` for ADC
- [ ] Run `gcloud config set project [PROJECT_ID]`
- [ ] Verify active account with `gcloud auth list`
- [ ] Verify active project with `gcloud config get-value project`

#### Dependencies
- [ ] Run `pnpm install` to install dependencies
- [ ] Run `pnpm run get` to generate provider bindings (if needed)
- [ ] Verify TypeScript compiles: `pnpm run typecheck`

### 2. Post-Synth Verification

After running `npm run synth` or `pnpm run validate`:

#### Check Synth Output
- [ ] Synth completes without errors
- [ ] `cdktf.out/` directory is created
- [ ] `cdktf.out/stacks/` contains your stack directories
- [ ] Each stack has a `cdk.tf.json` file

#### Validate Terraform JSON Structure
Navigate to each stack in `cdktf.out/stacks/` and verify:

```bash
# Check a specific stack's Terraform JSON
cat cdktf.out/stacks/[STACK_NAME]/cdk.tf.json | python3 -m json.tool

# Or use jq for better formatting
cat cdktf.out/stacks/[STACK_NAME]/cdk.tf.json | jq .
```

**Verify the JSON contains:**
- [ ] `terraform` block with required providers
- [ ] `provider` block with correct configuration
- [ ] `resource` blocks for your infrastructure
- [ ] Correct resource names and properties
- [ ] No empty or null values where required
- [ ] Variable interpolation is correct (no unresolved references)

#### Verify Provider Configuration

In the generated `cdk.tf.json`, check the `provider` block:

```json
{
  "provider": {
    "google": [{
      "project": "your-project-id",
      "region": "australia-southeast1",
      // ... other config
    }]
  }
}
```

- [ ] `project` matches your `GCP_PROJECT_ID`
- [ ] `region` matches your `GCP_REGION`
- [ ] No hardcoded credentials (should use ADC)
- [ ] Provider version is specified (if using version constraints)

#### Verify Resource Configuration

For each resource type, verify:

**Storage Buckets:**
- [ ] Bucket names are globally unique
- [ ] Location matches your region
- [ ] Versioning settings are correct
- [ ] Lifecycle policies are configured (if needed)
- [ ] IAM policies are set correctly
- [ ] Public access is configured correctly
- [ ] CORS settings are present (if needed)

**Other Resources:**
- [ ] Resource names follow naming conventions
- [ ] Dependencies between resources are correct
- [ ] Required properties are set
- [ ] Optional properties match requirements
- [ ] Labels/tags are applied consistently

### 3. Pre-Diff Verification

Before running `pnpm run diff` or `cdktf diff`:

- [ ] Ensure you're authenticated to GCP
- [ ] Verify you're targeting the correct project
- [ ] Confirm you're in the right environment (staging/production)
- [ ] Check if there's existing Terraform state

### 4. Diff Analysis

After running `pnpm run diff` or `cdktf diff`:

#### Review Plan Output
- [ ] Review all resources to be **created** (+ symbol)
- [ ] Review all resources to be **modified** (~ symbol)
- [ ] Review all resources to be **destroyed** (- symbol)
- [ ] Verify no unexpected changes appear
- [ ] Check that resource IDs/names are correct
- [ ] Verify no sensitive data is exposed in the plan

#### Validate Changes
- [ ] Each change matches your intended modifications
- [ ] No resources are being unnecessarily recreated
- [ ] Dependencies are being created in correct order
- [ ] No circular dependencies exist

#### Check for Issues
- [ ] No resources marked for destruction unless intended
- [ ] No "forces replacement" unless expected
- [ ] All computed values look reasonable
- [ ] No suspicious or empty values

### 5. State Management Verification

Before first deployment:
- [ ] Decide on state backend (local vs remote)
- [ ] If remote: Configure GCS backend for state
- [ ] Verify state file location and access
- [ ] Set up state locking (if using remote backend)
- [ ] Configure state encryption (if using remote backend)

### 6. Security Verification

- [ ] No hardcoded credentials in code or config files
- [ ] Sensitive values use environment variables
- [ ] IAM roles follow principle of least privilege
- [ ] Service accounts have minimal required permissions
- [ ] No publicly accessible resources unless intended
- [ ] Encryption at rest is enabled where applicable
- [ ] No secrets committed to version control

### 7. Compliance and Best Practices

#### Code Quality
- [ ] TypeScript strict mode is enabled
- [ ] No TypeScript `any` types used
- [ ] Code follows project conventions
- [ ] Stacks are properly modularized
- [ ] Reusable constructs are used where appropriate
- [ ] Code is documented with comments

#### Infrastructure Best Practices
- [ ] Resources are tagged/labeled appropriately
- [ ] Naming conventions are followed
- [ ] Resources are in correct regions
- [ ] Cost optimization considerations applied
- [ ] Monitoring/logging configured (if applicable)
- [ ] Backup/disaster recovery considered

#### Terraform Best Practices
- [ ] Resources have explicit dependencies where needed
- [ ] No hardcoded values that should be variables
- [ ] Outputs are defined for important values
- [ ] Resource names are descriptive and unique
- [ ] Use of data sources instead of hardcoded IDs

### 8. Pre-Deployment Final Checks

Before running `pnpm run deploy`:

- [ ] Run full verification: `pnpm run verify`
- [ ] Review diff output one more time: `pnpm run diff`
- [ ] Confirm you're in the correct GCP project
- [ ] Verify the environment (staging vs production)
- [ ] Check for any pending changes in version control
- [ ] Ensure team is aware of deployment
- [ ] Have rollback plan ready
- [ ] Verify monitoring/alerting is configured

### 9. Post-Deployment Verification

After running `pnpm run deploy`:

#### Check Deployment Output
- [ ] Deployment completes without errors
- [ ] All resources show as created/updated successfully
- [ ] Output values are displayed correctly
- [ ] No unexpected warnings or errors

#### Verify in GCP Console
- [ ] Navigate to GCP Console
- [ ] Verify all resources are created:
  - [ ] Storage buckets exist
  - [ ] Buckets have correct configurations
  - [ ] IAM policies are applied
  - [ ] Labels/tags are present
  - [ ] Resources are in correct region
- [ ] Test basic functionality of created resources
- [ ] Verify resource costs match expectations

#### Verify State
- [ ] Terraform state file is created/updated
- [ ] State contains all expected resources
- [ ] State is stored in correct location
- [ ] State is properly locked (if using remote backend)

### 10. Smoke Testing

- [ ] Try accessing/using deployed resources
- [ ] Verify permissions work as expected
- [ ] Test any API endpoints or services
- [ ] Verify monitoring/logging is working
- [ ] Check for any unexpected costs

### 11. Documentation

- [ ] Document any manual steps required
- [ ] Update README with current state
- [ ] Document environment variables
- [ ] Document deployment process
- [ ] Document rollback procedures
- [ ] Note any known issues or limitations

## Common Issues and Troubleshooting

### Synth Failures

**Issue:** TypeScript compilation errors
- Run `pnpm run typecheck` to see detailed errors
- Check for missing imports or type mismatches
- Verify all dependencies are installed

**Issue:** Missing environment variables
- Verify `.env` file exists and is loaded
- Check all required variables are set
- Use `pnpm run verify` to check configuration

**Issue:** Provider errors
- Run `pnpm run get` to regenerate provider bindings
- Verify `@cdktf/provider-google` version is compatible
- Check provider configuration in code

### Diff/Plan Failures

**Issue:** Authentication errors
- Run `gcloud auth application-default login`
- Verify project access with `gcloud projects describe PROJECT_ID`
- Check ADC file exists: `~/.config/gcloud/application_default_credentials.json`

**Issue:** Resource already exists errors
- Check if resources were created outside CDKTF
- Consider importing existing resources
- Verify resource names are unique

**Issue:** Permission denied errors
- Verify your GCP account has required IAM roles
- Check service account permissions (if using service account)
- Enable required APIs in GCP Console

### Deployment Failures

**Issue:** Terraform state conflicts
- Ensure no other deployment is running
- Check state locking
- Verify state file isn't corrupted

**Issue:** Resource creation fails
- Check quota limits in GCP
- Verify all required APIs are enabled
- Review error messages for specific issues

**Issue:** Dependency errors
- Review resource dependencies in code
- Ensure resources are created in correct order
- Check for circular dependencies

## Scripts Reference

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `pnpm run typecheck` | Type check without building | During development |
| `pnpm run typecheck:watch` | Continuous type checking | While coding |
| `npm run lint` | Run linting checks | Before committing |
| `npm run build` | Compile TypeScript | Manual builds |
| `npm run synth` | Generate Terraform JSON | After code changes |
| `pnpm run validate` | Type check + synth | Before diff/deploy |
| `pnpm run diff` | Show deployment plan | Before deploying |
| `pnpm run check` | Type check + diff | Quick verification |
| `pnpm run verify` | Full verification suite | Before deployment |
| `pnpm run deploy` | Deploy infrastructure | When ready to deploy |
| `npm run destroy` | Destroy infrastructure | Tear down resources |

## Exit Criteria

All items must be checked before considering the infrastructure "ready to deploy":

### Critical (Must Pass)
- [x] All automated verification checks pass (`pnpm run verify` exits with 0)
- [x] TypeScript compilation succeeds with no errors
- [x] `cdktf synth` completes successfully
- [x] Generated Terraform JSON is valid
- [x] GCP authentication is configured
- [x] All required environment variables are set
- [x] No hardcoded credentials in code

### Important (Should Pass)
- [x] `cdktf diff` shows expected changes only
- [x] No unexpected resource modifications or deletions
- [x] All resources follow naming conventions
- [x] Security best practices are followed
- [x] Required GCP APIs are enabled

### Recommended (Nice to Have)
- [x] Code is documented
- [x] README is up to date
- [x] Monitoring/alerting is configured
- [x] Backup strategy is documented
- [x] Rollback plan exists

---

**Note:** This checklist should be reviewed and updated as the project evolves. Add project-specific checks as needed.
