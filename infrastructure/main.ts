import { App } from "cdktf";
import { StorageStack } from "./stacks";
import {
  loadEnvironmentConfig,
  getStorageStackConfig,
  printConfigSummary,
  ConfigurationError
} from "./config";

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
 * See .env.example for available configuration options and setup instructions.
 *
 * Usage:
 *   1. Copy .env.example to .env
 *   2. Fill in required values
 *   3. Run: pnpm run verify
 *   4. Run: pnpm run synth
 */

/**
 * Initialize the CDKTF App
 */
const app = new App();

/**
 * Load and validate configuration
 */
let config;
try {
  const envConfig = loadEnvironmentConfig();
  printConfigSummary(envConfig);
  config = getStorageStackConfig(envConfig);
} catch (error) {
  if (error instanceof ConfigurationError) {
    console.error(`\n❌ Configuration Error:\n${error.message}\n`);
    process.exit(1);
  }
  throw error;
}

/**
 * Create the Storage Stack
 * Manages the GCS bucket for static website hosting with public access
 */
new StorageStack(app, "dcmco-website-storage", config);

/**
 * Example Stack Instantiation (from storage-stack.example.ts):
 *
 * // import { StorageStackExample } from "./stacks/storage-stack.example";
 *
 * // new StorageStackExample(app, "example-storage-stack", {
 * //   ...config,
 * //   bucketName: "example-bucket-name",
 * //   bucketLocation: "AUSTRALIA-SOUTHEAST1",
 * //   enableVersioning: true,
 * // });
 */

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
