import { App } from "cdktf";
import * as dotenv from "dotenv";
import { StorageStack, StorageStackConfig } from "./stacks";

/**
 * DCMCO Website Infrastructure
 *
 * This is the main entry point for the CDKTF infrastructure.
 * It loads environment configuration and instantiates all necessary stacks.
 *
 * Stack Structure:
 * - StorageStack: GCS bucket for static website hosting
 * - CdnStack: (Future) Cloud CDN and Load Balancer configuration
 * - FunctionsStack: (Future) Cloud Functions for serverless features
 *
 * Environment Configuration:
 * Configuration is loaded from the .env file in this directory.
 * See .env.example for available configuration options.
 */

// Load environment variables from .env file
dotenv.config();

/**
 * Get configuration from environment variables with fallbacks
 */
function getConfig(): StorageStackConfig {
  return {
    // GCP Project Configuration
    projectId: process.env.GCP_PROJECT_ID || "dcmco-prod-2026",
    region: process.env.GCP_REGION || "australia-southeast1",
    zone: process.env.GCP_ZONE,

    // Environment
    environment: process.env.ENVIRONMENT || "staging",

    // Storage Configuration
    bucketName: process.env.GCS_BUCKET_NAME || "dcmco-website-staging",
    bucketLocation: process.env.GCS_BUCKET_LOCATION || "AUSTRALIA-SOUTHEAST1",

    // Optional: Custom domain (when available)
    domainName: process.env.DOMAIN_NAME,
  };
}

/**
 * Initialize the CDKTF App
 */
const app = new App();

/**
 * Load configuration
 */
const config = getConfig();

/**
 * Create the Storage Stack
 * Manages the GCS bucket for static website hosting with public access
 */
new StorageStack(app, "dcmco-website-storage", config);

/**
 * Future Stacks (uncomment when ready to implement):
 *
 * // CDN Stack - Cloud CDN with Load Balancer
 * new CdnStack(app, "dcmco-website-cdn", {
 *   ...config,
 *   bucketName: storageStack.bucket.name,
 * });
 *
 * // Functions Stack - Serverless functions for dynamic features
 * new FunctionsStack(app, "dcmco-website-functions", {
 *   ...config,
 *   bucketName: storageStack.bucket.name,
 * });
 */

/**
 * Synthesize all stacks to Terraform configuration
 */
app.synth();
