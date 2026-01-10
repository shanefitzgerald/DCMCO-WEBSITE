#!/bin/bash
#
# Firebase GitHub Actions Setup Script
# Usage: ./scripts/setup-firebase-github-actions.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ID="dcmco-prod-2026"
SERVICE_ACCOUNT_NAME="firebase-deployer"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
KEY_FILE="firebase-service-account.json"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Firebase GitHub Actions Setup${NC}"
echo -e "${BLUE}  Project: ${PROJECT_ID}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}✗${NC} gcloud CLI not found"
    echo -e "${YELLOW}  Install from: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi

# Check if firebase is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${YELLOW}⚠${NC}  Firebase CLI not found"
    echo -e "${YELLOW}  Installing firebase-tools...${NC}"
    npm install -g firebase-tools
fi

echo -e "${BLUE}[Step 1/6]${NC} Checking authentication..."
CURRENT_ACCOUNT=$(gcloud config get-value account 2>/dev/null || echo "")
if [ -z "$CURRENT_ACCOUNT" ]; then
    echo -e "${YELLOW}⚠${NC}  Not authenticated"
    echo -e "${YELLOW}  Run: gcloud auth login${NC}"
    exit 1
else
    echo -e "${GREEN}✓${NC} Authenticated as: ${CURRENT_ACCOUNT}"
fi

echo -e "\n${BLUE}[Step 2/6]${NC} Creating service account..."
if gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID &>/dev/null; then
    echo -e "${YELLOW}⚠${NC}  Service account already exists"
else
    gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
        --display-name="Firebase Deployer for GitHub Actions" \
        --project=$PROJECT_ID
    echo -e "${GREEN}✓${NC} Service account created"
fi

echo -e "\n${BLUE}[Step 3/6]${NC} Granting permissions..."

# Firebase Admin role
echo -e "  Granting Firebase Admin role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/firebase.admin" \
    --quiet

# Firebase Hosting Admin role
echo -e "  Granting Firebase Hosting Admin role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/firebasehosting.admin" \
    --quiet

echo -e "${GREEN}✓${NC} Permissions granted"

echo -e "\n${BLUE}[Step 4/6]${NC} Creating service account key..."
if [ -f "$KEY_FILE" ]; then
    echo -e "${YELLOW}⚠${NC}  Key file already exists: ${KEY_FILE}"
    read -p "  Overwrite? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}  Skipping key creation${NC}"
        exit 0
    fi
    rm $KEY_FILE
fi

gcloud iam service-accounts keys create $KEY_FILE \
    --iam-account=$SERVICE_ACCOUNT_EMAIL \
    --project=$PROJECT_ID

echo -e "${GREEN}✓${NC} Service account key created: ${KEY_FILE}"

echo -e "\n${BLUE}[Step 5/6]${NC} Key file contents:"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
cat $KEY_FILE
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${BLUE}[Step 6/6]${NC} Next steps:"
echo -e "1. Copy the JSON output above (from { to })"
echo -e "2. Go to GitHub repository settings:"
echo -e "   ${BLUE}https://github.com/shanefitzgerald/DCMCO-WEBSITE/settings/secrets/actions${NC}"
echo -e "3. Click \"New repository secret\""
echo -e "4. Name: ${GREEN}FIREBASE_SERVICE_ACCOUNT${NC}"
echo -e "5. Value: Paste the entire JSON content"
echo -e "6. Click \"Add secret\""
echo -e ""
echo -e "${YELLOW}⚠${NC}  For security, delete the key file after adding to GitHub:"
echo -e "   ${BLUE}rm ${KEY_FILE}${NC}"
echo -e ""
echo -e "${GREEN}✓${NC} Setup complete!"
echo -e ""
echo -e "${BLUE}Test deployment:${NC}"
echo -e "  git add ."
echo -e "  git commit -m \"feat: add Firebase Hosting\""
echo -e "  git push origin main"
echo -e ""
