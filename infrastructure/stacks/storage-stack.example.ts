import { Construct } from "constructs";
// import { TerraformOutput } from "cdktf";
import { BaseStack, BaseStackConfig } from "./base-stack";
// import { StorageBucket } from "@cdktf/provider-google/lib/storage-bucket";

/**
 * Configuration for the Storage Stack
 * Extends BaseStackConfig to include storage-specific settings
 */
export interface StorageStackExampleConfig extends BaseStackConfig {
  /**
   * The name of the GCS bucket to create
   */
  bucketName: string;

  /**
   * The location/region for the bucket
   */
  bucketLocation: string;

  /**
   * Optional: Whether to enable versioning
   */
  enableVersioning?: boolean;
}

/**
 * Example Storage Stack Template
 *
 * This stack demonstrates the structure for creating storage resources.
 * It extends BaseStack to inherit common configuration and provider setup.
 */
export class StorageStackExample extends BaseStack {
  /**
   * The configuration for this stack
   */
  protected readonly config: StorageStackExampleConfig;

  /**
   * Publicly accessible resource properties
   * Useful when other stacks need to reference resources created here
   */
  // public readonly bucket: StorageBucket;

  constructor(scope: Construct, id: string, config: StorageStackExampleConfig) {
    super(scope, id, config);
    this.config = config;

    this.createStorageResources();
    this.createOutputs();
  }

  /**
   * Create storage resources
   */
  private createStorageResources(): void {
    // 1. Define the GCS Bucket
    // -----------------------
    // this.bucket = new StorageBucket(this, "website-bucket", {
    //   name: this.getResourceName(this.config.bucketName),
    //   location: this.config.bucketLocation,
    //   forceDestroy: this.config.environment !== "production", // Protect production buckets
    //   
    //   website: {
    //     mainPageSuffix: "index.html",
    //     notFoundPage: "404.html",
    //   },
    //
    //   versioning: {
    //     enabled: this.config.enableVersioning ?? false,
    //   },
    //
    //   labels: this.getLabels({
    //     component: "storage",
    //   }),
    // });

    // 2. Configure Access Control (IAM)
    // -------------------------------
    // new StorageBucketIamMember(this, "public-read", {
    //   bucket: this.bucket.name,
    //   role: "roles/storage.objectViewer",
    //   member: "allUsers",
    // });
  }

  /**
   * Create Terraform outputs
   * These values will be displayed after 'cdktf deploy'
   */
  private createOutputs(): void {
    // new TerraformOutput(this, "bucket-name", {
    //   value: this.bucket.name,
    //   description: "The name of the created GCS bucket",
    // });
    //
    // new TerraformOutput(this, "bucket-url", {
    //   value: `https://storage.googleapis.com/${this.bucket.name}`,
    //   description: "The public URL of the bucket",
    // });
  }
}
