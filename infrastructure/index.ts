import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import { getConfig, getResourceName, getLabels } from "./config";

// Get configuration using type-safe helpers
const config = getConfig();
const labels = getLabels();

// Enable required APIs for Firebase Hosting
const firebaseApi = new gcp.projects.Service(getResourceName("firebase-api"), {
    service: "firebase.googleapis.com",
    project: config.projectId,
    disableOnDestroy: false,
});

const firebaseHostingApi = new gcp.projects.Service(getResourceName("firebase-hosting-api"), {
    service: "firebasehosting.googleapis.com",
    project: config.projectId,
    disableOnDestroy: false,
}, { dependsOn: [firebaseApi] });

const identityToolkitApi = new gcp.projects.Service(getResourceName("identity-toolkit-api"), {
    service: "identitytoolkit.googleapis.com",
    project: config.projectId,
    disableOnDestroy: false,
}, { dependsOn: [firebaseApi] });

// Create Firebase Web App for this stack
const webApp = new gcp.firebase.WebApp(getResourceName("webapp"), {
    project: config.projectId,
    displayName: `DCMCO Website - ${config.environment.charAt(0).toUpperCase() + config.environment.slice(1)}`,
}, { dependsOn: [firebaseApi, identityToolkitApi] });

// Create Firebase Hosting Site
const hostingSite = new gcp.firebase.HostingSite(getResourceName("site"), {
    project: config.projectId,
    siteId: getResourceName("site"),
    appId: webApp.appId,
}, { dependsOn: [firebaseHostingApi] });

// Export important values
export const firebaseProjectId = config.projectId;
export const firebaseSiteId = hostingSite.siteId;
export const firebaseSiteName = hostingSite.name;
export const firebaseDefaultUrl = pulumi.interpolate`https://${hostingSite.siteId}.web.app`;
export const firebaseAppId = webApp.appId;
export const environment = config.environment;
export const region = config.region;
