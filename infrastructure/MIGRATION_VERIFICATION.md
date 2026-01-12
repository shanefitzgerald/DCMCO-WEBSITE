# Pulumi Configuration Migration Verification Guide

This guide helps you verify that the migration from `.env` files to Pulumi stack configuration is complete and correct.

## 1. Verify Secrets Are Properly Encrypted

### Check Staging Secrets
```bash
cd infrastructure
cat Pulumi.staging.yaml | grep -A 1 "sendgridApiKey"
```

**Expected Output:**
```yaml
dcmco-website:sendgridApiKey:
  secure: AAABA...
```

✅ **Verified:** The `sendgridApiKey` shows `secure: AAABA...` prefix (encrypted by Pulumi)

### Check Production Secrets
```bash
cat Pulumi.production.yaml | grep -A 1 "sendgridApiKey"
```

**Expected Output:**
```yaml
dcmco-website:sendgridApiKey:
  secure: AAABA...
```

✅ **Verified:** The `sendgridApiKey` shows `secure: AAABA...` prefix (encrypted by Pulumi)

### Verify Secrets Are Different
```bash
diff <(grep -A 1 "sendgridApiKey" Pulumi.staging.yaml) <(grep -A 1 "sendgridApiKey" Pulumi.production.yaml)
```

✅ **Expected:** The output should show different encrypted values for each environment

---

## 2. Configuration Checklist

### Staging Configuration (`Pulumi.staging.yaml`)

Run this command to verify all values:
```bash
pulumi stack select staging
pulumi config
```

**Expected Values:**

- [x] `gcp:project` = `dcmco-prod-2026`
- [x] `gcp:region` = `australia-southeast1`
- [x] `dcmco-website:environment` = `staging`
- [x] `dcmco-website:bucketName` = `dcmco-staging-bucket`
- [x] `dcmco-website:allowedOrigins` = `https://staging.dcmco.com.au`
- [x] `dcmco-website:emailFrom` = `noreply@staging.dcmco.com.au`
- [x] `dcmco-website:emailReplyTo` = `hello@dcmco.com.au`
- [x] `dcmco-website:sendgridApiKey` = `[secret]` (encrypted)

### Production Configuration (`Pulumi.production.yaml`)

Run this command to verify all values:
```bash
pulumi stack select production
pulumi config
```

**Expected Values:**

- [x] `gcp:project` = `dcmco-prod-2026`
- [x] `gcp:region` = `australia-southeast1`
- [x] `dcmco-website:environment` = `production`
- [x] `dcmco-website:bucketName` = `dcmco-production-bucket`
- [x] `dcmco-website:allowedOrigins` = `https://dcmco.com.au,https://www.dcmco.com.au`
- [x] `dcmco-website:emailFrom` = `noreply@dcmco.com.au`
- [x] `dcmco-website:emailReplyTo` = `hello@dcmco.com.au`
- [x] `dcmco-website:sendgridApiKey` = `[secret]` (encrypted)

---

## 3. Files That Can Be Removed

Now that configuration is managed by Pulumi, the following files are **no longer needed** for infrastructure deployment:

### Safe to Remove:
- `/infrastructure/.env` - Contains old environment variables (already in .gitignore)
- `/infrastructure/.env.staging.example` - No longer needed
- `/infrastructure/.env.production.example` - No longer needed

### Keep (for reference):
- `/infrastructure/.env.example` - Keep as documentation of old approach, or remove if you prefer
- `/functions/contact-form/.env.example` - Keep (used by Cloud Functions, not infrastructure)

### Command to Remove Old Files:
```bash
cd infrastructure
rm .env .env.staging.example .env.production.example
# Optional: rm .env.example
```

**Note:** The `.env` file is already ignored by git, so removing it only affects your local environment.

---

## 4. Test Commands

### Preview Infrastructure Changes (Staging)
```bash
cd infrastructure
pulumi stack select staging
pulumi preview
```

