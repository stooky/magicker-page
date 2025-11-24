#!/bin/bash
#
# Magic Page - Database Backup Script
# Creates a timestamped backup of the PostgreSQL database
#
# Usage: bash backup-database.sh [backup_directory]
#
# Can be scheduled with cron:
# 0 2 * * * /opt/magic-page/deploy/backup-database.sh /opt/backups/magic-page
#

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_info() { echo -e "ℹ $1"; }

# Configuration
BACKUP_DIR="${1:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="botpress_postgres"
DB_NAME="mp"
DB_USER="postgres"
BACKUP_FILE="$BACKUP_DIR/magic_page_db_$DATE.sql"
RETENTION_DAYS=7

echo "============================================"
echo "  Magic Page - Database Backup"
echo "============================================"
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"
print_success "Backup directory: $BACKUP_DIR"

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    print_error "PostgreSQL container '$CONTAINER_NAME' is not running"
    exit 1
fi

print_success "PostgreSQL container is running"

# Perform backup
print_info "Backing up database '$DB_NAME'..."
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    print_success "Backup created: $BACKUP_FILE ($BACKUP_SIZE)"
else
    print_error "Backup failed"
    exit 1
fi

# Compress backup
print_info "Compressing backup..."
gzip "$BACKUP_FILE"
COMPRESSED_FILE="${BACKUP_FILE}.gz"
COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
print_success "Compressed: $COMPRESSED_FILE ($COMPRESSED_SIZE)"

# Clean up old backups
print_info "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "magic_page_db_*.sql.gz" -mtime +$RETENTION_DAYS -delete
REMAINING_BACKUPS=$(find "$BACKUP_DIR" -name "magic_page_db_*.sql.gz" | wc -l)
print_success "Retained $REMAINING_BACKUPS backup(s)"

echo ""
print_success "Backup complete!"
echo ""
print_info "To restore this backup:"
print_info "  gunzip $COMPRESSED_FILE"
print_info "  cat ${BACKUP_FILE} | docker exec -i $CONTAINER_NAME psql -U $DB_USER $DB_NAME"
echo ""
