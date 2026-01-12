# Pulumi Infrastructure Resources

This directory contains modular resource definitions for the DCMCO website infrastructure.

## Directory Structure

```
resources/
├── index.ts        # Main exports file
├── apis.ts         # GCP API enablement
├── firebase.ts     # Firebase Hosting resources
├── storage.ts      # Cloud Storage buckets
├── functions.ts    # Cloud Functions (Gen 2)
├── secrets.ts      # Secret Manager secrets
├── iam.ts          # IAM service accounts and roles
└── README.md       # This file
```

## Module Overview

### apis.ts

Manages GCP API enablement for the project.

**Functions:**
- `enableApis(projectId)` - Enables all required GCP APIs including Firebase, Cloud Functions, Storage, and Secret Manager

**Usage:**
```typescript
import { enableApis } from "./resources";

const apis = enableApis(config.projectId);
```

---

### firebase.ts

Creates Firebase Hosting resources.

**Functions:**
- `createFirebaseHosting(projectId, environment, dependencies)` - Creates Firebase Web App and Hosting Site

**Returns:**
```typescript
{
  webApp: gcp.firebase.WebApp;
  hostingSite: gcp.firebase.HostingSite;
}
```

**Usage:**
```typescript
import { createFirebaseHosting } from "./resources";

const firebase = createFirebaseHosting(
  config.projectId,
  config.environment,
  {
    firebaseApi: apis.firebaseApi,
    firebaseHostingApi: apis.firebaseHostingApi,
    identityToolkitApi: apis.identityToolkitApi,
  }
);
```

---

### storage.ts

Creates and manages Cloud Storage buckets.

**Functions:**
- `createStorageBucket(options)` - Creates a GCS bucket with standard configuration
- `createFunctionSourceBucket(projectId, region, dependencies)` - Creates a bucket specifically for Cloud Function source code

**Options:**
```typescript
{
  projectId: string;
  region: string;
  bucketName?: string;
  labels?: Record<string, string>;
  versioning?: boolean;
  lifecycleDays?: number;
  dependencies?: gcp.projects.Service[];
}
```

**Usage:**
```typescript
import { createStorageBucket, createFunctionSourceBucket } from "./resources";

const bucket = createStorageBucket({
  projectId: config.projectId,
  region: config.region,
  bucketName: config.bucketName,
  dependencies: [apis.storageApi],
});

const functionBucket = createFunctionSourceBucket(
  config.projectId,
  config.region,
  [apis.storageApi]
);
```

---

### functions.ts

Creates and manages Cloud Functions (Generation 2).

**Functions:**
- `createCloudFunction(options)` - Creates a Cloud Function with full configuration
- `makeCloudFunctionPublic(cloudFunction)` - Makes a function publicly accessible

**Options:**
```typescript
{
  projectId: string;
  region: string;
  name: string;
  description: string;
  runtime: string;
  entryPoint: string;
  sourceBucket: gcp.storage.Bucket;
  sourceObject: gcp.storage.BucketObject;
  environmentVariables?: Record<string, pulumi.Input<string>>;
  secrets?: Array<{
    key: string;
    projectId: string;
    secret: string;
    version: string;
  }>;
  allowedOrigins?: string[];
  maxInstances?: number;
  minInstances?: number;
  availableMemoryMb?: number;
  timeout?: number;
  labels?: Record<string, string>;
  dependencies?: pulumi.Resource[];
}
```

**Usage:**
```typescript
import { createCloudFunction, makeCloudFunctionPublic } from "./resources";

const func = createCloudFunction({
  projectId: config.projectId,
  region: config.region,
  name: "contact-form",
  description: "Contact form handler",
  runtime: "nodejs20",
  entryPoint: "handleContactForm",
  sourceBucket: bucket,
  sourceObject: source,
  environmentVariables: {
    EMAIL_FROM: config.emailFrom,
  },
  allowedOrigins: config.allowedOrigins.split(","),
  dependencies: [apis.cloudFunctionsApi],
});

makeCloudFunctionPublic(func);
```