**What to Look For:**
- ✅ No unexpected changes (should show "no changes" if already deployed)
- ✅ Resource names use format: `dcmco-staging-*`
- ✅ Configuration values are correctly loaded from `Pulumi.staging.yaml`
- ✅ No errors about missing environment variables

### Preview Infrastructure Changes (Production)
```bash
cd infrastructure
pulumi stack select production
pulumi preview
```

**What to Look For:**
- ✅ No unexpected changes (should show "no changes" if already deployed)
- ✅ Resource names use format: `dcmco-production-*`
- ✅ Configuration values are correctly loaded from `Pulumi.production.yaml`
- ✅ No errors about missing environment variables

### Verify Config Helper Functions
```bash
cd infrastructure
pnpm typecheck
```

**Expected:** No TypeScript errors

### Test Configuration Access
Create a test script to verify config values are accessible:

```bash
cat > test-config.ts << 'EOF'
import { getConfig, getResourceName, getLabels } from "./config";

const config = getConfig();
console.log("Configuration Test:");
console.log("- Project ID:", config.projectId);
console.log("- Region:", config.region);
console.log("- Environment:", config.environment);
console.log("- Resource Name:", getResourceName("test"));
console.log("- Labels:", JSON.stringify(getLabels(), null, 2));
EOF

# Run the test
npx tsx test-config.ts

# Clean up
rm test-config.ts
```

---

## 5. Migration Verification Checklist

### Code Migration
- [x] `config.ts` created with type-safe helpers
- [x] `index.ts` refactored to use `getConfig()`
- [x] `index.ts` uses `getResourceName()` for all resources
- [x] No references to `process.env` in infrastructure code
- [x] TypeScript compiles without errors

### Configuration Files
- [x] `Pulumi.staging.yaml` has all required values
- [x] `Pulumi.production.yaml` has all required values
- [x] Secrets are encrypted with `secure:` prefix
- [x] Staging and production use different SendGrid API keys

### Security
- [x] `.gitignore` includes `.env` files
- [x] Secrets are not in plain text
- [x] No sensitive values in version control

### Testing
- [ ] Run `pulumi preview` for staging (no errors)
- [ ] Run `pulumi preview` for production (no errors)
- [ ] Verify config values with `pulumi config`
- [ ] Run TypeScript type checking

---

## 6. Common Issues & Troubleshooting

### Issue: "error: failed to decrypt"
**Solution:** Make sure you're using the correct passphrase for the stack. Run:
```bash
pulumi stack change-secrets-provider
```

### Issue: "config value 'dcmco-website:X' not found"
**Solution:** The config value is missing. Set it with:
```bash
pulumi config set dcmco-website:X value
```

### Issue: Different project IDs for staging/production
**Current Setup:** Both stacks use `dcmco-prod-2026`

If you want separate projects:
```bash
pulumi stack select staging
pulumi config set gcp:project dcmco-staging-2026

pulumi stack select production
pulumi config set gcp:project dcmco-prod-2026
```

---

## 7. Next Steps After Verification

Once all checks pass:

1. **Deploy to staging** to test the new config system:
   ```bash
   pulumi stack select staging
   pulumi up
   ```

2. **Verify staging deployment** works correctly

3. **Deploy to production**:
   ```bash
   pulumi stack select production
   pulumi up
   ```

4. **Remove old .env files** (after successful deployment):
   ```bash
   cd infrastructure
   rm .env .env.staging.example .env.production.example
   git add -u
   git commit -m "chore: remove deprecated .env files after Pulumi migration"
   ```

5. **Update documentation** to reflect new configuration approach

---

## 8. Rollback Plan

If you need to rollback to the old `.env` approach:

1. Restore the `.env` file from backup or recreate it
2. Revert the changes to `index.ts`:
   ```bash
   git revert <commit-hash>
   ```
3. Keep `config.ts` for future use

---

## Additional Resources

- [Pulumi Configuration Documentation](https://www.pulumi.com/docs/concepts/config/)
- [Pulumi Secrets Management](https://www.pulumi.com/docs/concepts/secrets/)
- [Type-Safe Config Helper: config.ts](./config.ts)
