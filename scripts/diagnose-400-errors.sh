#!/bin/bash
#
# GCS 400 Error Diagnostic Script
# Usage: ./scripts/diagnose-400-errors.sh [staging|production]
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENVIRONMENT=${1:-staging}
BUCKET="dcmco-website-${ENVIRONMENT}-2026"
BASE_URL="https://storage.googleapis.com/${BUCKET}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  GCS 400 Error Diagnostic Script${NC}"
echo -e "${BLUE}  Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}  Bucket: gs://${BUCKET}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# ============================================
# Test 1: Check Bucket Configuration
# ============================================
echo -e "${YELLOW}[Test 1/8]${NC} Checking bucket website configuration..."
WEB_CONFIG=$(gsutil web get gs://${BUCKET} 2>&1)
if echo "$WEB_CONFIG" | grep -q "Main page suffix"; then
  echo -e "${GREEN}✓${NC} Bucket website configuration found"
  echo "$WEB_CONFIG" | sed 's/^/  /'
else
  echo -e "${RED}✗${NC} Bucket website configuration missing or invalid"
  echo -e "${YELLOW}  Hint: Run 'gsutil web set -m index.html -e 404.html gs://${BUCKET}'${NC}"
fi
echo ""

# ============================================
# Test 2: Test Index.html
# ============================================
echo -e "${YELLOW}[Test 2/8]${NC} Testing index.html accessibility..."
STATUS=$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}/index.html")
if [ "$STATUS" = "200" ]; then
  echo -e "${GREEN}✓${NC} index.html returns HTTP 200"
else
  echo -e "${RED}✗${NC} index.html returns HTTP ${STATUS}"
fi
echo ""

# ============================================
# Test 3: Check Next.js Build Structure
# ============================================
echo -e "${YELLOW}[Test 3/8]${NC} Checking Next.js build structure..."
echo -e "${BLUE}Looking for _next/static directory...${NC}"

if gsutil ls "gs://${BUCKET}/_next/static/" > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} _next/static/ directory exists"

  # Find build ID
  BUILD_ID=$(gsutil ls "gs://${BUCKET}/_next/static/" | grep -v "css\|chunks\|media\|webpack" | head -1 | sed 's|.*/||' | sed 's|/$||')

  if [ -n "$BUILD_ID" ]; then
    echo -e "${GREEN}✓${NC} Build ID found: ${BUILD_ID}"
    echo -e "${BLUE}  Structure: _next/static/${BUILD_ID}/${NC}"
  else
    echo -e "${YELLOW}⚠${NC}  No build ID directory found (might be in root _next/static/)"
  fi
else
  echo -e "${RED}✗${NC} _next/static/ directory NOT found"
  echo -e "${YELLOW}  This is a critical issue - Next.js assets are missing${NC}"
fi
echo ""

# ============================================
# Test 4: Sample Asset URLs
# ============================================
echo -e "${YELLOW}[Test 4/8]${NC} Testing sample Next.js asset URLs..."

# Get a sample JS chunk file
SAMPLE_JS=$(gsutil ls "gs://${BUCKET}/_next/static/chunks/*.js" 2>/dev/null | head -1)

if [ -n "$SAMPLE_JS" ]; then
  # Convert gs:// URL to https:// URL
  SAMPLE_JS_URL=$(echo "$SAMPLE_JS" | sed "s|gs://${BUCKET}|${BASE_URL}|")
  SAMPLE_JS_FILE=$(basename "$SAMPLE_JS")

  echo -e "${BLUE}Testing: ${SAMPLE_JS_FILE}${NC}"
  JS_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$SAMPLE_JS_URL")

  if [ "$JS_STATUS" = "200" ]; then
    echo -e "${GREEN}✓${NC} JS asset accessible (HTTP 200)"
  else
    echo -e "${RED}✗${NC} JS asset returns HTTP ${JS_STATUS}"
    echo -e "${YELLOW}  URL: ${SAMPLE_JS_URL}${NC}"
  fi
else
  echo -e "${YELLOW}⚠${NC}  No JS chunks found to test"
fi
echo ""

