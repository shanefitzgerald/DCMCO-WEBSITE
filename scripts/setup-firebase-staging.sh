#!/bin/bash
#
# Firebase Staging Site Setup Script
# Usage: ./scripts/setup-firebase-staging.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ID="dcmco-prod-2026"
STAGING_SITE_ID="dcmco-staging"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Firebase Staging Site Setup${NC}"
echo -e "${BLUE}  Project: ${PROJECT_ID}${NC}"
echo -e "${BLUE}  Staging Site: ${STAGING_SITE_ID}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}✗${NC} Firebase CLI not found"
    echo -e "${YELLOW}  Install from: npm install -g firebase-tools${NC}"
    exit 1
fi

echo -e "${BLUE}[Step 1/3]${NC} Checking Firebase authentication..."
firebase projects:list > /dev/null 2>&1 || {
    echo -e "${YELLOW}⚠${NC}  Not authenticated to Firebase"
    echo -e "${YELLOW}  Run: firebase login${NC}"
    exit 1
}
echo -e "${GREEN}✓${NC} Authenticated to Firebase"

echo -e "\n${BLUE}[Step 2/3]${NC} Creating staging hosting site..."

# Check if site already exists
if firebase hosting:sites:list --project=$PROJECT_ID 2>/dev/null | grep -q "$STAGING_SITE_ID"; then
    echo -e "${YELLOW}⚠${NC}  Staging site already exists: ${STAGING_SITE_ID}"
else
    # Create the staging site
    firebase hosting:sites:create $STAGING_SITE_ID --project=$PROJECT_ID
    echo -e "${GREEN}✓${NC} Staging site created: ${STAGING_SITE_ID}"
fi

echo -e "\n${BLUE}[Step 3/3]${NC} Configuring hosting targets..."

# Apply hosting targets
firebase target:apply hosting production dcmco-prod-2026 --project=$PROJECT_ID
firebase target:apply hosting staging $STAGING_SITE_ID --project=$PROJECT_ID

echo -e "${GREEN}✓${NC} Hosting targets configured"

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓${NC} Setup complete!"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${BLUE}Environment URLs:${NC}"
echo -e "  Production: ${GREEN}https://dcmco-prod-2026.web.app${NC}"
echo -e "  Staging:    ${YELLOW}https://${STAGING_SITE_ID}.web.app${NC}"
echo -e ""

echo -e "${BLUE}Deploy commands:${NC}"
echo -e "  # Deploy to staging"
echo -e "  ${YELLOW}firebase deploy --only hosting:staging${NC}"
echo -e ""
echo -e "  # Deploy to production"
echo -e "  ${YELLOW}firebase deploy --only hosting:production${NC}"
echo -e ""
echo -e "  # Deploy to both"
echo -e "  ${YELLOW}firebase deploy --only hosting${NC}"
echo -e ""
