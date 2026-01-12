import * as gcp from "@pulumi/gcp";
import { getResourceName, getLabels } from "../config";

/**
 * Storage bucket configuration options
 */
export interface StorageBucketOptions {
  projectId: string;
  region: string;
  bucketName?: string;
  labels?: Record<string, string>;
  versioning?: boolean;
  lifecycleDays?: number;
  dependencies?: gcp.projects.Service[];
}

/**
 * Create a GCS bucket with standard configuration
 * @param options - Bucket configuration options
 * @returns GCS bucket resource
 */
export function createStorageBucket(options: StorageBucketOptions): gcp.storage.Bucket {
  const {
    projectId,
    region,
    bucketName,
    labels = getLabels(),
    versioning = false,
    lifecycleDays,
    dependencies = [],
  } = options;

  const finalBucketName = bucketName || getResourceName("bucket");

  const lifecycleRules: gcp.types.input.storage.BucketLifecycleRule[] = [];
  if (lifecycleDays) {
    lifecycleRules.push({
      action: {
        type: "Delete",
      },
      condition: {
        age: lifecycleDays,
      },
    });
  }

  const bucket = new gcp.storage.Bucket(getResourceName("bucket"), {
    name: finalBucketName,
    project: projectId,
    location: region.toUpperCase(),
    labels: labels,
    uniformBucketLevelAccess: true,
    versioning: versioning ? {
      enabled: true,
    } : undefined,
    lifecycleRules: lifecycleRules.length > 0 ? lifecycleRules : undefined,
    forceDestroy: false, // Prevent accidental deletion
  }, {
    dependsOn: dependencies,
  });

  return bucket;
}

/**
 * Create a bucket for Cloud Function source code
 * @param projectId - GCP project ID
 * @param region - GCP region
 * @param dependencies - API services that must be enabled first
 * @returns GCS bucket for function source
 */
export function createFunctionSourceBucket(
  projectId: string,
  region: string,
  dependencies: gcp.projects.Service[] = []
): gcp.storage.Bucket {
  return createStorageBucket({
    projectId,
    region,
    bucketName: getResourceName("functions-source"),
    versioning: true,
    lifecycleDays: 30, // Clean up old function versions after 30 days
    dependencies,
  });
}
