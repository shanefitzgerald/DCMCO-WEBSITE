#!/bin/bash

# CDKTF Infrastructure Verification Script
# This script checks all prerequisites and validates the CDKTF configuration

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_check() {
    echo -e "${BLUE}[CHECK]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓ PASS]${NC} $1"
    ((PASSED++))
}

print_error() {
    echo -e "${RED}[✗ FAIL]${NC} $1"
    ((FAILED++))
}

print_warning() {
    echo -e "${YELLOW}[⚠ WARN]${NC} $1"
    ((WARNINGS++))
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Main verification starts here
print_header "CDKTF Infrastructure Verification"
echo "Starting verification checks..."

# 1. Check Node.js version
print_header "1. Node.js Environment"
print_check "Checking Node.js version..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -ge 18 ]; then
        print_success "Node.js version: $NODE_VERSION (>= 18.0.0 required)"
    else
        print_error "Node.js version $NODE_VERSION is too old (>= 18.0.0 required)"
    fi
else
    print_error "Node.js is not installed"
fi

print_check "Checking pnpm..."
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version 2>&1 | head -1)
    print_success "pnpm version: $PNPM_VERSION"
else
    print_error "pnpm is not installed (run: npm install -g pnpm)"
fi

# 2. Check CDKTF CLI
print_header "2. CDKTF CLI"
print_check "Checking CDKTF CLI installation..."
if command -v cdktf &> /dev/null; then
    CDKTF_VERSION=$(cdktf --version)
    print_success "CDKTF CLI version: $CDKTF_VERSION"
else
    print_error "CDKTF CLI is not installed (run: npm install -g cdktf-cli)"
fi

# 3. Check Terraform
print_header "3. Terraform"
print_check "Checking Terraform installation..."
if command -v terraform &> /dev/null; then
    TERRAFORM_VERSION=$(terraform version -json | grep -o '"terraform_version":"[^"]*"' | cut -d'"' -f4)
    print_success "Terraform version: $TERRAFORM_VERSION"
else
    print_warning "Terraform is not installed (CDKTF will use bundled version)"
fi

# 4. Check GCP CLI (gcloud)
print_header "4. GCP Authentication"
print_check "Checking gcloud CLI installation..."
if command -v gcloud &> /dev/null; then
    GCLOUD_VERSION=$(gcloud version --format="value(version)" 2>/dev/null | head -n1)
    print_success "gcloud CLI version: $GCLOUD_VERSION"

    print_check "Checking gcloud authentication..."
    if gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
        ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | head -n1)
        if [ -n "$ACTIVE_ACCOUNT" ]; then
            print_success "Authenticated as: $ACTIVE_ACCOUNT"
        else
            print_error "No active gcloud authentication (run: gcloud auth login)"
        fi
    else
        print_error "Unable to check gcloud authentication"
    fi

    print_check "Checking Application Default Credentials (ADC)..."
    if [ -f "$HOME/.config/gcloud/application_default_credentials.json" ]; then
        print_success "Application Default Credentials found"
    else
        print_warning "ADC not found (run: gcloud auth application-default login)"
        print_info "    ADC is recommended for local development"
    fi

    print_check "Checking active GCP project..."
    ACTIVE_PROJECT=$(gcloud config get-value project 2>/dev/null)
    if [ -n "$ACTIVE_PROJECT" ]; then
        print_success "Active GCP project: $ACTIVE_PROJECT"
    else
        print_warning "No active GCP project set (run: gcloud config set project PROJECT_ID)"
    fi
else
    print_error "gcloud CLI is not installed"
    print_info "    Install from: https://cloud.google.com/sdk/docs/install"
fi

# 5. Check Environment Variables
print_header "5. Environment Variables"

# Check if .env file exists
if [ -f .env ]; then
    print_success ".env file found"
    source .env
else
    print_warning ".env file not found (copy from .env.example)"
fi

# Required environment variables
print_check "Checking required environment variables..."

check_env_var() {
    if [ -n "${!1}" ]; then
        print_success "$1 is set: ${!1}"
    else
        print_error "$1 is not set"
    fi
}

check_env_var "GCP_PROJECT_ID"
check_env_var "GCP_REGION"
check_env_var "GCS_BUCKET_NAME"
check_env_var "ENVIRONMENT"

# Optional variables
if [ -n "$DOMAIN_NAME" ]; then
    print_info "DOMAIN_NAME is set: $DOMAIN_NAME"
else
    print_info "DOMAIN_NAME is not set (optional for staging)"
fi

# 6. Check Dependencies
print_header "6. Node.js Dependencies"
print_check "Checking if node_modules exists..."
if [ -d "node_modules" ]; then
    print_success "node_modules directory exists"
else
    print_error "node_modules not found (run: pnpm install)"
fi

print_check "Checking package.json integrity..."
if [ -f "package.json" ]; then
    print_success "package.json found"

    # Check for key dependencies
    if pnpm list cdktf &> /dev/null; then
        CDKTF_PKG_VERSION=$(pnpm list cdktf --depth=0 2>/dev/null | grep cdktf@ | sed 's/.*@//' | head -1)
        if [ -n "$CDKTF_PKG_VERSION" ]; then
            print_success "cdktf package installed: $CDKTF_PKG_VERSION"
        else
            print_success "cdktf package installed"
        fi
    else
        print_error "cdktf package not installed"
    fi

    if pnpm list @cdktf/provider-google &> /dev/null; then
        PROVIDER_VERSION=$(pnpm list @cdktf/provider-google --depth=0 2>/dev/null | grep @cdktf/provider-google@ | sed 's/.*@//' | head -1)
        if [ -n "$PROVIDER_VERSION" ]; then
            print_success "@cdktf/provider-google installed: $PROVIDER_VERSION"
        else
            print_success "@cdktf/provider-google installed"
        fi
    else
        print_error "@cdktf/provider-google not installed"
    fi
