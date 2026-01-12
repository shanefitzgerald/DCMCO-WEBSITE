import * as pulumi from "@pulumi/pulumi";

/**
 * Configuration interface for the Pulumi stack
 */
export interface StackConfig {
  /** GCP Project ID */
  projectId: string;
  /** GCP Region */
  region: string;
  /** Stack/Environment name (staging, production) */
  environment: string;
}

/**
 * Retrieves and validates Pulumi configuration values
 * @returns Typed configuration object with all required values
 */
export function getConfig(): StackConfig {
  const stack = pulumi.getStack();
  const gcpConfig = new pulumi.Config("gcp");

  return {
    projectId: gcpConfig.require("project"),
    region: gcpConfig.get("region") || "australia-southeast1",
    environment: stack,
  };
}

/**
 * Formats a resource name with environment prefix
 * @param name - Base name for the resource
 * @param separator - Character to use between prefix and name (default: "-")
 * @returns Formatted resource name (e.g., "dcmco-staging-bucket")
 *
 * @example
 * ```typescript
 * getResourceName("bucket") // "dcmco-staging-bucket"
 * getResourceName("api", "_") // "dcmco_staging_api"
 * ```
 */
export function getResourceName(name: string, separator: string = "-"): string {
  const config = getConfig();
  return `dcmco${separator}${config.environment}${separator}${name}`;
}

/**
 * Returns standard GCP labels for resource tagging
 * @param additionalLabels - Optional additional labels to merge with standard labels
 * @returns Object containing standard labels (environment, project, managed-by)
 *
 * @example
 * ```typescript
 * getLabels() // { environment: "staging", project: "dcmco-website", "managed-by": "pulumi" }
 * getLabels({ team: "platform" }) // includes team label
 * ```
 */
export function getLabels(additionalLabels: Record<string, string> = {}): Record<string, string> {
  const config = getConfig();

  const standardLabels = {
    environment: config.environment,
    project: "dcmco-website",
    "managed-by": "pulumi",
  };

  return {
    ...standardLabels,
    ...additionalLabels,
  };
}

/**
 * Gets the full GCP project identifier
 * @returns The GCP project ID
 */
export function getProjectId(): string {
  return getConfig().projectId;
}

/**
 * Gets the configured GCP region
 * @returns The GCP region
 */
export function getRegion(): string {
  return getConfig().region;
}

/**
 * Gets the current environment/stack name
 * @returns The environment name (staging, production)
 */
export function getEnvironment(): string {
  return getConfig().environment;
}

/**
 * Checks if the current stack is production
 * @returns true if running in production environment
 */
export function isProduction(): boolean {
  return getConfig().environment === "production";
}

/**
 * Checks if the current stack is staging
 * @returns true if running in staging environment
 */
export function isStaging(): boolean {
  return getConfig().environment === "staging";
}
