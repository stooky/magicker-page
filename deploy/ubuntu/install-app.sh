#!/bin/bash
#
# Magic Page - Application Installation Script
# Installs dependencies and sets up the application
#
# Usage: bash install-app.sh
#

set -e  # Exit on any error

echo "============================================"
echo "  Magic Page - Application Installation"
echo "============================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_info() { echo -e "ℹ $1"; }

# Check if we're in the project directory
if [ ! -f "package.json" ]; then
    print_error "Not in project directory. Please cd to the magic-page directory first."
    exit 1
fi

print_success "Found package.json"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please run setup-ubuntu.sh first."
    exit 1
fi

NODE_VERSION=$(node --version)
print_success "Node.js $NODE_VERSION detected"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker not found. Please run setup-ubuntu.sh first."
    exit 1
fi

print_success "Docker detected"

echo ""
echo "============================================"
echo "  Step 1: Install Node Dependencies"
echo "============================================"
echo ""

print_info "Running npm install..."
npm install
print_success "Dependencies installed"

echo ""
echo "============================================"
echo "  Step 2: Install Playwright"
echo "============================================"
echo ""

print_info "Installing Playwright browsers and system dependencies..."
npx playwright install-deps
npx playwright install
print_success "Playwright installed"

echo ""
echo "============================================"
echo "  Step 3: Configure Environment"
echo "============================================"
echo ""

if [ -f ".env.local" ]; then
    print_warning ".env.local already exists"
    read -p "Overwrite with template? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp .env.local.sample .env.local
        print_success "Created .env.local from template"
    fi
else
    cp .env.local.sample .env.local
    print_success "Created .env.local from template"
fi

print_warning "IMPORTANT: Edit .env.local with your actual values"
print_info "Run: nano .env.local"

echo ""
echo "============================================"
echo "  Step 4: SSL Certificate Setup"
echo "============================================"
echo ""

read -p "Do you want to set up SSL with Let's Encrypt now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter your domain name: " DOMAIN

    if [ -z "$DOMAIN" ]; then
        print_error "No domain provided, skipping SSL setup"
    else
        print_info "Installing Certbot..."
        sudo apt install -y certbot

        print_warning "Make sure port 80 is open in your firewall"
        print_info "Generating certificate for $DOMAIN..."

        sudo certbot certonly --standalone -d "$DOMAIN"

        if [ $? -eq 0 ]; then
            print_success "Certificate generated successfully"
            print_info "Certificate location: /etc/letsencrypt/live/$DOMAIN/"

            # Update .env.local with certificate paths
            sed -i "s|^DOMAIN=.*|DOMAIN=$DOMAIN|" .env.local
            sed -i "s|^NEXT_PUBLIC_DOMAIN=.*|NEXT_PUBLIC_DOMAIN=$DOMAIN|" .env.local
            sed -i "s|^SSL_KEY_PATH=.*|SSL_KEY_PATH=\"/etc/letsencrypt/live/$DOMAIN/privkey.pem\"|" .env.local
            sed -i "s|^SSL_CERT_PATH=.*|SSL_CERT_PATH=\"/etc/letsencrypt/live/$DOMAIN/fullchain.pem\"|" .env.local

            print_success "Updated .env.local with SSL paths"
        else
            print_error "Certificate generation failed"
        fi
    fi
else
    print_info "Skipping SSL setup - you can run it later manually"
fi

echo ""
echo "============================================"
echo "  Step 5: Database Setup"
echo "============================================"
echo ""

read -p "Start PostgreSQL container now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Starting PostgreSQL..."
    docker compose up -d postgres

    print_info "Waiting for PostgreSQL to initialize..."
    sleep 10

    print_info "Creating database 'mp'..."
    docker exec -it botpress_postgres psql -U postgres -c "CREATE DATABASE mp;" 2>/dev/null || print_warning "Database 'mp' may already exist"

    print_success "Database setup complete"

    # Test connection
    docker exec -it botpress_postgres psql -U postgres -d mp -c "SELECT 1;" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        print_success "Database connection verified"
    else
        print_error "Database connection failed"
    fi
else
    print_info "Skipping database setup"
fi

echo ""
echo "============================================"
echo "  Installation Complete!"
echo "============================================"
echo ""
print_success "Application installed successfully"
echo ""
echo "Before starting the application:"
echo "  1. Edit .env.local with your API keys and credentials"
echo "     nano .env.local"
echo ""
echo "  2. Build the application:"
echo "     npm run build"
echo ""
echo "  3. Start Docker services:"
echo "     docker compose up -d"
echo ""
echo "  4. Start the application:"
echo "     Option A (PM2 - Recommended):"
echo "       pm2 start npm --name magic-page -- start"
echo "       pm2 save"
echo "       pm2 startup"
echo ""
echo "     Option B (Direct):"
echo "       npm start"
echo ""
echo "  5. Enable firewall (if not already enabled):"
echo "     sudo ufw enable"
echo ""
print_info "For full deployment guide, see: UBUNTU_DEPLOYMENT.md"
echo ""
