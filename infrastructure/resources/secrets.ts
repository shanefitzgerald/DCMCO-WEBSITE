import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import { getResourceName, getLabels } from "../config";

/**
 * Secret Manager secret configuration options
 */
export interface SecretOptions {
  projectId: string;
  secretId: string;
  secretValue: pulumi.Input<string>;
  labels?: Record<string, string>;
  dependencies?: gcp.projects.Service[];
}

/**
 * Create a Secret Manager secret with a secret version
 * @param options - Secret configuration options
 * @returns Object containing secret and secret version
 */
export function createSecret(options: SecretOptions): {
  secret: gcp.secretmanager.Secret;
  secretVersion: gcp.secretmanager.SecretVersion;
} {
  const {
    projectId,
    secretId,
    secretValue,
    labels = getLabels(),
    dependencies = [],
  } = options;

  const secret = new gcp.secretmanager.Secret(getResourceName(secretId), {
    secretId: getResourceName(secretId),
    project: projectId,
    labels: labels,
    replication: {
      auto: {},
    },
  }, {
    dependsOn: dependencies,
  });

  const secretVersion = new gcp.secretmanager.SecretVersion(`${getResourceName(secretId)}-version`, {
    secret: secret.id,
    secretData: secretValue,
  });

  return {
    secret,
    secretVersion,
  };
}

/**
 * Grant a service account access to a secret
 * @param secret - The Secret Manager secret
 * @param serviceAccountEmail - Service account email to grant access
 * @returns IAM member binding
 */
export function grantSecretAccess(
  secret: gcp.secretmanager.Secret,
  serviceAccountEmail: pulumi.Input<string>
): gcp.secretmanager.SecretIamMember {
  return new gcp.secretmanager.SecretIamMember(`${secret.secretId}-accessor`, {
    secretId: secret.id,
    role: "roles/secretmanager.secretAccessor",
    member: pulumi.interpolate`serviceAccount:${serviceAccountEmail}`,
  });
}
