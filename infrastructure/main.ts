import { Construct } from "constructs";
import { App, TerraformStack, TerraformOutput } from "cdktf";
import { GoogleProvider } from "@cdktf/provider-google/lib/provider";
import { StorageBucket } from "@cdktf/provider-google/lib/storage-bucket";
import { StorageBucketIamBinding } from "@cdktf/provider-google/lib/storage-bucket-iam-binding";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

interface WebsiteStackConfig {
  projectId: string;
  region: string;
  bucketName: string;
  bucketLocation: string;
  environment: string;
}

class WebsiteStack extends TerraformStack {
  constructor(scope: Construct, id: string, config: WebsiteStackConfig) {
    super(scope, id);

    // Configure GCP Provider
    new GoogleProvider(this, "google", {
      project: config.projectId,
      region: config.region,
    });

    // Create GCS bucket for static website hosting
    const bucket = new StorageBucket(this, "website-bucket", {
      name: config.bucketName,
      location: config.bucketLocation,
      storageClass: "STANDARD",
      uniformBucketLevelAccess: true,

      website: {
        mainPageSuffix: "index.html",
        notFoundPage: "404.html",
      },

      cors: [
        {
          origin: ["*"],
          method: ["GET", "HEAD"],
          responseHeader: ["*"],
          maxAgeSeconds: 3600,
        },
      ],

      labels: {
        environment: config.environment,
        managed_by: "cdktf",
        project: "dcmco-website",
      },
    });

    // Make bucket publicly readable
    new StorageBucketIamBinding(this, "public-read", {
      bucket: bucket.name,
      role: "roles/storage.objectViewer",
      members: ["allUsers"],
    });

    // Outputs
    new TerraformOutput(this, "bucket-name", {
      value: bucket.name,
      description: "The name of the GCS bucket",
    });

    new TerraformOutput(this, "bucket-url", {
      value: bucket.url,
      description: "The base URL of the bucket",
    });

    new TerraformOutput(this, "website-url", {
      value: `https://storage.googleapis.com/${bucket.name}/index.html`,
      description: "The URL to access the website",
    });
  }
}

// Initialize the app
const app = new App();

// Get configuration from environment variables
const config: WebsiteStackConfig = {
  projectId: process.env.GCP_PROJECT_ID || "dcmco-prod-2026",
  region: process.env.GCP_REGION || "australia-southeast1",
  bucketName: process.env.GCS_BUCKET_NAME || "dcmco-website-prod",
  bucketLocation: process.env.GCS_BUCKET_LOCATION || "AUSTRALIA-SOUTHEAST1",
  environment: process.env.ENVIRONMENT || "production",
};

// Create the stack
new WebsiteStack(app, "dcmco-website", config);

// Synthesize the stack
app.synth();
