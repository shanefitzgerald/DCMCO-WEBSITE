import { Construct } from "constructs";
import { BaseStack, BaseStackConfig } from "./base-stack";
import { StorageBucket } from "@cdktf/provider-google/lib/storage-bucket";
import { StorageBucketObject } from "@cdktf/provider-google/lib/storage-bucket-object";
import { Cloudfunctions2Function } from "@cdktf/provider-google/lib/cloudfunctions2-function";
import { CloudfunctionsFunction } from "@cdktf/provider-google/lib/cloudfunctions-function";
import { CloudfunctionsFunctionIamMember } from "@cdktf/provider-google/lib/cloudfunctions-function-iam-member";
import { Cloudfunctions2FunctionIamMember } from "@cdktf/provider-google/lib/cloudfunctions2-function-iam-member";
import { SecretManagerSecret } from "@cdktf/provider-google/lib/secret-manager-secret";
import { SecretManagerSecretVersion } from "@cdktf/provider-google/lib/secret-manager-secret-version";
import { SecretManagerSecretIamMember } from "@cdktf/provider-google/lib/secret-manager-secret-iam-member";
import { TerraformOutput } from "cdktf";
import * as path from "path";

/**
 * Configuration for the Functions Stack
 */
export interface FunctionsStackConfig extends BaseStackConfig {
  /**
   * Name of the contact form function
   * @default "contact-form"
   */
  functionName?: string;

  /**
   * Allowed CORS origins for the function
   * Example: ["http://localhost:3000", "https://dcmco.com.au"]
   */
  allowedOrigins: string[];

  /**
   * Email recipient for contact form submissions
   * @default "shanesrf@gmail.com"
   */
  emailRecipient?: string;

  /**
   * SendGrid API key (will be stored in Secret Manager)
   * Can also be set via environment variable: SENDGRID_API_KEY
   */
  sendgridApiKey?: string;

  /**
   * FROM email address for SendGrid (must be verified)
   * @default Same as emailRecipient
   */
  fromEmail?: string;

  /**
   * Memory allocation for the function (MB)
   * @default 256
   */
  memoryMb?: number;

  /**
   * Timeout for the function (seconds)
   * @default 60
   */
  timeoutSeconds?: number;

  /**
   * Maximum number of function instances
   * @default 10
   */
  maxInstances?: number;

  /**
   * Minimum number of function instances
   * @default 0 (saves costs when idle)
   */
  minInstances?: number;

  /**
   * Path to the function source code (ZIP file or directory)
   * @default "../functions/contact-form"
   */
  functionSourcePath?: string;

  /**
   * Whether to allow public (unauthenticated) access to the function
   * @default true (required for contact forms)
   */
  allowPublicAccess?: boolean;
}

/**
 * Functions Stack
 *
 * Deploys Cloud Functions (Gen 2) for serverless backend features.
 *
 * Resources created:
 * - GCS bucket for function source code storage
 * - Secret Manager secret for SendGrid API key
 * - Cloud Function (Gen 2) for contact form handling
 * - IAM bindings for public access
 *
 * @example
 * ```typescript
 * new FunctionsStack(app, "dcmco-website-functions", {
 *   projectId: "dcmco-prod-2026",
 *   region: "australia-southeast1",
 *   environment: "production",
 *   allowedOrigins: ["https://dcmco.com.au"],
 *   sendgridApiKey: process.env.SENDGRID_API_KEY,
 * });
 * ```
 */
export class FunctionsStack extends BaseStack {
  /**
   * The contact form Cloud Function
   */
  public readonly contactFormFunction: Cloudfunctions2Function;

  /**
   * The SendGrid API key secret
   */
  public readonly sendgridSecret: SecretManagerSecret;

  /**
   * The GCS bucket for function source code
   */
  public readonly functionsBucket: StorageBucket;

  /**
   * URL of the deployed contact form function
   */
  public readonly contactFormUrl: string;

