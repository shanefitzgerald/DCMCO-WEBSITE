/**
 * Configuration Module
 *
 * This module handles loading and validating environment variables
 * with type-safe defaults and comprehensive error handling.
 */

import * as dotenv from "dotenv";
import { StorageStackConfig, FunctionsStackConfig } from "./stacks";

// Load environment variables from .env file
dotenv.config();

/**
 * Required environment variables
 */
const REQUIRED_VARS = [
  "GCP_PROJECT_ID",
  "GCS_BUCKET_NAME",
] as const;

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_VARS = {
  GCP_REGION: "us-central1",
  ENVIRONMENT: "staging",
  GCS_BUCKET_LOCATION: "US",
} as const;

/**
 * Environment variable configuration interface
 */
export interface EnvironmentConfig {
  // Required
  GCP_PROJECT_ID: string;
  GCS_BUCKET_NAME: string;

  // Optional with defaults
  GCP_REGION: string;
  ENVIRONMENT: string;
  GCS_BUCKET_LOCATION: string;
  GCP_ZONE?: string;
  DOMAIN_NAME?: string;

  // Advanced options
  ENABLE_BUCKET_VERSIONING?: boolean;
  BUCKET_LIFECYCLE_DAYS?: number;
  UNIFORM_BUCKET_LEVEL_ACCESS?: boolean;

  // Cloud Functions configuration
  SENDGRID_API_KEY?: string;
  EMAIL_RECIPIENT?: string;
  FROM_EMAIL?: string;
  ALLOWED_ORIGINS?: string;
  FUNCTION_MEMORY_MB?: number;
  FUNCTION_TIMEOUT_SECONDS?: number;
  FUNCTION_MAX_INSTANCES?: number;
  FUNCTION_MIN_INSTANCES?: number;
}

/**
 * Validation error class for environment configuration
 */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

/**
 * Get an environment variable with optional default
 */
function getEnvVar(key: string, defaultValue?: string): string | undefined {
  const value = process.env[key];
  if (value === undefined || value === "") {
    return defaultValue;
  }
  return value;
}

/**
 * Get a boolean environment variable
 */
function getBooleanEnvVar(key: string, defaultValue: boolean = false): boolean {
  const value = getEnvVar(key);
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === "true" || value === "1";
}

/**
 * Get a number environment variable
 */
function getNumberEnvVar(key: string, defaultValue?: number): number | undefined {
  const value = getEnvVar(key);
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new ConfigurationError(`${key} must be a valid number, got: ${value}`);
  }
  return parsed;
}

/**
 * Validate that required environment variables are set
 */
function validateRequiredVars(): void {
  const missing: string[] = [];

  for (const varName of REQUIRED_VARS) {
    const value = getEnvVar(varName);
    if (!value) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new ConfigurationError(
      `Missing required environment variables: ${missing.join(", ")}\n\n` +
      `Please copy .env.example to .env and fill in the required values:\n` +
      `  cp .env.example .env\n\n` +
      `Then edit .env with your configuration.`
    );
  }
}

/**
 * Validate environment variable values
 */
function validateValues(config: EnvironmentConfig): void {
  // Validate GCP_PROJECT_ID format
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(config.GCP_PROJECT_ID)) {
    console.warn(
      `Warning: GCP_PROJECT_ID "${config.GCP_PROJECT_ID}" may not be valid.\n` +
      `Project IDs must be 6-30 characters, start with a lowercase letter,\n` +
      `and contain only lowercase letters, numbers, and hyphens.`
    );
  }

  // Validate ENVIRONMENT
  const validEnvironments = ["development", "staging", "production", "test"];
  if (!validEnvironments.includes(config.ENVIRONMENT.toLowerCase())) {
    console.warn(
      `Warning: ENVIRONMENT "${config.ENVIRONMENT}" is not standard.\n` +
      `Common values: development, staging, production, test`
    );
  }

  // Validate GCS_BUCKET_NAME format
  if (!/^[a-z0-9][a-z0-9-_.]{1,61}[a-z0-9]$/.test(config.GCS_BUCKET_NAME)) {
    console.warn(
      `Warning: GCS_BUCKET_NAME "${config.GCS_BUCKET_NAME}" may not be valid.\n` +
      `Bucket names must be 3-63 characters, start/end with lowercase letter or number,\n` +
      `and contain only lowercase letters, numbers, hyphens, underscores, and dots.`
    );
  }

  // Validate bucket lifecycle days
  if (config.BUCKET_LIFECYCLE_DAYS !== undefined && config.BUCKET_LIFECYCLE_DAYS < 1) {
    throw new ConfigurationError(
      `BUCKET_LIFECYCLE_DAYS must be at least 1, got: ${config.BUCKET_LIFECYCLE_DAYS}`
    );
  }
}

/**
 * Load and validate environment configuration
 * @throws {ConfigurationError} If required variables are missing or invalid
 */
