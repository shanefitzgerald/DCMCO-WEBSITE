import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import { getResourceName, getLabels, getConfig } from "../config";
import { createSecret, grantSecretAccess } from "./secrets";
import { createServiceAccount, grantProjectRole } from "./iam";
import { createFunctionSourceBucket } from "./storage";

/**
 * Contact Form Cloud Function Infrastructure
 *
 * This module creates all resources needed for the contact form Cloud Function:
 * - Service account with minimal permissions
 * - Secret Manager secret for SendGrid API key
 * - GCS bucket for function source code
 * - Cloud Function (Gen 2) with HTTP trigger
 * - IAM bindings for public access and secret access
 */

export interface ContactFormResources {
  serviceAccount: gcp.serviceaccount.Account;
  secret: gcp.secretmanager.Secret;
  secretVersion: gcp.secretmanager.SecretVersion;
  sourceBucket: gcp.storage.Bucket;
  sourceArchive: gcp.storage.BucketObject;
  cloudFunction: gcp.cloudfunctionsv2.Function;
  functionUrl: pulumi.Output<string>;
}

/**
 * Create the contact form Cloud Function and all supporting infrastructure
 *
 * @param dependencies - Required API services that must be enabled
 * @returns All contact form resources including the function URL
 */
export function createContactFormInfrastructure(dependencies: {
  cloudFunctionsApi: gcp.projects.Service;
  cloudBuildApi: gcp.projects.Service;
  storageApi: gcp.projects.Service;
  secretManagerApi: gcp.projects.Service;
}): ContactFormResources {
  const config = getConfig();
  const appConfig = new pulumi.Config("dcmco-website");

  // Standard labels for all contact form resources
  const contactFormLabels = getLabels({
    component: "contact-form",
    function: "email-handler",
  });

  // ============================================================================
  // 1. Service Account
  // ============================================================================
  // Create a dedicated service account with minimal permissions for the function
  const serviceAccount = createServiceAccount({
    projectId: config.projectId,
    accountId: "contact-form-fn",
    displayName: "Contact Form Cloud Function",
    description: "Service account for contact form Cloud Function with minimal required permissions",
  });

  // Grant the service account permission to invoke itself (for testing)
  grantProjectRole(
    serviceAccount,
    config.projectId,
    "roles/cloudfunctions.invoker",
    getResourceName("contact-form-invoker")
  );

  // ============================================================================
  // 2. Secret Manager Secret
  // ============================================================================
  // Create Secret Manager secret for SendGrid API key
  // The secret value comes from Pulumi config (encrypted in Pulumi.*.yaml)
  const sendgridSecret = createSecret({
    projectId: config.projectId,
    secretId: "sendgrid-api-key",
    secretValue: appConfig.requireSecret("sendgridApiKey"),
    labels: contactFormLabels,
    dependencies: [dependencies.secretManagerApi],
  });

  // Grant the service account access to read the secret
  grantSecretAccess(
    sendgridSecret.secret,
    serviceAccount.email,
    getResourceName("contact-form-secret-access")
  );

  // ============================================================================
  // 3. Function Source Bucket
  // ============================================================================
  // Create a GCS bucket to store the Cloud Function source code
  const sourceBucket = createFunctionSourceBucket(
    config.projectId,
    config.region,
    [dependencies.storageApi]
  );

  // ============================================================================
  // 4. Function Source Archive
  // ============================================================================
  // Upload a placeholder archive (will be replaced by actual function code)
  // TODO: Replace with actual contact form function source code
  const sourceArchive = new gcp.storage.BucketObject(
    getResourceName("contact-form-source"),
    {
      name: `contact-form-${config.environment}-source.zip`,
      bucket: sourceBucket.name,
      // Placeholder content - replace with actual function archive
      // In practice, you would build and upload the function code here
      source: new pulumi.asset.StringAsset("placeholder"),
      contentType: "application/zip",
    },
    {
      dependsOn: [sourceBucket],
    }
  );

  // ============================================================================
  // 5. Cloud Function (Gen 2)
  // ============================================================================
  const cloudFunction = new gcp.cloudfunctionsv2.Function(
    getResourceName("contact-form"),
    {
      name: getResourceName("contact-form"),
      project: config.projectId,
      location: config.region,
      description: "Handles contact form submissions and sends emails via SendGrid",
      labels: contactFormLabels,

      // Build configuration
      buildConfig: {
        runtime: "nodejs20", // Node.js 20 (latest stable LTS)
        entryPoint: "contactForm", // Handler function name
        source: {
          storageSource: {
            bucket: sourceBucket.name,
            object: sourceArchive.name,
          },
        },
        // Environment variables available during build
        environmentVariables: {
          NODE_ENV: config.environment,
        },
      },

      // Service/runtime configuration
      serviceConfig: {
        // Resource limits
        maxInstanceCount: 10, // Prevent runaway costs
        minInstanceCount: 0, // Scale to zero when not in use
        availableMemory: "256Mi", // 256MB memory
        timeoutSeconds: 60, // 60 second timeout

        // Service account for function execution
        serviceAccountEmail: serviceAccount.email,

        // Environment variables available at runtime
        environmentVariables: {
          // Email configuration from Pulumi config
          EMAIL_FROM: appConfig.require("emailFrom"),
          EMAIL_REPLY_TO: appConfig.require("emailReplyTo"),

          // CORS allowed origins from Pulumi config
          ALLOWED_ORIGINS: appConfig.require("allowedOrigins"),

          // Environment identifier
          ENVIRONMENT: config.environment,
        },

        // Secret Manager integration
        // The function will access SendGrid API key from Secret Manager
        // at runtime using the service account's permissions
        secretEnvironmentVariables: [
          {
            key: "SENDGRID_API_KEY",
            projectId: config.projectId,
            secret: sendgridSecret.secret.secretId,
            version: "latest", // Always use the latest version
          },
        ],

        // Network configuration
        ingressSettings: "ALLOW_ALL", // Allow requests from anywhere
        allTrafficOnLatestRevision: true, // No gradual rollout
      },
    },
    {
      dependsOn: [
        dependencies.cloudFunctionsApi,
        dependencies.cloudBuildApi,
        serviceAccount,
        sendgridSecret.secretVersion,
        sourceArchive,
      ],
    }
  );

  // ============================================================================
  // 6. Public Access IAM Binding
  // ============================================================================
  // Make the function publicly accessible (required for contact form submissions)
  // This allows unauthenticated HTTP requests to invoke the function
  const publicInvoker = new gcp.cloudfunctionsv2.FunctionIamMember(
    `${getResourceName("contact-form")}-public-invoker`,
    {
      project: cloudFunction.project,
      location: cloudFunction.location,
      cloudFunction: cloudFunction.name,
      role: "roles/cloudfunctions.invoker",
      member: "allUsers", // Public access
    },
    {
      dependsOn: [cloudFunction],
    }
  );

  // ============================================================================
  // Extract Function URL
  // ============================================================================
  // The function URL is available after deployment
  // Format: https://{region}-{project}.cloudfunctions.net/{function-name}
  const functionUrl = cloudFunction.serviceConfig.apply(
    (config) => config?.uri || ""
  );

  return {
    serviceAccount,
    secret: sendgridSecret.secret,
    secretVersion: sendgridSecret.secretVersion,
    sourceBucket,
    sourceArchive,
    cloudFunction,
    functionUrl,
  };
}

/**
 * Helper function to update the contact form function source code
 *
 * This function creates a new BucketObject with updated source code.
 * Use this when you need to deploy a new version of the function.
 *
 * @param sourceBucket - The GCS bucket for function source
 * @param sourceArchivePath - Local path to the function source zip file
 * @returns BucketObject with the new source code
 */
export function updateContactFormSource(
  sourceBucket: gcp.storage.Bucket,
  sourceArchivePath: string
): gcp.storage.BucketObject {
  const config = getConfig();

  return new gcp.storage.BucketObject(
    getResourceName("contact-form-source-update"),
    {
      name: `contact-form-${config.environment}-${Date.now()}.zip`,
      bucket: sourceBucket.name,
      source: new pulumi.asset.FileArchive(sourceArchivePath),
      contentType: "application/zip",
    }
  );
}
