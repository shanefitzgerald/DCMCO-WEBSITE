#!/bin/bash
#
# Deployment Verification Script
#
# Usage:
#   ./scripts/verify-deployment.sh [staging|production]
#
# Examples:
#   ./scripts/verify-deployment.sh staging
#   ./scripts/verify-deployment.sh production
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENVIRONMENT=${1:-staging}
BUCKET="dcmco-website-${ENVIRONMENT}-2026"
BASE_URL="https://storage.googleapis.com/${BUCKET}"

echo -e "${BLUE}🔍 Verifying deployment to ${ENVIRONMENT}...${NC}\n"

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0
WARNINGS=0

# Helper functions
pass() {
  echo -e "${GREEN}✓${NC} $1"
  ((TESTS_PASSED++))
}

fail() {
  echo -e "${RED}✗${NC} $1"
  ((TESTS_FAILED++))
}

warn() {
  echo -e "${YELLOW}⚠${NC}  $1"
  ((WARNINGS++))
}

info() {
  echo -e "${BLUE}ℹ${NC}  $1"
}

# Test 1: Check bucket exists
echo -e "${BLUE}[Test 1/8]${NC} Checking bucket exists..."
if gsutil ls "gs://${BUCKET}" > /dev/null 2>&1; then
  pass "Bucket gs://${BUCKET} exists"
else
  fail "Bucket gs://${BUCKET} not found"
  exit 1
fi

# Test 2: Check index.html exists and is accessible
echo -e "\n${BLUE}[Test 2/8]${NC} Checking index.html accessibility..."
STATUS=$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}/index.html")
if [ "$STATUS" = "200" ]; then
  pass "index.html returned HTTP 200"
else
  fail "index.html returned HTTP $STATUS (expected 200)"
fi

# Test 3: Check 404 page exists
echo -e "\n${BLUE}[Test 3/8]${NC} Checking 404 page..."
STATUS=$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}/404.html")
if [ "$STATUS" = "200" ]; then
  pass "404.html exists and is accessible"
else
  warn "404.html returned HTTP $STATUS (expected 200)"
fi

# Test 4: Check critical Next.js assets
echo -e "\n${BLUE}[Test 4/8]${NC} Checking Next.js static assets..."
NEXT_ASSETS_EXIST=$(gsutil ls "gs://${BUCKET}/_next/static/" 2>/dev/null | wc -l)
if [ "$NEXT_ASSETS_EXIST" -gt 0 ]; then
  pass "Next.js static assets found ($_next/static/)"

  # Try to fetch a chunk file
  CHUNK_FILE=$(gsutil ls "gs://${BUCKET}/_next/static/chunks/*.js" 2>/dev/null | head -1)
  if [ -n "$CHUNK_FILE" ]; then
    CHUNK_URL="${BASE_URL}/_next/static/chunks/$(basename $CHUNK_FILE)"
    if curl -f -s "$CHUNK_URL" > /dev/null 2>&1; then
      pass "Next.js chunk files are accessible"
    else
      fail "Next.js chunk files exist but are not accessible"
    fi
  fi
else
  fail "No Next.js static assets found (missing _next/static/)"
fi

# Test 5: Check file count
echo -e "\n${BLUE}[Test 5/8]${NC} Checking file count..."
FILE_COUNT=$(gsutil ls -r "gs://${BUCKET}/**" 2>/dev/null | grep -v ':$' | wc -l | tr -d ' ')
info "Files deployed: $FILE_COUNT"

if [ "$FILE_COUNT" -lt 10 ]; then
  warn "Low file count detected (${FILE_COUNT} files). Expected > 10 files"
elif [ "$FILE_COUNT" -gt 5 ]; then
  pass "File count looks reasonable (${FILE_COUNT} files)"
fi