export function loadEnvironmentConfig(): EnvironmentConfig {
  // Check for .env file
  try {
    dotenv.config({ path: ".env" });
  } catch (error) {
    console.warn("Warning: Could not load .env file. Using environment variables.");
  }

  // Validate required variables
  validateRequiredVars();

  // Build configuration object
  const config: EnvironmentConfig = {
    // Required variables
    GCP_PROJECT_ID: getEnvVar("GCP_PROJECT_ID")!,
    GCS_BUCKET_NAME: getEnvVar("GCS_BUCKET_NAME")!,

    // Optional variables with defaults
    GCP_REGION: getEnvVar("GCP_REGION", OPTIONAL_VARS.GCP_REGION)!,
    ENVIRONMENT: getEnvVar("ENVIRONMENT", OPTIONAL_VARS.ENVIRONMENT)!,
    GCS_BUCKET_LOCATION: getEnvVar("GCS_BUCKET_LOCATION", OPTIONAL_VARS.GCS_BUCKET_LOCATION)!,

    // Optional variables without defaults
    GCP_ZONE: getEnvVar("GCP_ZONE"),
    DOMAIN_NAME: getEnvVar("DOMAIN_NAME"),

    // Advanced options
    ENABLE_BUCKET_VERSIONING: getBooleanEnvVar("ENABLE_BUCKET_VERSIONING", false),
    BUCKET_LIFECYCLE_DAYS: getNumberEnvVar("BUCKET_LIFECYCLE_DAYS"),
    UNIFORM_BUCKET_LEVEL_ACCESS: getBooleanEnvVar("UNIFORM_BUCKET_LEVEL_ACCESS", true),

    // Cloud Functions configuration
    SENDGRID_API_KEY: getEnvVar("SENDGRID_API_KEY"),
    EMAIL_RECIPIENT: getEnvVar("EMAIL_RECIPIENT"),
    FROM_EMAIL: getEnvVar("FROM_EMAIL"),
    ALLOWED_ORIGINS: getEnvVar("ALLOWED_ORIGINS"),
    FUNCTION_MEMORY_MB: getNumberEnvVar("FUNCTION_MEMORY_MB"),
    FUNCTION_TIMEOUT_SECONDS: getNumberEnvVar("FUNCTION_TIMEOUT_SECONDS"),
    FUNCTION_MAX_INSTANCES: getNumberEnvVar("FUNCTION_MAX_INSTANCES"),
    FUNCTION_MIN_INSTANCES: getNumberEnvVar("FUNCTION_MIN_INSTANCES"),
  };

  // Validate configuration values
  validateValues(config);

  return config;
}

/**
 * Convert environment config to StorageStackConfig
 */
export function getStorageStackConfig(envConfig: EnvironmentConfig): StorageStackConfig {
  return {
    projectId: envConfig.GCP_PROJECT_ID,
    region: envConfig.GCP_REGION,
    zone: envConfig.GCP_ZONE,
    environment: envConfig.ENVIRONMENT,
    bucketName: envConfig.GCS_BUCKET_NAME,
    bucketLocation: envConfig.GCS_BUCKET_LOCATION,
    domainName: envConfig.DOMAIN_NAME,
    publicAccess: true, // Always true for static website hosting
  };
}

/**
 * Convert environment config to FunctionsStackConfig
 */
export function getFunctionsStackConfig(envConfig: EnvironmentConfig): FunctionsStackConfig {
  // Parse allowed origins from comma-separated string
  const allowedOrigins = envConfig.ALLOWED_ORIGINS
    ? envConfig.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
    : getDefaultAllowedOrigins(envConfig.ENVIRONMENT);

  return {
    projectId: envConfig.GCP_PROJECT_ID,
    region: envConfig.GCP_REGION,
    zone: envConfig.GCP_ZONE,
    environment: envConfig.ENVIRONMENT,
    allowedOrigins,
    sendgridApiKey: envConfig.SENDGRID_API_KEY,
    emailRecipient: envConfig.EMAIL_RECIPIENT,
    fromEmail: envConfig.FROM_EMAIL,
    memoryMb: envConfig.FUNCTION_MEMORY_MB,
    timeoutSeconds: envConfig.FUNCTION_TIMEOUT_SECONDS,
    maxInstances: envConfig.FUNCTION_MAX_INSTANCES,
    minInstances: envConfig.FUNCTION_MIN_INSTANCES,
  };
}

/**
 * Get default allowed origins based on environment
 */
function getDefaultAllowedOrigins(environment: string): string[] {
  const defaults = ["http://localhost:3000"];

  if (environment === "production") {
    defaults.push("https://dcmco-prod-2026.web.app");
  } else if (environment === "staging") {
    defaults.push("https://dcmco-staging.web.app");
  }

  return defaults;
}

/**
 * Print configuration summary (without sensitive data)
 */
export function printConfigSummary(config: EnvironmentConfig): void {
  console.log("📋 Configuration loaded:");
  console.log(`   Environment: ${config.ENVIRONMENT}`);
  console.log(`   GCP Project: ${config.GCP_PROJECT_ID}`);
  console.log(`   GCP Region: ${config.GCP_REGION}`);
  if (config.GCP_ZONE) {
    console.log(`   GCP Zone: ${config.GCP_ZONE}`);
  }
  console.log(`   Bucket: ${config.GCS_BUCKET_NAME}`);
  console.log(`   Bucket Location: ${config.GCS_BUCKET_LOCATION}`);
  if (config.DOMAIN_NAME) {
    console.log(`   Domain: ${config.DOMAIN_NAME}`);
  }
  console.log("");
}
