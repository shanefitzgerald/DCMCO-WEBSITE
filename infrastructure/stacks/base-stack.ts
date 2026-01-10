import { Construct } from "constructs";
import { TerraformStack, GcsBackend } from "cdktf";
import { GoogleProvider } from "@cdktf/provider-google/lib/provider";

/**
 * Configuration for the base stack
 */
export interface BaseStackConfig {
  /**
   * GCP Project ID
   */
  projectId: string;

  /**
   * GCP Region (e.g., 'australia-southeast1')
   */
  region: string;

  /**
   * Environment name (e.g., 'staging', 'production')
   */
  environment: string;

  /**
   * Optional zone within the region (e.g., 'australia-southeast1-a')
   */
  zone?: string;
}

/**
 * Base stack that configures the GCP provider and common settings.
 * All other stacks should extend this class to inherit provider configuration.
 *
 * @example
 * ```typescript
 * class StorageStack extends BaseStack {
 *   constructor(scope: Construct, id: string, config: BaseStackConfig) {
 *     super(scope, id, config);
 *     // Add storage resources here
 *   }
 * }
 * ```
 */
export abstract class BaseStack extends TerraformStack {
  /**
   * The GCP provider instance
   */
  protected readonly provider: GoogleProvider;

  /**
   * The stack configuration
   */
  protected readonly config: BaseStackConfig;

  constructor(scope: Construct, id: string, config: BaseStackConfig) {
    super(scope, id);

    this.config = config;

    // Configure GCS backend for remote state storage
    new GcsBackend(this, {
      bucket: "dcmco-terraform-state",
      prefix: `terraform/state/${config.environment}/${id}`,
    });

    // Configure GCP Provider with authentication
    this.provider = new GoogleProvider(this, "google", {
      project: config.projectId,
      region: config.region,
      zone: config.zone,
    });
  }

  /**
   * Helper method to generate consistent resource labels
   */
  protected getLabels(additionalLabels: Record<string, string> = {}): Record<string, string> {
    return {
      environment: this.config.environment,
      managed_by: "cdktf",
      project: "dcmco-website",
      ...additionalLabels,
    };
  }

  /**
   * Helper method to generate resource names with environment prefix
   */
  protected getResourceName(name: string): string {
    return `dcmco-website-${this.config.environment}-${name}`;
  }
}
