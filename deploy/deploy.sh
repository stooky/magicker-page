#!/bin/bash
#
# Magic Page Deployment Script
# Usage: ./deploy.sh [commit]
#
# Deploys the latest master (or specified commit) to mb.membies.com
#

set -e

# Configuration
SERVER="root@mb.membies.com"
SSH_KEY="~/.ssh/id_wiki"
APP_DIR="/root/magicker-page"
REMOTE_BRANCH="origin/master"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Magic Page Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Get target commit (default: latest master)
TARGET_COMMIT="${1:-}"

# SSH wrapper
ssh_cmd() {
    ssh -i $SSH_KEY $SERVER "$1"
}

# Step 1: Show current state
echo -e "${YELLOW}[1/5] Current server state:${NC}"
CURRENT_COMMIT=$(ssh_cmd "cd $APP_DIR && git rev-parse --short HEAD")
echo "  Server is at commit: $CURRENT_COMMIT"

# Step 2: Fetch latest
echo ""
echo -e "${YELLOW}[2/5] Fetching latest from origin...${NC}"
ssh_cmd "cd $APP_DIR && git fetch origin"

# Step 3: Determine target
if [ -z "$TARGET_COMMIT" ]; then
    TARGET_COMMIT=$(ssh_cmd "cd $APP_DIR && git rev-parse --short $REMOTE_BRANCH")
    echo "  Deploying latest master: $TARGET_COMMIT"
else
    echo "  Deploying specific commit: $TARGET_COMMIT"
fi

# Step 4: Check if already deployed
if [ "$CURRENT_COMMIT" = "$TARGET_COMMIT" ]; then
    echo ""
    echo -e "${GREEN}Already at target commit. Nothing to deploy.${NC}"
    exit 0
fi

# Step 5: Show what will change
echo ""
echo -e "${YELLOW}[3/5] Changes to deploy:${NC}"
ssh_cmd "cd $APP_DIR && git log --oneline $CURRENT_COMMIT..$TARGET_COMMIT" || echo "  (new commits)"

# Confirm deployment
echo ""
read -p "Deploy $TARGET_COMMIT to production? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment cancelled.${NC}"
    exit 1
fi

# Step 6: Deploy
echo ""
echo -e "${YELLOW}[4/5] Deploying...${NC}"

# Save rollback point
echo "  Saving rollback point: $CURRENT_COMMIT"
ssh_cmd "echo '$CURRENT_COMMIT' > $APP_DIR/.last-working-commit"

# Checkout target
echo "  Checking out $TARGET_COMMIT..."
ssh_cmd "cd $APP_DIR && git checkout $TARGET_COMMIT"

# Install dependencies if package.json changed
echo "  Checking for dependency changes..."
NEEDS_INSTALL=$(ssh_cmd "cd $APP_DIR && git diff $CURRENT_COMMIT $TARGET_COMMIT --name-only | grep -c 'package.json' || true")
if [ "$NEEDS_INSTALL" -gt 0 ]; then
    echo "  Installing dependencies..."
    ssh_cmd "cd $APP_DIR && source ~/.nvm/nvm.sh && npm install"
else
    echo "  No dependency changes, skipping npm install"
fi

# Restart app
echo "  Restarting application..."
ssh_cmd "source ~/.nvm/nvm.sh && pm2 restart magic-page"

# Step 7: Verify
echo ""
echo -e "${YELLOW}[5/5] Verifying deployment...${NC}"
sleep 3
STATUS=$(ssh_cmd "source ~/.nvm/nvm.sh && pm2 jlist" | grep -o '"status":"[^"]*"' | head -1)
HEALTH=$(ssh_cmd "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000" || echo "000")

echo "  PM2 Status: $STATUS"
echo "  HTTP Health: $HEALTH"

if [ "$HEALTH" = "200" ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Deployment successful!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "  Site: https://mb.membies.com"
    echo "  Deployed: $TARGET_COMMIT"
    echo "  Rollback: ./deploy.sh $CURRENT_COMMIT"
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  Deployment may have failed!${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "  Check logs: ssh -i $SSH_KEY $SERVER 'pm2 logs magic-page --lines 50'"
    echo "  Rollback:   ./deploy.sh $CURRENT_COMMIT"
    exit 1
fi
