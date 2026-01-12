import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

// Get the current stack name (staging or production)
const stack = pulumi.getStack();
const gcpConfig = new pulumi.Config("gcp");
const projectId = gcpConfig.require("project");

// Enable required APIs for Firebase Hosting
const firebaseApi = new gcp.projects.Service("firebase-api", {
    service: "firebase.googleapis.com",
    project: projectId,
    disableOnDestroy: false,
});

const firebaseHostingApi = new gcp.projects.Service("firebase-hosting-api", {
    service: "firebasehosting.googleapis.com",
    project: projectId,
    disableOnDestroy: false,
}, { dependsOn: [firebaseApi] });

const identityToolkitApi = new gcp.projects.Service("identity-toolkit-api", {
    service: "identitytoolkit.googleapis.com",
    project: projectId,
    disableOnDestroy: false,
}, { dependsOn: [firebaseApi] });

// Create Firebase Web App for this stack
const webApp = new gcp.firebase.WebApp(`dcmco-${stack}-webapp`, {
    project: projectId,
    displayName: `DCMCO Website - ${stack.charAt(0).toUpperCase() + stack.slice(1)}`,
}, { dependsOn: [firebaseApi, identityToolkitApi] });

// Create Firebase Hosting Site
const hostingSite = new gcp.firebase.HostingSite(`dcmco-${stack}-site`, {
    project: projectId,
    siteId: `dcmco-${stack}`,
    appId: webApp.appId,
}, { dependsOn: [firebaseHostingApi] });

// Export important values
export const firebaseProjectId = projectId;
export const firebaseSiteId = hostingSite.siteId;
export const firebaseSiteName = hostingSite.name;
export const firebaseDefaultUrl = pulumi.interpolate`https://${hostingSite.siteId}.web.app`;
export const firebaseAppId = webApp.appId;
