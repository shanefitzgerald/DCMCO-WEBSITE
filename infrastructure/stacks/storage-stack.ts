import { Construct } from "constructs";
import { TerraformOutput } from "cdktf";
import { StorageBucket } from "@cdktf/provider-google/lib/storage-bucket";
import { StorageBucketIamBinding } from "@cdktf/provider-google/lib/storage-bucket-iam-binding";
import { BaseStack, BaseStackConfig } from "./base-stack";

/**
 * Configuration for the Storage stack
 */
export interface StorageStackConfig extends BaseStackConfig {
  /**
   * Name of the GCS bucket
   */
  bucketName: string;

  /**
   * Location for the bucket (e.g., 'AUSTRALIA-SOUTHEAST1')
   */
  bucketLocation: string;

  /**
   * Whether to enable public access to the bucket
   * @default true
   */
  publicAccess?: boolean;

  /**
   * Custom domain name for the website (optional)
   */
  domainName?: string;
}

/**
 * Storage stack that creates and configures GCS buckets for static website hosting.
 * Includes bucket creation, public access configuration, and CORS settings.
 */
export class StorageStack extends BaseStack {
  /**
   * The GCS bucket for website hosting
   */
  public readonly bucket: StorageBucket;

  constructor(scope: Construct, id: string, config: StorageStackConfig) {
    super(scope, id, config);

    // Create GCS bucket for static website hosting
    this.bucket = new StorageBucket(this, "website-bucket", {
      name: config.bucketName,
      location: config.bucketLocation,
      storageClass: "STANDARD",
      uniformBucketLevelAccess: true,

      // Configure for static website hosting
      website: {
        mainPageSuffix: "index.html",
        notFoundPage: "404.html",
      },

      // Enable CORS for cross-origin requests
      cors: [
        {
          origin: ["*"],
          method: ["GET", "HEAD"],
          responseHeader: ["*"],
          maxAgeSeconds: 3600,
        },
      ],

      // Apply consistent labels
      labels: this.getLabels({
        component: "storage",
      }),
    });

    // Make bucket publicly readable if enabled
    if (config.publicAccess !== false) {
      new StorageBucketIamBinding(this, "public-read", {
        bucket: this.bucket.name,
        role: "roles/storage.objectViewer",
        members: ["allUsers"],
      });
    }

    // Outputs
    new TerraformOutput(this, "bucket-name", {
      value: this.bucket.name,
      description: "The name of the GCS bucket",
    });

    new TerraformOutput(this, "bucket-url", {
      value: this.bucket.url,
      description: "The base URL of the bucket",
    });

    new TerraformOutput(this, "website-url", {
      value: config.domainName
        ? `https://${config.domainName}`
        : `https://storage.googleapis.com/${this.bucket.name}/index.html`,
      description: "The URL to access the website",
    });
  }
}
