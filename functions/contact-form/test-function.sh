#!/bin/bash

#==============================================================================
# Cloud Function Local Testing Script
#==============================================================================
#
# Usage:
#   bash test-function.sh              # Run all tests
#   bash test-function.sh valid        # Run specific test
#   bash test-function.sh --help       # Show help
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
FUNCTION_URL=${FUNCTION_URL:-"http://localhost:8080"}
TEST_COUNT=0
PASS_COUNT=0
FAIL_COUNT=0

#==============================================================================
# Helper Functions
#==============================================================================

print_header() {
  echo ""
  echo -e "${BLUE}================================================================================================${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}================================================================================================${NC}"
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
  local origin=${4:-"http://localhost:3000"}
  local expected_status=${5:-200}

  ((TEST_COUNT++))

  print_test "$test_name"

  # Make request
  response=$(curl -s -w "\n%{http_code}" -X "$method" "$FUNCTION_URL" \
    -H "Content-Type: application/json" \
    -H "Origin: $origin" \
    -d "$data" 2>&1) || {
    print_fail "Request failed"
    return 1
  }

  # Extract status code and body
  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  echo "  Request: $method $FUNCTION_URL"
  echo "  Origin: $origin"
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
# Test Cases
#==============================================================================

test_valid_submission() {
  print_header "Test 1: Valid Submission (All Fields)"

  test_http \
    "Valid submission with all fields" \
    "POST" \
    '{
      "name": "John Doe",
      "email": "john@example.com",
      "company": "Acme Corp",
      "phone": "+61 400 000 000",
      "message": "I would like to inquire about your AI consulting services for the construction industry."
    }' \
    "http://localhost:3000" \
    200
}

test_minimal_valid() {
  print_header "Test 2: Minimal Valid Submission (Required Fields Only)"

  test_http \
    "Valid submission with only required fields" \
    "POST" \
    '{
      "name": "Jane Smith",
      "email": "jane@example.com",
      "message": "Quick question about your services."
    }' \
    "http://localhost:3000" \
    200
}

test_missing_fields() {
  print_header "Test 3: Missing Required Fields"

  test_http \
    "Missing email and message" \
    "POST" \
    '{
      "name": "Test User"
    }' \
    "http://localhost:3000" \
    400
}

test_invalid_email() {
  print_header "Test 4: Invalid Email"

  test_http \
    "Invalid email format" \
    "POST" \
    '{
      "name": "Test User",
      "email": "not-an-email",
      "message": "This should fail validation"
    }' \
    "http://localhost:3000" \
    400
}

test_message_too_short() {
  print_header "Test 5: Message Too Short"

  test_http \
    "Message less than 10 characters" \
    "POST" \
    '{
      "name": "Test User",
      "email": "test@example.com",
      "message": "Too short"
    }' \
    "http://localhost:3000" \
    400
}

test_honeypot() {
  print_header "Test 6: Honeypot Spam Protection"

  print_test "Bot fills honeypot field"
  echo "  Note: Should return success but not send email (check console logs)"

  test_http \
    "Honeypot field filled (bot detection)" \
    "POST" \
    '{
      "name": "Spam Bot",
      "email": "bot@spam.com",
      "message": "This is automated spam from a bot",
      "honeypot": "I am a bot filling this field"
    }' \
    "http://localhost:3000" \
    200

  print_warning "Verify in function logs that NO email was sent"
}

test_suspicious_email() {
  print_header "Test 7: Suspicious Email Pattern"

  test_http \
    "test@test.com email pattern" \
    "POST" \
    '{
      "name": "Test User",
      "email": "test@test.com",
      "message": "This should be rejected due to test email pattern"
    }' \
    "http://localhost:3000" \
    400
}

test_cors_preflight() {
  print_header "Test 8: CORS Preflight (OPTIONS)"

  ((TEST_COUNT++))
  print_test "CORS preflight request"

  response=$(curl -s -w "\n%{http_code}" -X OPTIONS "$FUNCTION_URL" \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type" \
    -v 2>&1)

  status_code=$(echo "$response" | grep "< HTTP" | tail -n1 | awk '{print $3}')

  echo "  Request: OPTIONS $FUNCTION_URL"
  echo "  Origin: http://localhost:3000"
  echo "  Status: $status_code"

  if [ "$status_code" = "204" ] || [ "$status_code" = "200" ]; then
    print_pass "CORS preflight handled (status $status_code)"
  else
    print_fail "CORS preflight failed (status $status_code)"
  fi
  echo ""
}

test_cors_rejection() {
  print_header "Test 9: CORS Origin Rejection"

  test_http \
    "Request from disallowed origin" \
    "POST" \
    '{
      "name": "Hacker",
      "email": "hacker@malicious.com",
      "message": "This should be rejected due to CORS"
    }' \
    "https://malicious-site.com" \
    403
}

test_method_not_allowed() {
  print_header "Test 10: Method Not Allowed (GET)"

  ((TEST_COUNT++))
  print_test "GET request should be rejected"

  response=$(curl -s -w "\n%{http_code}" -X GET "$FUNCTION_URL" \
    -H "Origin: http://localhost:3000" 2>&1)

  status_code=$(echo "$response" | tail -n1)

  echo "  Request: GET $FUNCTION_URL"
  echo "  Status: $status_code"

  if [ "$status_code" -eq 405 ] || [ "$status_code" -eq 400 ]; then
    print_pass "GET method rejected (status $status_code)"
  else
    print_fail "GET method not properly rejected (status $status_code)"
  fi
  echo ""
}

