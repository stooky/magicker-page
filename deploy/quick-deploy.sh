#!/bin/bash
#
# Quick Deploy Script (run ON the server)
# Usage: ./quick-deploy.sh [commit]
#
# Run this when you're already SSHed into mb.membies.com
#

set -e

APP_DIR="/root/magicker-page"
cd $APP_DIR

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Quick Deploy - Magic Page${NC}"
echo ""

# Source nvm
source ~/.nvm/nvm.sh

# Current state
CURRENT=$(git rev-parse --short HEAD)
echo "Current commit: $CURRENT"

# Fetch and show available
git fetch origin
LATEST=$(git rev-parse --short origin/master)
echo "Latest master:  $LATEST"

# Target
TARGET="${1:-$LATEST}"
echo "Target:         $TARGET"
echo ""

if [ "$CURRENT" = "$TARGET" ]; then
    echo -e "${GREEN}Already at target. Nothing to do.${NC}"
    exit 0
fi

# Save rollback point
echo "$CURRENT" > .last-working-commit
echo "Rollback saved: $CURRENT"

# Deploy
echo ""
echo -e "${YELLOW}Deploying...${NC}"
git checkout $TARGET

# Check if npm install needed
if git diff $CURRENT $TARGET --name-only | grep -q 'package.json'; then
    echo "Installing dependencies..."
    npm install
fi

# Restart
pm2 restart magic-page

# Verify
sleep 2
pm2 status
echo ""

HEALTH=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000)
if [ "$HEALTH" = "200" ]; then
    echo -e "${GREEN}Deploy successful! Health: $HEALTH${NC}"
else
    echo -e "${RED}Warning: Health check returned $HEALTH${NC}"
    echo "Check: pm2 logs magic-page --lines 30"
    echo "Rollback: git checkout $CURRENT && pm2 restart magic-page"
fi
