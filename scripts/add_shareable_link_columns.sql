-- Migration: Add shareable link columns to websitevisitors
-- Run this on the production database

-- Add new columns for shareable chatbot feature
ALTER TABLE websitevisitors ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;
ALTER TABLE websitevisitors ADD COLUMN IF NOT EXISTS bot_theme JSONB;
ALTER TABLE websitevisitors ADD COLUMN IF NOT EXISTS kb_file_id VARCHAR(100);
ALTER TABLE websitevisitors ADD COLUMN IF NOT EXISTS share_email_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE websitevisitors ADD COLUMN IF NOT EXISTS first_message_at TIMESTAMP;

-- Index for fast slug lookups (unique constraint already creates index, but explicit for clarity)
CREATE UNIQUE INDEX IF NOT EXISTS idx_websitevisitors_slug ON websitevisitors(slug);

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'websitevisitors'
ORDER BY ordinal_position;
