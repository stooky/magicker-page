#!/bin/bash
#
# Magic Page - Deployment Test Script
# Quick automated test of deployment after initial setup
#
# Usage: bash test-deployment.sh
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_header() { echo -e "\n${BLUE}========================================${NC}\n${BLUE}$1${NC}\n${BLUE}========================================${NC}"; }

FAILED=0
WARNINGS=0

echo "============================================"
echo "  Magic Page - Deployment Test"
echo "============================================"
echo ""
print_info "Testing deployment configuration and readiness"
echo ""

# Test 1: Node.js
print_header "Test 1: Node.js Installation"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    print_success "Node.js $NODE_VERSION installed"
    print_success "npm $NPM_VERSION installed"

    # Check version is v20+
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | tr -d 'v')
    if [ "$MAJOR_VERSION" -ge 20 ]; then
        print_success "Node.js version is v20+ (recommended)"
    else
        print_warning "Node.js version is < v20, consider upgrading"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    print_error "Node.js not installed"
    FAILED=$((FAILED + 1))
fi

# Test 2: Docker
print_header "Test 2: Docker Installation"

if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    print_success "Docker installed: $DOCKER_VERSION"

    # Test Docker without sudo
    if docker ps &> /dev/null; then
        print_success "Docker works without sudo"
    else
        print_error "Docker requires sudo (user not in docker group)"
        print_info "Fix: sudo usermod -aG docker \$USER && logout"
        FAILED=$((FAILED + 1))
    fi

    # Check Docker Compose
    if docker compose version &> /dev/null; then
        COMPOSE_VERSION=$(docker compose version)
        print_success "Docker Compose installed: $COMPOSE_VERSION"
    else
        print_error "Docker Compose not installed"
        FAILED=$((FAILED + 1))
    fi
else
    print_error "Docker not installed"
    FAILED=$((FAILED + 1))
fi

# Test 3: PM2
print_header "Test 3: PM2 Installation"

if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 --version)
    print_success "PM2 $PM2_VERSION installed"
else
    print_warning "PM2 not installed (optional but recommended)"
    print_info "Install: npm install -g pm2"
    WARNINGS=$((WARNINGS + 1))
fi

# Test 4: Project Files
print_header "Test 4: Project Structure"

if [ ! -f "package.json" ]; then
    print_error "Not in project directory (package.json not found)"
    FAILED=$((FAILED + 1))
    exit 1
fi

print_success "package.json found"

REQUIRED_FILES=("docker-compose.yml" "server.js" ".env.local.sample" "deploy/setup-ubuntu.sh")
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "$file exists"
    else
        print_error "$file missing"
        FAILED=$((FAILED + 1))
    fi
done

# Test 5: Environment Configuration
print_header "Test 5: Environment Configuration"

if [ -f ".env.local" ]; then
    print_success ".env.local exists"

    # Check critical variables
    CRITICAL_VARS=("DOMAIN" "SSL_CERT_PATH" "SSL_KEY_PATH" "DB_PASSWORD" "BOTPRESS_BOT_ID" "BOTPRESS_API_TOKEN")

    for var in "${CRITICAL_VARS[@]}"; do
        if grep -q "^${var}=" .env.local; then
            VALUE=$(grep "^${var}=" .env.local | cut -d'=' -f2)
            if [ ! -z "$VALUE" ] && [[ "$VALUE" != *"your-"* ]] && [[ "$VALUE" != *"here"* ]]; then
                print_success "$var is configured"
            else
                print_warning "$var appears to be placeholder value"
                WARNINGS=$((WARNINGS + 1))
            fi
        else
            print_error "$var not found in .env.local"
            FAILED=$((FAILED + 1))
        fi
    done
else
    print_error ".env.local not found"
    print_info "Create from template: cp .env.local.sample .env.local"
    FAILED=$((FAILED + 1))
fi

# Test 6: SSL Certificates
print_header "Test 6: SSL Certificates"

if [ -f ".env.local" ]; then
    SSL_CERT=$(grep '^SSL_CERT_PATH=' .env.local | cut -d'=' -f2 | tr -d '"')
    SSL_KEY=$(grep '^SSL_KEY_PATH=' .env.local | cut -d'=' -f2 | tr -d '"')

    if [ -f "$SSL_CERT" ]; then
        print_success "SSL certificate exists: $SSL_CERT"

        # Check expiry
        if command -v openssl &> /dev/null; then
            EXPIRY=$(openssl x509 -enddate -noout -in "$SSL_CERT" 2>/dev/null | cut -d'=' -f2)
            if [ ! -z "$EXPIRY" ]; then
                print_info "Expires: $EXPIRY"
            fi
        fi
    else
        print_error "SSL certificate not found: $SSL_CERT"
        FAILED=$((FAILED + 1))
    fi

    if [ -f "$SSL_KEY" ]; then
        print_success "SSL key exists: $SSL_KEY"
    else
        print_error "SSL key not found: $SSL_KEY"
        FAILED=$((FAILED + 1))
    fi