else
    print_error "package.json not found"
fi

# 7. TypeScript Compilation
print_header "7. TypeScript Compilation"
print_check "Running TypeScript type checking..."
if pnpm run typecheck &> /tmp/typecheck-output.log; then
    print_success "TypeScript compilation successful (no type errors)"
else
    print_error "TypeScript compilation failed"
    print_info "    See errors below:"
    cat /tmp/typecheck-output.log | tail -20
fi

# 8. CDKTF Configuration
print_header "8. CDKTF Configuration"
print_check "Checking cdktf.json..."
if [ -f "cdktf.json" ]; then
    print_success "cdktf.json found"

    # Validate JSON structure
    if python3 -m json.tool cdktf.json &> /dev/null; then
        print_success "cdktf.json is valid JSON"
    else
        print_error "cdktf.json is not valid JSON"
    fi
else
    print_error "cdktf.json not found"
fi

# 9. CDKTF Synth
print_header "9. CDKTF Synth Test"
print_check "Running cdktf synth to validate configuration..."
if cdktf synth &> /tmp/cdktf-synth-output.log; then
    print_success "cdktf synth completed successfully"

    # Check if Terraform JSON was generated
    if [ -d "cdktf.out" ]; then
        print_success "cdktf.out directory generated"

        # Count stack directories
        STACK_COUNT=$(find cdktf.out -name "stacks" -type d | wc -l | tr -d ' ')
        if [ "$STACK_COUNT" -gt 0 ]; then
            print_success "Found stack configurations in cdktf.out"

            # List stacks
            print_info "    Stacks:"
            find cdktf.out/stacks -mindepth 1 -maxdepth 1 -type d | while read stack; do
                STACK_NAME=$(basename "$stack")
                print_info "      - $STACK_NAME"
            done
        else
            print_warning "No stack configurations found"
        fi
    else
        print_error "cdktf.out directory not generated"
    fi
else
    print_error "cdktf synth failed"
    print_info "    See errors below:"
    cat /tmp/cdktf-synth-output.log | tail -20
fi

# 10. Validate Terraform JSON
print_header "10. Terraform JSON Validation"
if [ -d "cdktf.out/stacks" ]; then
    print_check "Validating generated Terraform JSON files..."

    # Find all cdk.tf.json files
    TF_JSON_FILES=$(find cdktf.out/stacks -name "cdk.tf.json")

    if [ -n "$TF_JSON_FILES" ]; then
        for tf_file in $TF_JSON_FILES; do
            STACK_NAME=$(dirname "$tf_file" | xargs basename)

            # Validate JSON structure
            if python3 -m json.tool "$tf_file" &> /dev/null; then
                print_success "Valid Terraform JSON: $STACK_NAME/cdk.tf.json"
            else
                print_error "Invalid Terraform JSON: $STACK_NAME/cdk.tf.json"
            fi
        done
    else
        print_warning "No Terraform JSON files found"
    fi
else
    print_warning "Skipping Terraform JSON validation (cdktf.out not found)"
fi

# 11. GCP Project Validation
print_header "11. GCP Project Validation"
if [ -n "$GCP_PROJECT_ID" ] && command -v gcloud &> /dev/null; then
    print_check "Verifying GCP project exists and is accessible..."

    if gcloud projects describe "$GCP_PROJECT_ID" &> /dev/null; then
        print_success "GCP project '$GCP_PROJECT_ID' exists and is accessible"

        # Check if project matches active gcloud config
        if [ "$ACTIVE_PROJECT" = "$GCP_PROJECT_ID" ]; then
            print_success "Active gcloud project matches GCP_PROJECT_ID"
        else
            print_warning "Active gcloud project ($ACTIVE_PROJECT) differs from GCP_PROJECT_ID ($GCP_PROJECT_ID)"
            print_info "    Consider running: gcloud config set project $GCP_PROJECT_ID"
        fi

        # Check if required APIs might be enabled (this is informational)
        print_check "Checking recommended GCP APIs..."
        APIS=("storage-api.googleapis.com" "compute.googleapis.com" "cloudresourcemanager.googleapis.com")

        for api in "${APIS[@]}"; do
            if gcloud services list --enabled --project="$GCP_PROJECT_ID" 2>/dev/null | grep -q "$api"; then
                print_success "API enabled: $api"
            else
                print_warning "API not enabled: $api"
                print_info "    Enable with: gcloud services enable $api --project=$GCP_PROJECT_ID"
            fi
        done
    else
        print_error "Cannot access GCP project '$GCP_PROJECT_ID'"
        print_info "    Check permissions or project ID"
    fi
else
    print_warning "Skipping GCP project validation (missing GCP_PROJECT_ID or gcloud)"
fi

# Final Summary
print_header "Verification Summary"
echo ""
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "${RED}Failed:${NC}   $FAILED"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ Verification FAILED - Please fix the errors above${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Verification PASSED with warnings - Review warnings above${NC}"
    exit 0
else
    echo -e "${GREEN}✅ All checks PASSED - Your CDKTF setup is ready!${NC}"
    exit 0
fi
