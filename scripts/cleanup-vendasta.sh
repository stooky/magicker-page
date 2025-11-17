#!/bin/bash

# Cleanup script to remove old Vendasta integration files
# Run this AFTER verifying Botpress migration works

echo "============================================"
echo "Magic Page - Vendasta Cleanup Script"
echo "============================================"
echo ""
echo "This script will remove old Vendasta integration files."
echo "⚠️  WARNING: This action cannot be undone!"
echo ""
echo "Files to be removed:"
echo "  - pages/api/vendasta-automation-proxy.js"
echo "  - pages/api/vendasta-mylisting-proxy.js"
echo "  - pages/api/webhookListener.js"
echo "  - lib/getVendastaAccessToken.js"
echo "  - components/utils/VendastaWebhook.js"
echo ""

read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo "Starting cleanup..."
echo ""

# Create backup directory
BACKUP_DIR="./vendasta-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 Creating backup in $BACKUP_DIR..."

# Backup files before deleting
FILES=(
    "pages/api/vendasta-automation-proxy.js"
    "pages/api/vendasta-mylisting-proxy.js"
    "pages/api/webhookListener.js"
    "lib/getVendastaAccessToken.js"
    "components/utils/VendastaWebhook.js"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        # Create directory structure in backup
        dir=$(dirname "$file")
        mkdir -p "$BACKUP_DIR/$dir"

        # Copy file to backup
        cp "$file" "$BACKUP_DIR/$file"
        echo "  ✓ Backed up: $file"
    else
        echo "  ⚠ Not found: $file (skipping)"
    fi
done

echo ""
read -p "Backup created. Proceed with deletion? (yes/no): " confirm_delete

if [ "$confirm_delete" != "yes" ]; then
    echo "Deletion cancelled. Backup preserved in $BACKUP_DIR"
    exit 0
fi

echo ""
echo "🗑️  Deleting files..."

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        rm "$file"
        echo "  ✓ Deleted: $file"
    fi
done

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Backup location: $BACKUP_DIR"
echo ""
echo "Next steps:"
echo "  1. Verify Magic Page works with Botpress"
echo "  2. Test the full flow"
echo "  3. If everything works, you can delete $BACKUP_DIR"
echo ""
echo "To restore files (if needed):"
echo "  cp -r $BACKUP_DIR/* ./"
echo ""
