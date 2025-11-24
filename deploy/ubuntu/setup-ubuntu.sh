#!/bin/bash
#
# Magic Page - Ubuntu Server Setup Script
# Automates initial server setup and dependency installation
#
# Usage: bash setup-ubuntu.sh
#

set -e  # Exit on any error

echo "============================================"
echo "  Magic Page - Ubuntu Server Setup"
echo "============================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "ℹ $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_warning "Running as root user detected"
    echo ""
    echo "This script is designed to run as a regular user with sudo privileges."
    echo "However, for fresh Vultr/cloud servers where you SSH as root, this is acceptable."
    echo ""
    echo "Are you:"
    echo "  1) Logged in AS root (ssh root@server) - OKAY for testing"
    echo "  2) Using sudo unnecessarily (sudo bash script.sh) - NOT recommended"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        print_info "For production deployments, create a dedicated user:"
        echo "  adduser magicpage"
        echo "  usermod -aG sudo magicpage"
        echo "  su - magicpage"
        echo ""
        print_info "See deploy/ubuntu/INITIAL_SETUP.md for details"
        exit 1
    fi
    echo ""
    print_info "Continuing as root..."
    echo ""
fi

# Check Ubuntu version
if [ -f /etc/os-release ]; then
    . /etc/os-release
    if [[ "$ID" != "ubuntu" ]]; then
        print_warning "This script is designed for Ubuntu. You're running: $ID"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    print_success "Operating System: $PRETTY_NAME"
else
    print_error "Cannot detect OS version"
    exit 1
fi

echo ""
echo "This script will install:"
echo "  - System updates"
echo "  - Build tools (curl, wget, git)"
echo "  - Node.js v20 (via nvm)"
echo "  - Docker & Docker Compose"
echo "  - UFW Firewall"
echo "  - Playwright dependencies"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi

echo ""
echo "============================================"
echo "  Step 1: System Update"
echo "============================================"
echo ""

sudo apt update
sudo apt upgrade -y
print_success "System updated"

echo ""
echo "============================================"
echo "  Step 2: Install Build Tools"
echo "============================================"
echo ""

sudo apt install -y curl wget git build-essential
print_success "Build tools installed"

echo ""
echo "============================================"
echo "  Step 3: Install Node.js via nvm"
echo "============================================"
echo ""

# Check if nvm is already installed
if [ -d "$HOME/.nvm" ]; then
    print_warning "nvm already installed, skipping..."
else
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

    # Load nvm
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

    print_success "nvm installed"
fi

# Source nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js 20
print_info "Installing Node.js v20..."
nvm install 20
nvm use 20
nvm alias default 20

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_success "Node.js $NODE_VERSION installed"
print_success "npm $NPM_VERSION installed"

echo ""
echo "============================================"
echo "  Step 4: Install Docker"
echo "============================================"
echo ""

# Check if Docker is already installed
if command -v docker &> /dev/null; then
    print_warning "Docker already installed, skipping..."
    docker --version
else
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    print_success "Docker installed"
fi

# Add user to docker group
if groups $USER | grep &>/dev/null '\bdocker\b'; then
    print_warning "User already in docker group"
else
    sudo usermod -aG docker $USER
    print_success "User added to docker group"
    print_warning "You need to log out and back in for group changes to take effect"
fi

echo ""
echo "============================================"
echo "  Step 5: Install Docker Compose"
echo "============================================"
echo ""

sudo apt install -y docker-compose-plugin
print_success "Docker Compose installed"
docker compose version

echo ""
echo "============================================"
echo "  Step 6: Install UFW Firewall"
echo "============================================"
echo ""

if command -v ufw &> /dev/null; then
    print_warning "UFW already installed"
else
    sudo apt install -y ufw
    print_success "UFW installed"
fi

# Configure basic firewall rules
print_info "Configuring firewall rules..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment "SSH"
sudo ufw allow 80/tcp comment "HTTP"
sudo ufw allow 443/tcp comment "HTTPS"

print_warning "UFW configured but not enabled yet"
print_info "To enable: sudo ufw enable"
print_info "To check status: sudo ufw status"

echo ""
echo "============================================"
echo "  Step 7: Install PM2 (Process Manager)"
echo "============================================"
echo ""

npm install -g pm2
print_success "PM2 installed globally"
pm2 --version

echo ""
echo "============================================"
echo "  Step 8: Install Playwright Dependencies"
echo "============================================"
echo ""

print_info "Installing system dependencies for Playwright..."
# This will be done after npm install in the project directory
print_warning "Run 'npx playwright install-deps' in project directory later"

echo ""
echo "============================================"
echo "  Installation Complete!"
echo "============================================"
echo ""
print_success "All dependencies installed successfully"
echo ""
echo "Next steps:"
echo "  1. Log out and back in (for Docker group membership)"
echo "  2. Clone the repository: git clone https://github.com/stooky/magicker-page.git"
echo "  3. cd magicker-page"
echo "  4. Run: bash deploy/install-app.sh"
echo ""
print_warning "Important: You must log out and back in before Docker will work without sudo"
echo ""
