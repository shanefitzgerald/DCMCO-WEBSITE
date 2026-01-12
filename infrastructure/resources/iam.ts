import * as gcp from "@pulumi/gcp";
import { getResourceName } from "../config";

/**
 * Service account configuration options
 */
export interface ServiceAccountOptions {
  projectId: string;
  accountId: string;
  displayName: string;
  description?: string;
}

/**
 * Create a service account
 * @param options - Service account configuration options
 * @returns Service account resource
 */
export function createServiceAccount(options: ServiceAccountOptions): gcp.serviceaccount.Account {
  const {
    projectId,
    accountId,
    displayName,
    description,
  } = options;

  return new gcp.serviceaccount.Account(getResourceName(accountId), {
    project: projectId,
    accountId: getResourceName(accountId),
    displayName: displayName,
    description: description,
  });
}

/**
 * Grant a role to a service account on a project
 * @param serviceAccount - The service account
 * @param projectId - GCP project ID
 * @param role - IAM role to grant
 * @param resourceName - Optional custom resource name
 * @returns IAM member binding
 */
export function grantProjectRole(
  serviceAccount: gcp.serviceaccount.Account,
  projectId: string,
  role: string,
  resourceName?: string
): gcp.projects.IAMMember {
  const roleName = role.replace(/[^a-zA-Z0-9]/g, "-");
  const finalResourceName = resourceName || getResourceName(`sa-${roleName}`);

  return new gcp.projects.IAMMember(finalResourceName, {
    project: projectId,
    role: role,
    member: serviceAccount.email.apply(email => `serviceAccount:${email}`),
  });
}
