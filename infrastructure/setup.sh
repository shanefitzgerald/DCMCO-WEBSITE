#!/bin/bash

# DCMCO Infrastructure Setup Script
# This script helps set up the CDKTF infrastructure project

set -e

echo "🚀 DCMCO Infrastructure Setup"
echo "================================"
echo ""

# Check if CDKTF CLI is installed
if ! command -v cdktf &> /dev/null; then
    echo "⚠️  CDKTF CLI not found. Installing globally..."
    npm install -g cdktf-cli@^0.20.0
else
    echo "✅ CDKTF CLI found: $(cdktf --version)"
fi

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "⚠️  Terraform not found. Please install it:"
    echo "   macOS: brew install terraform"
    echo "   Or download from: https://terraform.io"
    exit 1
else
    echo "✅ Terraform found: $(terraform version | head -n 1)"
fi

# Check if GCP CLI is installed
if ! command -v gcloud &> /dev/null; then
    echo "⚠️  GCP CLI not found. Please install it:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
else
    echo "✅ GCP CLI found: $(gcloud version | head -n 1)"
fi

echo ""
echo "📦 Installing dependencies..."
pnpm install

echo ""
echo "🔧 Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from .env.example"
    echo "⚠️  Please edit .env with your configuration"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🔑 Checking GCP authentication..."
if gcloud auth application-default print-access-token &> /dev/null; then
    echo "✅ GCP authentication is configured"
    echo "   Project: $(gcloud config get-value project 2>/dev/null)"
else
    echo "⚠️  GCP authentication not found. Running auth..."
    gcloud auth application-default login
fi

echo ""
echo "📥 Downloading provider bindings..."
pnpm get

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your GCP project settings"
echo "  2. Run 'pnpm synth' to generate Terraform configuration"
echo "  3. Run 'pnpm plan' to preview changes"
echo "  4. Run 'pnpm deploy' to create infrastructure"
echo ""
