#!/bin/bash

#==============================================================================
# Test Deployed Cloud Function
#==============================================================================
#
# Tests a deployed Cloud Function with automated smoke tests.
#
# Usage:
#   bash test-deployed-function.sh <function-url> [origin]
#
# Examples:
#   bash test-deployed-function.sh \
#     "https://australia-southeast1-dcmco-prod-2026.cloudfunctions.net/dcmco-website-staging-contact-form"
#
#   bash test-deployed-function.sh \
#     "https://australia-southeast1-dcmco-prod-2026.cloudfunctions.net/dcmco-website-staging-contact-form" \
#     "https://dcmco-staging.web.app"
#
#==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
FUNCTION_URL=$1
ORIGIN=${2:-"https://dcmco-staging.web.app"}
TEST_COUNT=0
PASS_COUNT=0
FAIL_COUNT=0

#==============================================================================
# Helper Functions
#==============================================================================

print_header() {
  echo ""
  echo -e "${BLUE}================================================================================${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}================================================================================${NC}"
  echo ""
}

print_test() {
  echo -e "${CYAN}Test: $1${NC}"
}

print_pass() {
  echo -e "${GREEN}✓ PASS${NC}: $1"
  ((PASS_COUNT++))
}

print_fail() {
  echo -e "${RED}✗ FAIL${NC}: $1"
  ((FAIL_COUNT++))
}

print_warning() {
  echo -e "${YELLOW}⚠ WARNING${NC}: $1"
}

test_http() {
  local test_name=$1
  local method=$2
  local data=$3
  local expected_status=${4:-200}

  ((TEST_COUNT++))

  print_test "$test_name"

  # Make request
  response=$(curl -s -w "\n%{http_code}" -X "$method" "$FUNCTION_URL" \
    -H "Content-Type: application/json" \
    -H "Origin: $ORIGIN" \
    -d "$data" 2>&1) || {
    print_fail "Request failed - network error"
    return 1
  }

  # Extract status code and body
  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  echo "  Request: $method $FUNCTION_URL"
  echo "  Origin: $ORIGIN"
  if [ -n "$data" ]; then
    echo "  Data: $(echo "$data" | jq -c . 2>/dev/null || echo "$data")"
  fi
  echo "  Status: $status_code"
  echo "  Response: $(echo "$body" | jq -c . 2>/dev/null || echo "$body")"

  # Check status code
  if [ "$status_code" -eq "$expected_status" ]; then
    print_pass "Status code $status_code (expected $expected_status)"
  else
    print_fail "Status code $status_code (expected $expected_status)"
    return 1
  fi

  echo ""
  return 0
}

#==============================================================================
# Validation
#==============================================================================

if [ -z "$FUNCTION_URL" ]; then
  echo -e "${RED}Error: Function URL required${NC}"
  echo ""
  echo "Usage: bash test-deployed-function.sh <function-url> [origin]"
  echo ""
  echo "Example:"
  echo "  bash test-deployed-function.sh \\"
  echo "    \"https://australia-southeast1-dcmco-prod-2026.cloudfunctions.net/dcmco-website-staging-contact-form\" \\"
  echo "    \"https://dcmco-staging.web.app\""
  echo ""
  exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo -e "${YELLOW}Warning: jq not installed - JSON parsing will be limited${NC}"
  echo "Install with: brew install jq (macOS) or apt-get install jq (Ubuntu)"
  echo ""
fi

#==============================================================================
# Test Suite
#==============================================================================

print_header "Cloud Function Deployment Tests"

echo "Function URL: $FUNCTION_URL"
echo "Origin: $ORIGIN"
echo ""

#==============================================================================
# Test 1: Health Check (Valid Submission)
#==============================================================================

print_header "Test 1: Health Check (Valid Submission)"

test_http \
  "Valid submission with all fields" \
  "POST" \
  '{
    "name": "Deployment Test",
    "email": "deploy-test@example.com",
    "company": "Test Company",
    "message": "Automated deployment verification test from infrastructure/scripts/test-deployed-function.sh"
  }' \
  200

#==============================================================================
# Test 2: CORS Preflight
#==============================================================================

print_header "Test 2: CORS Preflight (OPTIONS)"

((TEST_COUNT++))
print_test "CORS preflight request"

response=$(curl -s -w "\n%{http_code}" -X OPTIONS "$FUNCTION_URL" \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  2>&1)

status_code=$(echo "$response" | tail -n1)

echo "  Request: OPTIONS $FUNCTION_URL"
echo "  Origin: $ORIGIN"
echo "  Status: $status_code"

if [ "$status_code" = "204" ] || [ "$status_code" = "200" ]; then
  print_pass "CORS preflight handled (status $status_code)"
else
  print_fail "CORS preflight failed (status $status_code)"
fi
echo ""

#==============================================================================
# Test 3: Validation (Invalid Email)
#==============================================================================

print_header "Test 3: Validation (Invalid Email)"

test_http \
  "Invalid email format should be rejected" \
  "POST" \
  '{
    "name": "Test User",
    "email": "not-an-email",
    "message": "This should fail validation"
  }' \
  400

