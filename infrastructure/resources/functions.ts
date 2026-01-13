import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import { getResourceName, getLabels } from "../config";

/**
 * Cloud Function configuration options
 */
export interface CloudFunctionOptions {
  projectId: string;
  region: string;
  name: string;
  description: string;
  runtime: string;
  entryPoint: string;
  sourceBucket: gcp.storage.Bucket;
  sourceObject: gcp.storage.BucketObject;
  environmentVariables?: Record<string, pulumi.Input<string>>;
  secrets?: Array<{
    key: string;
    projectId: string;
    secret: string;
    version: string;
  }>;
  allowedOrigins?: string[];
  maxInstances?: number;
  minInstances?: number;
  availableMemoryMb?: number;
  timeout?: number;
  labels?: Record<string, string>;
  dependencies?: pulumi.Resource[];
}

/**
 * Create a Cloud Function (Gen 2)
 * @param options - Function configuration options
 * @returns Cloud Function resource
 */
export function createCloudFunction(options: CloudFunctionOptions): gcp.cloudfunctionsv2.Function {
  const {
    projectId,
    region,
    name,
    description,
    runtime,
    entryPoint,
    sourceBucket,
    sourceObject,
    environmentVariables = {},
    secrets = [],
    allowedOrigins = [],
    maxInstances = 10,
    minInstances = 0,
    availableMemoryMb = 256,
    timeout = 60,
    labels = getLabels(),
    dependencies = [],
  } = options;

  // Build environment variables with CORS origins if provided
  const finalEnvVars = { ...environmentVariables };
  if (allowedOrigins.length > 0) {
    finalEnvVars.ALLOWED_ORIGINS = allowedOrigins.join(",");
  }

  // Build secret environment variables
  const secretEnvVars = secrets.map(s => ({
    key: s.key,
    projectId: s.projectId,
    secret: s.secret,
    version: s.version,
  }));

  const cloudFunction = new gcp.cloudfunctionsv2.Function(getResourceName(name), {
    name: getResourceName(name),
    project: projectId,
    location: region,
    description: description,
    labels: labels,

    buildConfig: {
      runtime: runtime,
      entryPoint: entryPoint,
      source: {
        storageSource: {
          bucket: sourceBucket.name,
          object: sourceObject.name,
        },
      },
    },

    serviceConfig: {
      maxInstanceCount: maxInstances,
      minInstanceCount: minInstances,
      availableMemory: `${availableMemoryMb}M`,
      timeoutSeconds: timeout,
      environmentVariables: finalEnvVars,
      secretEnvironmentVariables: secretEnvVars.length > 0 ? secretEnvVars : undefined,
      ingressSettings: "ALLOW_ALL",
      allTrafficOnLatestRevision: true,
    },
  }, {
    dependsOn: dependencies,
  });

  return cloudFunction;
}

/**
 * Make a Cloud Function publicly accessible
 * @param cloudFunction - The Cloud Function to make public
 * @returns IAM member binding
 */
export function makeCloudFunctionPublic(
  cloudFunction: gcp.cloudfunctionsv2.Function
): gcp.cloudfunctionsv2.FunctionIamMember {
  return new gcp.cloudfunctionsv2.FunctionIamMember(`${cloudFunction.name}-public-invoker`, {
    project: cloudFunction.project,
    location: cloudFunction.location,
    cloudFunction: cloudFunction.name,
    role: "roles/cloudfunctions.invoker",
    member: "allUsers",
  });
}