# ============================================
# Test 5: Check Content-Type Headers
# ============================================
echo -e "${YELLOW}[Test 5/8]${NC} Checking Content-Type headers..."

if [ -n "$SAMPLE_JS" ]; then
  CONTENT_TYPE=$(gsutil stat "$SAMPLE_JS" 2>/dev/null | grep "Content-Type" | awk '{print $2}')

  if [[ "$CONTENT_TYPE" == *"javascript"* ]] || [[ "$CONTENT_TYPE" == *"application/javascript"* ]]; then
    echo -e "${GREEN}✓${NC} JavaScript Content-Type correct: ${CONTENT_TYPE}"
  elif [ -n "$CONTENT_TYPE" ]; then
    echo -e "${RED}✗${NC} JavaScript Content-Type incorrect: ${CONTENT_TYPE}"
    echo -e "${YELLOW}  Expected: application/javascript or text/javascript${NC}"
  else
    echo -e "${YELLOW}⚠${NC}  No Content-Type header found"
  fi
fi
echo ""

# ============================================
# Test 6: Check for URL Encoding Issues
# ============================================
echo -e "${YELLOW}[Test 6/8]${NC} Checking for special characters in filenames..."

SPECIAL_CHARS=$(gsutil ls -r "gs://${BUCKET}/**" | grep -E '\[|\]|\(|\)|\{|\}| ' | head -5)

if [ -n "$SPECIAL_CHARS" ]; then
  echo -e "${YELLOW}⚠${NC}  Found files with special characters:"
  echo "$SPECIAL_CHARS" | sed 's/^/  /'
  echo -e "${YELLOW}  These may need URL encoding in browser requests${NC}"
else
  echo -e "${GREEN}✓${NC} No special characters found in filenames"
fi
echo ""

# ============================================
# Test 7: Check IAM Permissions
# ============================================
echo -e "${YELLOW}[Test 7/8]${NC} Checking IAM permissions..."

if gsutil iam get "gs://${BUCKET}" | grep -q "allUsers"; then
  echo -e "${GREEN}✓${NC} Bucket has public read access (allUsers)"
else
  echo -e "${RED}✗${NC} Bucket may not be publicly accessible"
  echo -e "${YELLOW}  Run: gsutil iam ch allUsers:objectViewer gs://${BUCKET}${NC}"
fi
echo ""

# ============================================
# Test 8: CORS Configuration
# ============================================
echo -e "${YELLOW}[Test 8/8]${NC} Checking CORS configuration..."

CORS_CONFIG=$(gsutil cors get "gs://${BUCKET}" 2>&1)

if echo "$CORS_CONFIG" | grep -q "has no CORS configuration"; then
  echo -e "${YELLOW}⚠${NC}  No CORS configuration (may be needed for CDN/custom domain)"
else
  echo -e "${GREEN}✓${NC} CORS configuration found"
  echo "$CORS_CONFIG" | sed 's/^/  /'
fi
echo ""

# ============================================
# Summary
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Diagnostic Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Provide specific debugging steps based on findings
echo -e "\n${YELLOW}Next Steps:${NC}"
echo -e "1. Open browser DevTools → Network tab"
echo -e "2. Load: ${BASE_URL}/index.html"
echo -e "3. Filter by 'Status:400' or 'JS' or 'CSS'"
echo -e "4. For each 400 error:"
echo -e "   - Right-click → Copy URL"
echo -e "   - Check URL format against files in bucket"
echo -e "   - Look for double slashes, wrong paths, or encoding issues"
echo -e "\n${YELLOW}Manual Tests:${NC}"
echo -e "# Test a specific asset URL:"
echo -e "curl -I '${BASE_URL}/_next/static/chunks/[FILENAME].js'"
echo -e "\n# List all files in _next:"
echo -e "gsutil ls -r gs://${BUCKET}/_next/**"
echo -e "\n${YELLOW}Check next.config.mjs:${NC}"
echo -e "# Ensure these settings are correct:"
echo -e "- output: 'export'"
echo -e "- basePath: '' (empty or correct path)"
echo -e "- assetPrefix: '' (empty or correct URL)"
echo -e "- trailingSlash: false (or true, must be consistent)"
echo ""
