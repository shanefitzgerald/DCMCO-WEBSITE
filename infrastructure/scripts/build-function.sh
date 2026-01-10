#!/bin/bash

#==============================================================================
# Build and Package Cloud Function
#==============================================================================
#
# This script builds the contact form Cloud Function and packages it as a ZIP
# file for deployment with CDKTF.
#
# Usage:
#   bash infrastructure/scripts/build-function.sh
#
# Output:
#   infrastructure/function-source.zip
#
#==============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FUNCTION_DIR="$PROJECT_ROOT/functions/contact-form"
INFRASTRUCTURE_DIR="$PROJECT_ROOT/infrastructure"
OUTPUT_ZIP="$INFRASTRUCTURE_DIR/function-source.zip"
TEMP_DIR="$INFRASTRUCTURE_DIR/.build-temp"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Building Contact Form Cloud Function${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

#==============================================================================
# Step 1: Validate function directory exists
#==============================================================================

if [ ! -d "$FUNCTION_DIR" ]; then
  echo -e "${RED}❌ Error: Function directory not found at $FUNCTION_DIR${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} Function directory found"

#==============================================================================
# Step 2: Install function dependencies
#==============================================================================

echo ""
echo -e "${YELLOW}📦 Installing function dependencies...${NC}"
cd "$FUNCTION_DIR"

if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Error: package.json not found in $FUNCTION_DIR${NC}"
  exit 1
fi

# Install production dependencies
npm install --production --silent

echo -e "${GREEN}✓${NC} Dependencies installed"

#==============================================================================
# Step 3: Build TypeScript
#==============================================================================

echo ""
echo -e "${YELLOW}🔨 Building TypeScript...${NC}"

# Install dev dependencies for build
npm install --silent

# Build
npm run build

if [ ! -d "dist" ]; then
  echo -e "${RED}❌ Error: Build failed - dist directory not found${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} TypeScript compiled"

#==============================================================================
# Step 4: Create temporary build directory
#==============================================================================

echo ""
echo -e "${YELLOW}📁 Preparing package...${NC}"

# Clean up any existing temp directory
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Copy necessary files to temp directory
cp -r dist "$TEMP_DIR/"
cp package.json "$TEMP_DIR/"
cp package-lock.json "$TEMP_DIR/" 2>/dev/null || echo "Note: No package-lock.json found"

# Copy production node_modules
cp -r node_modules "$TEMP_DIR/"

echo -e "${GREEN}✓${NC} Files staged for packaging"

#==============================================================================
# Step 5: Create ZIP archive
#==============================================================================

echo ""
echo -e "${YELLOW}📦 Creating ZIP archive...${NC}"

# Remove old ZIP if exists
rm -f "$OUTPUT_ZIP"

# Create ZIP from temp directory
cd "$TEMP_DIR"
zip -r "$OUTPUT_ZIP" . -q

# Get ZIP size
ZIP_SIZE=$(du -h "$OUTPUT_ZIP" | cut -f1)

echo -e "${GREEN}✓${NC} ZIP created: $OUTPUT_ZIP ($ZIP_SIZE)"

#==============================================================================
# Step 6: Clean up
#==============================================================================

echo ""
echo -e "${YELLOW}🧹 Cleaning up...${NC}"

rm -rf "$TEMP_DIR"

echo -e "${GREEN}✓${NC} Temporary files removed"

#==============================================================================
# Step 7: Verify package contents
#==============================================================================

echo ""
echo -e "${BLUE}📋 Package contents:${NC}"
unzip -l "$OUTPUT_ZIP" | head -20
echo ""
echo -e "${BLUE}   (showing first 20 files)${NC}"

#==============================================================================
# Success
#==============================================================================

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  ✅ Function packaged successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "Output: ${BLUE}$OUTPUT_ZIP${NC}"
echo -e "Size: ${BLUE}$ZIP_SIZE${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. Set SENDGRID_API_KEY in infrastructure/.env"
echo -e "  2. Run: ${BLUE}cd infrastructure && pnpm run deploy${NC}"
echo ""