#==============================================================================
# Test 4: Validation (Missing Required Fields)
#==============================================================================

print_header "Test 4: Validation (Missing Required Fields)"

test_http \
  "Missing required fields should be rejected" \
  "POST" \
  '{
    "name": "Test User"
  }' \
  400

#==============================================================================
# Test 5: Spam Protection (Honeypot)
#==============================================================================

print_header "Test 5: Spam Protection (Honeypot)"

print_test "Honeypot filled (should return success but not send email)"

test_http \
  "Honeypot field filled" \
  "POST" \
  '{
    "name": "Spam Bot",
    "email": "bot@spam.com",
    "message": "This is automated spam",
    "honeypot": "Filled by bot"
  }' \
  200

print_warning "Verify in function logs that NO email was sent"
echo ""

#==============================================================================
# Test 6: Spam Protection (Suspicious Email)
#==============================================================================

print_header "Test 6: Spam Protection (Suspicious Email Pattern)"

test_http \
  "test@test.com should be rejected" \
  "POST" \
  '{
    "name": "Test User",
    "email": "test@test.com",
    "message": "This should be rejected due to suspicious email pattern"
  }' \
  400

#==============================================================================
# Test 7: CORS Rejection (Invalid Origin)
#==============================================================================

print_header "Test 7: CORS Rejection (Invalid Origin)"

((TEST_COUNT++))
print_test "Request from disallowed origin should be rejected"

response=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Origin: https://malicious-site.com" \
  -d '{
    "name": "Hacker",
    "email": "hacker@evil.com",
    "message": "This should be rejected due to CORS"
  }' 2>&1)

status_code=$(echo "$response" | tail -n1)

echo "  Request: POST $FUNCTION_URL"
echo "  Origin: https://malicious-site.com (invalid)"
echo "  Status: $status_code"

if [ "$status_code" -eq 403 ]; then
  print_pass "Invalid origin rejected (status $status_code)"
else
  print_fail "Invalid origin not rejected properly (status $status_code)"
fi
echo ""

#==============================================================================
# Test 8: Method Not Allowed (GET)
#==============================================================================

print_header "Test 8: Method Not Allowed (GET)"

((TEST_COUNT++))
print_test "GET request should be rejected"

response=$(curl -s -w "\n%{http_code}" -X GET "$FUNCTION_URL" \
  -H "Origin: $ORIGIN" 2>&1)

status_code=$(echo "$response" | tail -n1)

echo "  Request: GET $FUNCTION_URL"
echo "  Status: $status_code"

if [ "$status_code" -eq 405 ] || [ "$status_code" -eq 400 ]; then
  print_pass "GET method rejected (status $status_code)"
else
  print_fail "GET method not properly rejected (status $status_code)"
fi
echo ""

#==============================================================================
# Test 9: Minimal Valid Submission
#==============================================================================

print_header "Test 9: Minimal Valid Submission (Required Fields Only)"

test_http \
  "Valid submission with only required fields" \
  "POST" \
  '{
    "name": "Minimal Test",
    "email": "minimal-test@example.com",
    "message": "Testing with minimal required fields only"
  }' \
  200

#==============================================================================
# Test 10: Function Latency Check
#==============================================================================

print_header "Test 10: Performance Check (Latency)"

((TEST_COUNT++))
print_test "Measuring response time"

START_TIME=$(date +%s%3N)

curl -s -o /dev/null -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Origin: $ORIGIN" \
  -d '{
    "name": "Latency Test",
    "email": "latency@example.com",
    "message": "Testing response time"
  }' 2>&1

END_TIME=$(date +%s%3N)
LATENCY=$((END_TIME - START_TIME))

echo "  Response time: ${LATENCY}ms"

if [ "$LATENCY" -lt 2000 ]; then
  print_pass "Response time acceptable (< 2000ms)"
elif [ "$LATENCY" -lt 5000 ]; then
  print_warning "Response time slow but acceptable (${LATENCY}ms)"
else
  print_fail "Response time too slow (${LATENCY}ms > 5000ms)"
fi
echo ""

#==============================================================================
# Summary
#==============================================================================

print_header "TEST SUMMARY"

echo "  Function URL: $FUNCTION_URL"
echo "  Origin: $ORIGIN"
echo "  Total tests: $TEST_COUNT"
echo -e "  ${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "  ${RED}Failed: $FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed! Function is ready for use.${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Update Next.js environment variable:"
  echo "     NEXT_PUBLIC_CONTACT_FORM_URL=\"$FUNCTION_URL\""
  echo "  2. Test from frontend application"
  echo "  3. Verify email delivery in SendGrid"
  echo "  4. Monitor function logs for any errors"
  echo ""
  exit 0
else
  echo -e "${RED}✗ Some tests failed! Please review and fix issues.${NC}"
  echo ""
  echo "Troubleshooting:"
  echo "  1. Check function logs:"
  echo "     gcloud functions logs read <function-name> --region=<region> --limit=50"
  echo "  2. Verify environment variables in GCP console"
  echo "  3. Check SendGrid API key is valid"
  echo "  4. Verify CORS origins are configured correctly"
  echo ""
  exit 1
fi