test_invalid_content_type() {
  print_header "Test 11: Invalid Content-Type"

  ((TEST_COUNT++))
  print_test "Request with text/plain Content-Type"

  response=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
    -H "Content-Type: text/plain" \
    -H "Origin: http://localhost:3000" \
    -d "plain text data" 2>&1)

  status_code=$(echo "$response" | tail -n1)

  echo "  Request: POST $FUNCTION_URL"
  echo "  Content-Type: text/plain"
  echo "  Status: $status_code"

  if [ "$status_code" -eq 400 ] || [ "$status_code" -eq 415 ]; then
    print_pass "Invalid Content-Type rejected (status $status_code)"
  else
    print_fail "Invalid Content-Type not properly rejected (status $status_code)"
  fi
  echo ""
}

test_long_message() {
  print_header "Test 12: Message Too Long"

  # Generate a message > 1000 characters
  long_message=$(python3 -c "print('A' * 1001)")

  test_http \
    "Message exceeds 1000 characters" \
    "POST" \
    "{
      \"name\": \"Test User\",
      \"email\": \"test@example.com\",
      \"message\": \"$long_message\"
    }" \
    "http://localhost:3000" \
    400
}

#==============================================================================
# Summary
#==============================================================================

print_summary() {
  echo ""
  echo -e "${BLUE}================================================================================================${NC}"
  echo -e "${BLUE}  TEST SUMMARY${NC}"
  echo -e "${BLUE}================================================================================================${NC}"
  echo ""
  echo "  Total tests: $TEST_COUNT"
  echo -e "  ${GREEN}Passed: $PASS_COUNT${NC}"
  echo -e "  ${RED}Failed: $FAIL_COUNT${NC}"
  echo ""

  if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    exit 0
  else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo ""
    exit 1
  fi
}

#==============================================================================
# Main
#==============================================================================

show_help() {
  cat << EOF
Cloud Function Testing Script

Usage:
  bash test-function.sh [test_name]

Options:
  [no args]         Run all tests
  valid             Test 1: Valid submission with all fields
  minimal           Test 2: Minimal valid submission
  missing           Test 3: Missing required fields
  invalid-email     Test 4: Invalid email format
  short-message     Test 5: Message too short
  honeypot          Test 6: Honeypot spam protection
  suspicious-email  Test 7: Suspicious email pattern
  cors-preflight    Test 8: CORS preflight
  cors-reject       Test 9: CORS origin rejection
  method            Test 10: Method not allowed
  content-type      Test 11: Invalid Content-Type
  long-message      Test 12: Message too long
  --help, -h        Show this help

Environment:
  FUNCTION_URL      Function URL (default: http://localhost:8080)

Examples:
  bash test-function.sh
  bash test-function.sh valid
  FUNCTION_URL=http://localhost:8081 bash test-function.sh

Before running tests:
  1. Start the function: cd functions/contact-form && npm run dev
  2. Ensure function is running on $FUNCTION_URL
EOF
}

# Check if function is running
check_function() {
  echo -e "${CYAN}Checking if function is running at $FUNCTION_URL...${NC}"
  if curl -s -o /dev/null -w "%{http_code}" "$FUNCTION_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Function is running${NC}"
    echo ""
  else
    echo -e "${RED}✗ Function is not running at $FUNCTION_URL${NC}"
    echo ""
    echo "Please start the function first:"
    echo "  cd functions/contact-form"
    echo "  npm run dev"
    echo ""
    exit 1
  fi
}

# Main execution
case "${1:-all}" in
  -h|--help)
    show_help
    ;;
  all)
    check_function
    test_valid_submission
    test_minimal_valid
    test_missing_fields
    test_invalid_email
    test_message_too_short
    test_honeypot
    test_suspicious_email
    test_cors_preflight
    test_cors_rejection
    test_method_not_allowed
    test_invalid_content_type
    test_long_message
    print_summary
    ;;
  valid)
    check_function
    test_valid_submission
    print_summary
    ;;
  minimal)
    check_function
    test_minimal_valid
    print_summary
    ;;
  missing)
    check_function
    test_missing_fields
    print_summary
    ;;
  invalid-email)
    check_function
    test_invalid_email
    print_summary
    ;;
  short-message)
    check_function
    test_message_too_short
    print_summary
    ;;
  honeypot)
    check_function
    test_honeypot
    print_summary
    ;;
  suspicious-email)
    check_function
    test_suspicious_email
    print_summary
    ;;
  cors-preflight)
    check_function
    test_cors_preflight
    print_summary
    ;;
  cors-reject)
    check_function
    test_cors_rejection
    print_summary
    ;;
  method)
    check_function
    test_method_not_allowed
    print_summary
    ;;
  content-type)
    check_function
    test_invalid_content_type
    print_summary
    ;;
  long-message)
    check_function
    test_long_message
    print_summary
    ;;
  *)
    echo "Unknown test: $1"
    echo "Run 'bash test-function.sh --help' for usage"
    exit 1
    ;;
esac
