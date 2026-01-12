import * as pulumi from "@pulumi/pulumi";
import { getConfig } from "./config";
import { enableApis, createFirebaseHosting } from "./resources";

// ============================================================================
// Configuration
// ============================================================================

// Get configuration using type-safe helpers
const config = getConfig();

// ============================================================================
// Enable Required GCP APIs
// ============================================================================

const apis = enableApis(config.projectId);

// ============================================================================
// Firebase Hosting
// ============================================================================

const firebase = createFirebaseHosting(
  config.projectId,
  config.environment,
  {
    firebaseApi: apis.firebaseApi,
    firebaseHostingApi: apis.firebaseHostingApi,
    identityToolkitApi: apis.identityToolkitApi,
  }
);

// ============================================================================
// Cloud Storage Buckets
// ============================================================================
// TODO: Add GCS buckets when needed
// Example:
// import { createStorageBucket, createFunctionSourceBucket } from "./resources";
//
// const mainBucket = createStorageBucket({
//   projectId: config.projectId,
//   region: config.region,
//   dependencies: [apis.storageApi],
// });

// ============================================================================
// Secret Manager Secrets
// ============================================================================
// TODO: Add secrets when needed
// Example:
// import { createSecret } from "./resources";
// const appConfig = new pulumi.Config("dcmco-website");
//
// const sendgridSecret = createSecret({
//   projectId: config.projectId,
//   secretId: "sendgrid-api-key",
//   secretValue: appConfig.requireSecret("sendgridApiKey"),
//   dependencies: [apis.secretManagerApi],
// });

// ============================================================================
// Service Accounts
// ============================================================================
// TODO: Add service accounts when needed
// Example:
// import { createServiceAccount, grantProjectRole } from "./resources";
//
// const functionServiceAccount = createServiceAccount({
//   projectId: config.projectId,
//   accountId: "cloud-function-sa",
//   displayName: "Cloud Function Service Account",
//   description: "Service account for Cloud Functions",
// });

// ============================================================================
// Cloud Functions
// ============================================================================
// TODO: Add Cloud Functions when needed
// Example:
// import { createCloudFunction, makeCloudFunctionPublic } from "./resources";
//
// const contactFormFunction = createCloudFunction({
//   projectId: config.projectId,
//   region: config.region,
//   name: "contact-form",
//   description: "Contact form handler",
//   runtime: "nodejs20",
//   entryPoint: "handleContactForm",
//   sourceBucket: functionSourceBucket,
//   sourceObject: functionSource,
//   environmentVariables: {
//     EMAIL_FROM: appConfig.require("emailFrom"),
//     EMAIL_REPLY_TO: appConfig.require("emailReplyTo"),
//   },
//   allowedOrigins: appConfig.require("allowedOrigins").split(","),
//   dependencies: [apis.cloudFunctionsApi, apis.cloudBuildApi],
// });
//
// makeCloudFunctionPublic(contactFormFunction);

// ============================================================================
// Stack Exports
// ============================================================================

// Configuration exports
export const projectId = config.projectId;
export const environment = config.environment;
export const region = config.region;

// Firebase Hosting exports
export const firebaseProjectId = config.projectId;
export const firebaseSiteId = firebase.hostingSite.siteId;
export const firebaseSiteName = firebase.hostingSite.name;
export const firebaseDefaultUrl = pulumi.interpolate`https://${firebase.hostingSite.siteId}.web.app`;
export const firebaseAppId = firebase.webApp.appId;

// Additional exports can be added here as resources are created
// Example:
// export const functionUrl = contactFormFunction.serviceConfig.uri;
// export const bucketName = mainBucket.name;