  constructor(scope: Construct, id: string, config: FunctionsStackConfig) {
    super(scope, id, config);

    // Validate required configuration
    this.validateConfig(config);

    // Set defaults
    const functionName = config.functionName || "contact-form";
    const emailRecipient = config.emailRecipient || "shanesrf@gmail.com";
    const fromEmail = config.fromEmail || emailRecipient;
    const memoryMb = config.memoryMb || 256;
    const timeoutSeconds = config.timeoutSeconds || 60;
    const maxInstances = config.maxInstances || 10;
    const minInstances = config.minInstances || 0;
    const functionSourcePath = config.functionSourcePath || "../functions/contact-form";
    const allowPublicAccess = config.allowPublicAccess !== undefined ? config.allowPublicAccess : true;

    // =========================================================================
    // STORAGE BUCKET FOR FUNCTION SOURCE CODE
    // =========================================================================

    // Create a dedicated bucket for Cloud Functions source code
    this.functionsBucket = new StorageBucket(this, "functions-bucket", {
      name: this.getResourceName("functions"),
      location: config.region.toUpperCase(),
      project: config.projectId,
      uniformBucketLevelAccess: true,
      labels: this.getLabels({
        purpose: "cloud-functions",
      }),
      // Enable versioning to track function deployments
      versioning: {
        enabled: true,
      },
      // Lifecycle: Delete old function versions after 30 days
      lifecycleRule: [
        {
          action: {
            type: "Delete",
          },
          condition: {
            numNewerVersions: 3, // Keep last 3 versions
            withState: "ARCHIVED",
          },
        },
      ],
    });

    // =========================================================================
    // SECRET MANAGER FOR SENDGRID API KEY
    // =========================================================================

    // Create a secret for the SendGrid API key
    this.sendgridSecret = new SecretManagerSecret(this, "sendgrid-secret", {
      secretId: this.getResourceName("sendgrid-api-key"),
      project: config.projectId,
      labels: this.getLabels({
        purpose: "sendgrid-api-key",
      }),
      replication: {
        auto: {},
      },
    });

    // Store the SendGrid API key as a secret version
    // NOTE: This should ideally be set manually via gcloud or console
    // to avoid storing secrets in code
    if (config.sendgridApiKey) {
      new SecretManagerSecretVersion(this, "sendgrid-secret-version", {
        secret: this.sendgridSecret.id,
        secretData: config.sendgridApiKey,
      });
    }

    // =========================================================================
    // UPLOAD FUNCTION SOURCE CODE
    // =========================================================================

    // Note: You need to build and zip the function code BEFORE running cdktf deploy
    // Run: cd functions/contact-form && npm run build && zip -r ../../infrastructure/function-source.zip dist/ package.json node_modules/

    const functionSourceZip = new StorageBucketObject(this, "function-source", {
      name: `${functionName}-${config.environment}-${Date.now()}.zip`,
      bucket: this.functionsBucket.name,
      source: path.resolve(process.cwd(), "function-source.zip"), // Will be created by build script
    });

    // =========================================================================
    // CLOUD FUNCTION GEN 2
    // =========================================================================

    this.contactFormFunction = new Cloudfunctions2Function(this, "contact-form", {
      name: this.getResourceName(functionName),
      location: config.region,
      project: config.projectId,
      description: `Contact form handler for DCMCO website (${config.environment})`,

      // Build configuration
      buildConfig: {
        runtime: "nodejs20",
        entryPoint: "contactForm",
        source: {
          storageSource: {
            bucket: this.functionsBucket.name,
            object: functionSourceZip.name,
          },
        },
        // Skip npm build scripts since we pre-build the function
        environmentVariables: {
          GOOGLE_NODE_RUN_SCRIPTS: "",
        },
      },

      // Service configuration
      serviceConfig: {
        maxInstanceCount: maxInstances,
        minInstanceCount: minInstances,
        availableMemory: `${memoryMb}Mi`,
        timeoutSeconds: timeoutSeconds,

        // Environment variables
        environmentVariables: {
          NODE_ENV: config.environment,
          EMAIL_RECIPIENT: emailRecipient,
          FROM_EMAIL: fromEmail,
          ALLOWED_ORIGINS: config.allowedOrigins.join(","),
        },

        // Secret environment variables
        secretEnvironmentVariables: [
          {
            key: "SENDGRID_API_KEY",
            projectId: config.projectId,
            secret: this.sendgridSecret.secretId,
            version: "latest",
          },
        ],

        // Allow all traffic (required for public access)
        ingressSettings: "ALLOW_ALL",

        // VPC connector (optional - uncomment if needed)
        // vpcConnector: "projects/${projectId}/locations/${region}/connectors/my-connector",
        // vpcConnectorEgressSettings: "ALL_TRAFFIC",
      },

      // Labels
      labels: this.getLabels({
        function: functionName,
        purpose: "contact-form-handler",
      }),
    });

    // Store the function URL
    this.contactFormUrl = this.contactFormFunction.serviceConfig.uri;

    // =========================================================================
    // IAM PERMISSIONS
    // =========================================================================

    // Grant the Cloud Function access to read the secret
    new SecretManagerSecretIamMember(this, "function-secret-accessor", {
      project: config.projectId,
      secretId: this.sendgridSecret.secretId,
      role: "roles/secretmanager.secretAccessor",
      member: `serviceAccount:${config.projectId}@appspot.gserviceaccount.com`,
    });

    // Allow public (unauthenticated) access to the function
    if (allowPublicAccess) {
      new Cloudfunctions2FunctionIamMember(this, "function-invoker-public", {
        project: config.projectId,
        location: config.region,
        cloudFunction: this.contactFormFunction.name,
        role: "roles/cloudfunctions.invoker",
        member: "allUsers",
      });
    }

    // =========================================================================
    // OUTPUTS
    // =========================================================================

    new TerraformOutput(this, "contact-form-url", {
      value: this.contactFormUrl,
      description: "URL of the contact form Cloud Function",
    });

    new TerraformOutput(this, "contact-form-name", {
      value: this.contactFormFunction.name,
      description: "Name of the contact form Cloud Function",
    });

    new TerraformOutput(this, "functions-bucket-name", {
      value: this.functionsBucket.name,
      description: "Name of the GCS bucket storing function source code",
    });

    new TerraformOutput(this, "sendgrid-secret-id", {
      value: this.sendgridSecret.secretId,
      description: "ID of the SendGrid API key secret",
    });
  }

  /**
   * Validate the functions stack configuration
   */
  private validateConfig(config: FunctionsStackConfig): void {
    if (!config.allowedOrigins || config.allowedOrigins.length === 0) {
      throw new Error(
        "FunctionsStackConfig.allowedOrigins is required and must contain at least one origin"
      );
    }

    // Validate origin URLs
    for (const origin of config.allowedOrigins) {
      try {
        new URL(origin);
      } catch {
        throw new Error(
          `Invalid origin URL: ${origin}. Must be a valid URL (e.g., https://example.com)`
        );
      }
    }

    // Warn if SendGrid API key is not provided
    if (!config.sendgridApiKey && !process.env.SENDGRID_API_KEY) {
      console.warn(
        "\n⚠️  WARNING: SENDGRID_API_KEY not provided.\n" +
        "   The secret will be created but you'll need to add the key manually:\n" +
        "   gcloud secrets versions add <secret-name> --data-file=-\n"
      );
    }
  }
}