# Test 6: Check total size
echo -e "\n${BLUE}[Test 6/8]${NC} Checking total deployment size..."
TOTAL_SIZE=$(gsutil du -s "gs://${BUCKET}" 2>/dev/null | awk '{print $1}')
if [ -n "$TOTAL_SIZE" ] && [ "$TOTAL_SIZE" -gt 0 ]; then
  # Convert bytes to human-readable format
  if [ "$TOTAL_SIZE" -ge 1073741824 ]; then
    SIZE_FORMATTED="$(awk "BEGIN {printf \"%.2f GB\", $TOTAL_SIZE/1073741824}")"
  elif [ "$TOTAL_SIZE" -ge 1048576 ]; then
    SIZE_FORMATTED="$(awk "BEGIN {printf \"%.2f MB\", $TOTAL_SIZE/1048576}")"
  else
    SIZE_FORMATTED="$(awk "BEGIN {printf \"%.2f KB\", $TOTAL_SIZE/1024}")"
  fi
  info "Total size: $SIZE_FORMATTED"
  pass "Deployment size calculated successfully"
else
  fail "Could not calculate deployment size"
fi

# Test 7: Verify cache headers
echo -e "\n${BLUE}[Test 7/8]${NC} Checking cache headers..."

# Check HTML cache headers (should be max-age=0)
HTML_CACHE=$(gcloud storage objects describe \
  "gs://${BUCKET}/index.html" \
  --format="value(cacheControl)" 2>/dev/null || echo "")

if [[ "$HTML_CACHE" == *"max-age=0"* ]] || [[ "$HTML_CACHE" == *"must-revalidate"* ]]; then
  pass "HTML files have correct cache headers (no-cache or revalidate)"
else
  warn "HTML cache header: ${HTML_CACHE} (expected max-age=0 or must-revalidate)"
fi

# Check Next.js static assets cache headers (should be immutable)
STATIC_FILE=$(gsutil ls "gs://${BUCKET}/_next/static/chunks/*.js" 2>/dev/null | head -1)
if [ -n "$STATIC_FILE" ]; then
  STATIC_CACHE=$(gcloud storage objects describe \
    "$STATIC_FILE" \
    --format="value(cacheControl)" 2>/dev/null || echo "")

  if [[ "$STATIC_CACHE" == *"immutable"* ]]; then
    pass "Static assets have immutable cache headers"
  else
    warn "Static asset cache header: ${STATIC_CACHE} (expected immutable)"
  fi
fi

# Test 8: Check page content validity
echo -e "\n${BLUE}[Test 8/8]${NC} Checking page content..."
PAGE_CONTENT=$(curl -s "${BASE_URL}/index.html")

# Check for DOCTYPE
if echo "$PAGE_CONTENT" | grep -q "<!DOCTYPE html>"; then
  pass "Page contains valid DOCTYPE declaration"
else
  fail "Page missing DOCTYPE declaration"
fi

# Check for <html> tag
if echo "$PAGE_CONTENT" | grep -q "<html"; then
  pass "Page contains <html> tag"
else
  fail "Page missing <html> tag"
fi

# Check for Next.js hydration scripts
if echo "$PAGE_CONTENT" | grep -q "_next"; then
  pass "Page contains Next.js scripts"
else
  warn "Page may be missing Next.js scripts"
fi

# Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Verification Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Environment:     ${ENVIRONMENT}"
echo -e "Bucket:          gs://${BUCKET}"
echo -e "URL:             ${BASE_URL}/index.html"
echo -e ""
echo -e "${GREEN}Tests Passed:${NC}    $TESTS_PASSED"
echo -e "${RED}Tests Failed:${NC}    $TESTS_FAILED"
echo -e "${YELLOW}Warnings:${NC}        $WARNINGS"
echo -e "${BLUE}========================================${NC}"

# Exit with appropriate code
if [ $TESTS_FAILED -gt 0 ]; then
  echo -e "\n${RED}❌ Verification FAILED${NC}"
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo -e "\n${YELLOW}⚠️  Verification completed with warnings${NC}"
  exit 0
else
  echo -e "\n${GREEN}✅ Verification PASSED${NC}"
  exit 0
fi
