import * as pulumi from "@pulumi/pulumi";
import { getConfig } from "./config";
import { enableApis, createFirebaseHosting, createContactFormInfrastructure } from "./resources";

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
// Cloud Functions - Contact Form
// ============================================================================

const contactForm = createContactFormInfrastructure({
  cloudFunctionsApi: apis.cloudFunctionsApi,
  cloudBuildApi: apis.cloudBuildApi,
  storageApi: apis.storageApi,
  secretManagerApi: apis.secretManagerApi,
});

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

// Contact Form exports
export const contactFormFunctionUrl = contactForm.functionUrl;
export const contactFormFunctionName = contactForm.cloudFunction.name;
export const contactFormServiceAccount = contactForm.serviceAccount.email;
export const contactFormSecretId = contactForm.secret.secretId;
export const contactFormBucket = contactForm.sourceBucket.name;

// Additional exports can be added here as resources are created
// Example:
// export const bucketName = mainBucket.name;
