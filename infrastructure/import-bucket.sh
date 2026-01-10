#!/bin/bash
# Script to import existing GCS bucket into Terraform state

set -e

echo "Checking if bucket exists..."
BUCKET_NAME="${GCS_BUCKET_NAME:-dcmco-website-staging-2026}"

if gcloud storage buckets describe "gs://${BUCKET_NAME}" &>/dev/null; then
  echo "✓ Bucket gs://${BUCKET_NAME} exists"
  
  echo "Initializing Terraform backend..."
  cdktf synth
  
  cd cdktf.out/stacks/dcmco-website-storage
  terraform init
  
  echo "Importing bucket into Terraform state..."
  terraform import google_storage_bucket.website-bucket "${BUCKET_NAME}"
  
  echo "✓ Bucket imported successfully!"
else
  echo "✗ Bucket does not exist, no import needed"
fi
