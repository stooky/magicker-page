-- Update database schema for Botpress integration
-- This script prepares the existing database to work with Botpress

-- Optional: Rename the column for clarity
-- Uncomment if you want to rename mylistingurl to chatSessionData
-- ALTER TABLE websitevisitors RENAME COLUMN mylistingurl TO chatSessionData;

-- The mylistingurl column can now store JSON with Botpress session data
-- Example structure:
-- {
--   "botpressUrl": "http://localhost:3001",
--   "botId": "your-bot-id",
--   "webchatUrl": "http://localhost:3001/s/your-bot-id",
--   "sessionID": "abc123"
-- }

-- Ensure the column can handle larger JSON objects if needed
ALTER TABLE websitevisitors
ALTER COLUMN mylistingurl TYPE TEXT;

-- Add index for faster sessionID lookups (if not already exists)
CREATE INDEX IF NOT EXISTS idx_sessionid ON websitevisitors(sessionid);

-- Add a timestamp column to track when records were created/updated
ALTER TABLE websitevisitors
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to call the function
DROP TRIGGER IF EXISTS update_websitevisitors_updated_at ON websitevisitors;
CREATE TRIGGER update_websitevisitors_updated_at
    BEFORE UPDATE ON websitevisitors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Display current schema
\d websitevisitors
