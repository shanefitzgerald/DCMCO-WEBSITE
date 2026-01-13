import * as gcp from "@pulumi/gcp";
import { getResourceName } from "../config";

/**
 * Enable required GCP APIs for the project
 * @param projectId - GCP project ID
 * @returns Object containing enabled API services
 */
export function enableApis(projectId: string) {
  // Firebase APIs
  const firebaseApi = new gcp.projects.Service(getResourceName("firebase-api"), {
    service: "firebase.googleapis.com",
    project: projectId,
    disableOnDestroy: false,
  });

  const firebaseHostingApi = new gcp.projects.Service(getResourceName("firebase-hosting-api"), {
    service: "firebasehosting.googleapis.com",
    project: projectId,
    disableOnDestroy: false,
  }, { dependsOn: [firebaseApi] });

  const identityToolkitApi = new gcp.projects.Service(getResourceName("identity-toolkit-api"), {
    service: "identitytoolkit.googleapis.com",
    project: projectId,
    disableOnDestroy: false,
  }, { dependsOn: [firebaseApi] });

  // Cloud Functions APIs (for future use)
  const cloudFunctionsApi = new gcp.projects.Service(getResourceName("cloudfunctions-api"), {
    service: "cloudfunctions.googleapis.com",
    project: projectId,
    disableOnDestroy: false,
  });

  const cloudBuildApi = new gcp.projects.Service(getResourceName("cloudbuild-api"), {
    service: "cloudbuild.googleapis.com",
    project: projectId,
    disableOnDestroy: false,
  });

  // Storage API (for GCS buckets)
  const storageApi = new gcp.projects.Service(getResourceName("storage-api"), {
    service: "storage.googleapis.com",
    project: projectId,
    disableOnDestroy: false,
  });

  // Secret Manager API (for secrets)
  const secretManagerApi = new gcp.projects.Service(getResourceName("secretmanager-api"), {
    service: "secretmanager.googleapis.com",
    project: projectId,
    disableOnDestroy: false,
  });

  return {
    firebaseApi,
    firebaseHostingApi,
    identityToolkitApi,
    cloudFunctionsApi,
    cloudBuildApi,
    storageApi,
    secretManagerApi,
  };
}