else
    print_warning "Cannot check SSL (no .env.local)"
fi

# Test 7: Node Dependencies
print_header "Test 7: Node Dependencies"

if [ -d "node_modules" ]; then
    print_success "node_modules directory exists"

    # Check for key dependencies
    KEY_DEPS=("next" "@botpress/client" "playwright" "pg")
    for dep in "${KEY_DEPS[@]}"; do
        if [ -d "node_modules/$dep" ]; then
            print_success "$dep installed"
        else
            print_error "$dep not installed"
            FAILED=$((FAILED + 1))
        fi
    done
else
    print_error "node_modules not found"
    print_info "Install: npm install"
    FAILED=$((FAILED + 1))
fi

# Test 8: Build Status
print_header "Test 8: Build Status"

if [ -d ".next" ]; then
    print_success ".next build directory exists"

    # Check build is recent (within 7 days)
    BUILD_AGE=$(find .next -maxdepth 0 -mtime -7 2>/dev/null | wc -l)
    if [ "$BUILD_AGE" -eq 1 ]; then
        print_success "Build is recent (< 7 days old)"
    else
        print_warning "Build is older than 7 days, consider rebuilding"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    print_warning "Application not built yet"
    print_info "Build: npm run build"
    WARNINGS=$((WARNINGS + 1))
fi

# Test 9: Docker Services
print_header "Test 9: Docker Services"

if docker compose ps 2>/dev/null | grep -q "Up"; then
    print_success "Docker services are running"

    # Check each service
    SERVICES=("botpress_postgres" "botpress" "botpress_duckling")
    for service in "${SERVICES[@]}"; do
        if docker ps --format '{{.Names}}' | grep -q "^${service}$"; then
            STATUS=$(docker inspect --format='{{.State.Status}}' "$service")
            if [ "$STATUS" == "running" ]; then
                print_success "$service is running"
            else
                print_warning "$service is $STATUS"
                WARNINGS=$((WARNINGS + 1))
            fi
        else
            print_warning "$service not running"
            WARNINGS=$((WARNINGS + 1))
        fi
    done
else
    print_warning "Docker services not running"
    print_info "Start: docker compose up -d"
    WARNINGS=$((WARNINGS + 1))
fi

# Test 10: Application Status
print_header "Test 10: Application Status"

if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "magic-page"; then
        STATUS=$(pm2 jlist | grep -A 5 "magic-page" | grep "pm2_env" -A 3 | grep "status" | cut -d'"' -f4 2>/dev/null || echo "unknown")
        if [ "$STATUS" == "online" ]; then
            print_success "Application is running (PM2)"
        else
            print_warning "Application status: $STATUS"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        print_warning "Application not found in PM2"
        print_info "Start: pm2 start npm --name magic-page -- start"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    if pgrep -f "node.*next.*start" > /dev/null; then
        print_success "Application is running (direct)"
    else
        print_warning "Application not running"
        print_info "Start: npm start (or use PM2)"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Test 11: Firewall
print_header "Test 11: Firewall Configuration"

if command -v ufw &> /dev/null; then
    if sudo ufw status | grep -q "Status: active"; then
        print_success "UFW firewall is active"

        # Check required ports
        REQUIRED_PORTS=("22" "80" "443")
        for port in "${REQUIRED_PORTS[@]}"; do
            if sudo ufw status | grep -q "$port"; then
                print_success "Port $port is allowed"
            else
                print_warning "Port $port not explicitly allowed"
                WARNINGS=$((WARNINGS + 1))
            fi
        done
    else
        print_warning "UFW firewall is not active"
        print_info "Enable: sudo ufw enable"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    print_warning "UFW not installed"
    WARNINGS=$((WARNINGS + 1))
fi

# Summary
print_header "Test Summary"

echo ""
if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    print_success "All tests passed! Deployment is ready."
    echo ""
    print_info "Next steps:"
    echo "  1. Verify at: https://\$(grep '^DOMAIN=' .env.local | cut -d'=' -f2)"
    echo "  2. Run health check: bash deploy/health-check.sh"
    echo "  3. Test functionality in browser"
    echo ""
    exit 0
elif [ $FAILED -eq 0 ]; then
    print_warning "$WARNINGS warning(s) found, but deployment should work"
    echo ""
    print_info "Review warnings above and fix if needed"
    echo ""
    exit 0
else
    print_error "$FAILED critical error(s) found"
    if [ $WARNINGS -gt 0 ]; then
        print_warning "$WARNINGS warning(s) also found"
    fi
    echo ""
    print_info "Fix errors above before deploying"
    echo ""
    exit 1
fi
