#!/bin/bash
#
# Magic Page - Production Start Script
# Starts all services in production mode
#
# Usage: bash start-production.sh
#

set -e

echo "============================================"
echo "  Magic Page - Starting Production"
echo "============================================"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_info() { echo -e "ℹ $1"; }

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Not in project directory"
    exit 1
fi

# Check environment file
if [ ! -f ".env.local" ]; then
    print_error ".env.local not found. Please create it first."
    exit 1
fi

print_success "Environment file found"

# Check if build exists
if [ ! -d ".next" ]; then
    print_warning "Build directory not found. Running build..."
    npm run build
fi

echo ""
echo "============================================"
echo "  Starting Docker Services"
echo "============================================"
echo ""

# Start Docker services
print_info "Starting PostgreSQL, Botpress, and Duckling..."
docker compose up -d

# Wait for services to be ready
print_info "Waiting for services to initialize..."
sleep 5

# Check Docker services
if docker compose ps | grep -q "running"; then
    print_success "Docker services running"
    docker compose ps
else
    print_error "Some Docker services failed to start"
    docker compose ps
    exit 1
fi

echo ""
echo "============================================"
echo "  Starting Next.js Application"
echo "============================================"
echo ""

# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    print_info "Using PM2 process manager"

    # Check if already running
    if pm2 list | grep -q "magic-page"; then
        print_warning "Application already running, restarting..."
        pm2 restart magic-page
    else
        print_info "Starting application with PM2..."
        pm2 start npm --name "magic-page" -- start
        pm2 save
    fi

    echo ""
    print_success "Application started with PM2"
    echo ""
    pm2 status
    echo ""
    print_info "View logs: pm2 logs magic-page"
    print_info "Stop app: pm2 stop magic-page"
    print_info "Restart app: pm2 restart magic-page"
else
    print_warning "PM2 not installed, starting directly..."
    print_info "For production, consider installing PM2:"
    print_info "  npm install -g pm2"
    echo ""
    print_info "Starting application (press Ctrl+C to stop)..."
    npm start
fi

echo ""
print_success "Magic Page is now running!"
echo ""
print_info "Access your application at: https://$(grep DOMAIN .env.local | head -1 | cut -d'=' -f2)"
echo ""
