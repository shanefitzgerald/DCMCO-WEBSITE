# Infrastructure Stacks

This directory contains the modular CDKTF stack definitions for the DCMCO website infrastructure.

## Architecture

The infrastructure is organized into modular, reusable stacks that extend a common `BaseStack`:

```
stacks/
├── base-stack.ts       # Base class with GCP provider and common utilities
├── storage-stack.ts    # GCS bucket for static website hosting
├── index.ts            # Central export point
└── README.md           # This file
```

## Stack Overview

### BaseStack

The foundation for all infrastructure stacks. It provides:

- **GCP Provider Configuration**: Automatically configures the Google provider with project, region, and zone
- **Helper Methods**:
  - `getLabels()`: Generates consistent resource labels (environment, managed_by, project)
  - `getResourceName()`: Creates standardized resource names with environment prefix
- **TypeScript Types**: Strongly-typed configuration interfaces

**Example extending BaseStack:**
```typescript
import { BaseStack, BaseStackConfig } from "./base-stack";

export class MyStack extends BaseStack {
  constructor(scope: Construct, id: string, config: BaseStackConfig) {
    super(scope, id, config);

    // Your resources here - provider is already configured
    // Use this.getLabels() for consistent labeling
    // Use this.getResourceName("my-resource") for naming
  }
}
```

### StorageStack

Creates and configures Google Cloud Storage for static website hosting.

**Features:**
- GCS bucket with website configuration (index.html, 404.html)
- CORS configuration for cross-origin requests
- Optional public access via IAM binding
- Support for custom domain names
- Consistent labeling with component tags

**Configuration:**
```typescript
interface StorageStackConfig extends BaseStackConfig {
  bucketName: string;          // Name of the GCS bucket
  bucketLocation: string;      // Bucket location (e.g., AUSTRALIA-SOUTHEAST1)
  publicAccess?: boolean;      // Enable public access (default: true)
  domainName?: string;         // Optional custom domain
}
```

**Outputs:**
- `bucket-name`: The name of the created bucket
- `bucket-url`: The gs:// URL of the bucket
- `website-url`: The public HTTPS URL to access the site

## Future Stacks

The following stacks are planned for future implementation:

### CdnStack (Planned)

Will configure Cloud CDN with Load Balancer for:
- Global content delivery
- HTTPS with SSL certificates
- Custom domain mapping
- Backend bucket integration

### FunctionsStack (Planned)

Will manage Cloud Functions for:
- Contact form submissions
- Newsletter subscriptions
- Analytics tracking
- Other serverless features

## Usage

### Creating a New Stack

1. **Create the stack file** in this directory:
```typescript
// my-stack.ts
import { Construct } from "constructs";
import { BaseStack, BaseStackConfig } from "./base-stack";

export interface MyStackConfig extends BaseStackConfig {
  // Add your config properties
  customProperty: string;
}

export class MyStack extends BaseStack {
  constructor(scope: Construct, id: string, config: MyStackConfig) {
    super(scope, id, config);

    // Add your resources here
  }
}
```

2. **Export from index.ts**:
```typescript
export { MyStack, MyStackConfig } from "./my-stack";
```

3. **Use in main.ts**:
```typescript
import { MyStack } from "./stacks";

const myStack = new MyStack(app, "my-stack", {
  ...config,
  customProperty: "value",
});
```

### Best Practices

1. **Always extend BaseStack**: Use the base class to get provider configuration and helper methods
2. **Type your configs**: Create interfaces that extend `BaseStackConfig`
3. **Use helper methods**:
   - `this.getLabels()` for consistent resource labeling
   - `this.getResourceName()` for standardized naming
4. **Export outputs**: Make important resource values available as outputs
5. **Document your stack**: Add JSDoc comments explaining what the stack does

## Testing

Test your stack by building and synthesizing:

```bash
# Build TypeScript
pnpm run build

# Synthesize Terraform
pnpm run synth

# Plan changes
pnpm run plan

# Deploy (with confirmation)
pnpm run deploy

# Deploy (auto-approve)
pnpm run deploy:auto
```

## Stack Dependencies

When stacks depend on each other:

```typescript
// Create storage stack first
const storage = new StorageStack(app, "storage", config);

// Pass storage outputs to dependent stack
const cdn = new CdnStack(app, "cdn", {
  ...config,
  bucketName: storage.bucket.name, // Reference the bucket
});
```

## Labels and Naming

All resources created by stacks automatically get:

**Labels:**
- `environment`: staging, production, etc.
- `managed_by`: "cdktf"
- `project`: "dcmco-website"
- `component`: Specific to each stack (e.g., "storage", "cdn")

**Naming Convention:**
Resources use the pattern: `dcmco-website-{environment}-{resource-type}`

Example: `dcmco-website-staging-bucket`