---

### secrets.ts

Manages Secret Manager secrets.

**Functions:**
- `createSecret(options)` - Creates a secret with a secret version
- `grantSecretAccess(secret, serviceAccountEmail)` - Grants a service account access to a secret

**Options:**
```typescript
{
  projectId: string;
  secretId: string;
  secretValue: pulumi.Input<string>;
  labels?: Record<string, string>;
  dependencies?: gcp.projects.Service[];
}
```

**Usage:**
```typescript
import { createSecret, grantSecretAccess } from "./resources";

const appConfig = new pulumi.Config("dcmco-website");

const secret = createSecret({
  projectId: config.projectId,
  secretId: "sendgrid-api-key",
  secretValue: appConfig.requireSecret("sendgridApiKey"),
  dependencies: [apis.secretManagerApi],
});

grantSecretAccess(secret.secret, serviceAccount.email);
```

---

### iam.ts

Manages IAM service accounts and role bindings.

**Functions:**
- `createServiceAccount(options)` - Creates a service account
- `grantProjectRole(serviceAccount, projectId, role)` - Grants a project-level IAM role to a service account

**Service Account Options:**
```typescript
{
  projectId: string;
  accountId: string;
  displayName: string;
  description?: string;
}
```

**Usage:**
```typescript
import { createServiceAccount, grantProjectRole } from "./resources";

const sa = createServiceAccount({
  projectId: config.projectId,
  accountId: "function-sa",
  displayName: "Cloud Function Service Account",
  description: "Service account for Cloud Functions",
});

grantProjectRole(sa, config.projectId, "roles/cloudfunctions.invoker");
```

---

## Design Principles

### 1. Type Safety
All functions use TypeScript interfaces for configuration options, providing compile-time type checking and excellent IDE autocomplete.

### 2. Consistent Naming
All resources use `getResourceName()` from `config.ts` to ensure consistent, environment-specific naming.

### 3. Standard Labels
Resources automatically apply standard labels via `getLabels()` for better organization and cost tracking.

### 4. Dependency Management
All resource creation functions accept optional dependencies to ensure proper resource creation order.

### 5. No Hardcoded Values
All configuration values are passed as parameters or retrieved from Pulumi config.

### 6. Reusability
Functions are designed to be reusable across different environments and projects.

---

## Adding New Resource Types

To add a new resource type:

1. **Create a new file** in `resources/` (e.g., `databases.ts`)

2. **Define interfaces** for configuration options:
   ```typescript
   export interface DatabaseOptions {
     projectId: string;
     // ... other options
   }
   ```

3. **Create resource functions**:
   ```typescript
   export function createDatabase(options: DatabaseOptions): gcp.sql.DatabaseInstance {
     // Implementation
   }
   ```

4. **Export from index.ts**:
   ```typescript
   export * from "./databases";
   ```

5. **Update this README** with documentation

6. **Use in main index.ts**:
   ```typescript
   import { createDatabase } from "./resources";

   const db = createDatabase({
     projectId: config.projectId,
     // ... options
   });
   ```

---

## Best Practices

1. **Always use config helpers** - Import `getConfig()`, `getResourceName()`, and `getLabels()` from `../config`

2. **Document all functions** - Use JSDoc comments with parameter descriptions and examples

3. **Return typed objects** - Always specify return types for better type inference

4. **Handle dependencies** - Accept and pass through `dependsOn` for proper resource ordering

5. **Validate inputs** - Use TypeScript's type system and runtime checks where needed

6. **Keep functions focused** - Each function should do one thing well

7. **Provide examples** - Include usage examples in documentation

---

## Testing

Verify your changes compile:
```bash
pnpm typecheck
```

Preview infrastructure changes:
```bash
pulumi preview
```

---

## Related Documentation

- [Main Infrastructure README](../README.md)
- [Configuration System](../README.md#configuration-system)
- [Pulumi GCP Documentation](https://www.pulumi.com/registry/packages/gcp/)
