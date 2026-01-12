import * as gcp from "@pulumi/gcp";
import { getResourceName } from "../config";

/**
 * Firebase Hosting resources
 */
export interface FirebaseResources {
  webApp: gcp.firebase.WebApp;
  hostingSite: gcp.firebase.HostingSite;
}

/**
 * Create Firebase Hosting resources
 * @param projectId - GCP project ID
 * @param environment - Environment name (staging/production)
 * @param dependencies - API services that must be enabled first
 * @returns Firebase resources
 */
export function createFirebaseHosting(
  projectId: string,
  environment: string,
  dependencies: {
    firebaseApi: gcp.projects.Service;
    firebaseHostingApi: gcp.projects.Service;
    identityToolkitApi: gcp.projects.Service;
  }
): FirebaseResources {
  // Create Firebase Web App for this stack
  const webApp = new gcp.firebase.WebApp(getResourceName("webapp"), {
    project: projectId,
    displayName: `DCMCO Website - ${environment.charAt(0).toUpperCase() + environment.slice(1)}`,
  }, {
    dependsOn: [dependencies.firebaseApi, dependencies.identityToolkitApi],
  });

  // Create Firebase Hosting Site
  const hostingSite = new gcp.firebase.HostingSite(getResourceName("site"), {
    project: projectId,
    siteId: getResourceName("site"),
    appId: webApp.appId,
  }, {
    dependsOn: [dependencies.firebaseHostingApi],
  });

  return {
    webApp,
    hostingSite,
  };
}
