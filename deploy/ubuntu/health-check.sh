#!/bin/bash
#
# Magic Page - Health Check Script
# Verifies all services are running correctly
#
# Usage: bash health-check.sh
#

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_info() { echo -e "ℹ $1"; }

FAILED=0

echo "============================================"
echo "  Magic Page - Health Check"
echo "============================================"
echo ""

# Check Docker services
echo "Docker Services:"
echo "----------------"

services=("botpress_postgres" "botpress" "botpress_duckling")
for service in "${services[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${service}$"; then
        STATUS=$(docker inspect --format='{{.State.Status}}' "$service")
        if [ "$STATUS" == "running" ]; then
            print_success "$service is running"
        else
            print_error "$service is $STATUS"
            FAILED=1
        fi
    else
        print_error "$service is not running"
        FAILED=1
    fi
done

echo ""

# Check PostgreSQL connectivity
echo "Database:"
echo "---------"
if docker exec botpress_postgres psql -U postgres -d mp -c "SELECT 1;" > /dev/null 2>&1; then
    print_success "PostgreSQL connection OK"

    # Count records
    VISITOR_COUNT=$(docker exec botpress_postgres psql -U postgres -d mp -t -c "SELECT COUNT(*) FROM visitors;" 2>/dev/null | xargs || echo "0")
    print_info "Visitors in database: $VISITOR_COUNT"
else
    print_error "PostgreSQL connection failed"
    FAILED=1
fi

echo ""

# Check Next.js application
echo "Next.js Application:"
echo "--------------------"

if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "magic-page"; then
        STATUS=$(pm2 jlist | grep -A 5 "magic-page" | grep "pm2_env" -A 3 | grep "status" | cut -d'"' -f4)
        if [ "$STATUS" == "online" ]; then
            print_success "Application is running (PM2)"

            # Get memory usage
            MEMORY=$(pm2 jlist | grep -A 5 "magic-page" | grep "memory" | head -1 | grep -oP '\d+')
            if [ ! -z "$MEMORY" ]; then
                MEMORY_MB=$((MEMORY / 1024 / 1024))
                print_info "Memory usage: ${MEMORY_MB}MB"
            fi

            # Get uptime
            UPTIME=$(pm2 jlist | grep -A 5 "magic-page" | grep "pm_uptime" | grep -oP '\d+')
            if [ ! -z "$UPTIME" ]; then
                UPTIME_HOURS=$((UPTIME / 1000 / 60 / 60))
                print_info "Uptime: ${UPTIME_HOURS}h"
            fi
        else
            print_error "Application is $STATUS (PM2)"
            FAILED=1
        fi
    else
        print_warning "Application not found in PM2"
        FAILED=1
    fi
else
    if pgrep -f "node.*next.*start" > /dev/null; then
        print_success "Application is running (direct)"
    else
        print_error "Application is not running"
        FAILED=1
    fi
fi

echo ""

# Check if environment file exists
echo "Configuration:"
echo "--------------"
if [ -f ".env.local" ]; then
    print_success ".env.local exists"

    # Check critical variables
    if grep -q "^BOTPRESS_BOT_ID=" .env.local && [ "$(grep '^BOTPRESS_BOT_ID=' .env.local | cut -d'=' -f2)" != "" ]; then
        print_success "Botpress Bot ID configured"
    else
        print_warning "Botpress Bot ID not configured"
    fi

    if grep -q "^SSL_CERT_PATH=" .env.local; then
        SSL_CERT=$(grep '^SSL_CERT_PATH=' .env.local | cut -d'=' -f2 | tr -d '"')
        if [ -f "$SSL_CERT" ]; then
            print_success "SSL certificate exists"

            # Check expiry
            EXPIRY=$(openssl x509 -enddate -noout -in "$SSL_CERT" 2>/dev/null | cut -d'=' -f2)
            if [ ! -z "$EXPIRY" ]; then
                print_info "SSL expires: $EXPIRY"
            fi
        else
            print_warning "SSL certificate not found: $SSL_CERT"
        fi
    fi
else
    print_error ".env.local not found"
    FAILED=1
fi

echo ""

# Check disk space
echo "System Resources:"
echo "-----------------"
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    print_success "Disk usage: ${DISK_USAGE}%"
elif [ "$DISK_USAGE" -lt 90 ]; then
    print_warning "Disk usage: ${DISK_USAGE}%"
else
    print_error "Disk usage: ${DISK_USAGE}% (critically high)"
    FAILED=1
fi

# Check memory
MEMORY_TOTAL=$(free -m | awk 'NR==2 {print $2}')
MEMORY_USED=$(free -m | awk 'NR==2 {print $3}')
MEMORY_PERCENT=$((MEMORY_USED * 100 / MEMORY_TOTAL))

if [ "$MEMORY_PERCENT" -lt 80 ]; then
    print_success "Memory usage: ${MEMORY_PERCENT}% (${MEMORY_USED}MB / ${MEMORY_TOTAL}MB)"
elif [ "$MEMORY_PERCENT" -lt 90 ]; then
    print_warning "Memory usage: ${MEMORY_PERCENT}% (${MEMORY_USED}MB / ${MEMORY_TOTAL}MB)"
else
    print_error "Memory usage: ${MEMORY_PERCENT}% (${MEMORY_USED}MB / ${MEMORY_TOTAL}MB)"
    FAILED=1
fi

# Check Docker disk usage
DOCKER_SIZE=$(docker system df --format '{{.Size}}' 2>/dev/null | head -1 || echo "unknown")
print_info "Docker disk usage: $DOCKER_SIZE"

echo ""
echo "============================================"

if [ $FAILED -eq 0 ]; then
    print_success "All health checks passed!"
    exit 0
else
    print_error "Some health checks failed"
    exit 1
fi
