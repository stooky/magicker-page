# Database Setup Guide

This guide helps you set up the PostgreSQL database for Magic Page + Botpress.

## Option 1: Use Docker PostgreSQL (Easiest)

The `docker-compose.yml` already includes PostgreSQL, so you don't need to install it separately.

### Step 1: Access Docker PostgreSQL

```powershell
# Connect to the PostgreSQL container
docker exec -it botpress_postgres psql -U postgres
```

### Step 2: Create Database

```sql
-- Create the database
CREATE DATABASE mp;

-- Connect to it
\c mp

-- Exit
\q
```

### Step 3: Run Schema Scripts

```powershell
# From the magic-page directory

# Create initial schema
docker exec -i botpress_postgres psql -U postgres -d mp < scripts/database_scheme.sql

# Run Botpress migration
docker exec -i botpress_postgres psql -U postgres -d mp < scripts/update_database_for_botpress.sql
```

### Step 4: Update .env.local

```env
DB_USER=postgres
DB_HOST=localhost
DB_PASSWORD=botpress_password
DB=mp
DB_PORT=5433
```

**Note:** Port is 5433 (not 5432) because we mapped it to avoid conflicts.

---

## Option 2: Use Existing PostgreSQL Installation

If you already have PostgreSQL installed on Windows:

### Step 1: Verify PostgreSQL is Running

```powershell
# Test connection
psql -U postgres -l
```

### Step 2: Create Database

```powershell
# Connect
psql -U postgres

# In psql:
CREATE DATABASE mp;
\c mp
\q
```

### Step 3: Run Schema Scripts

```powershell
# From the magic-page directory

# Create initial schema
psql -U postgres -d mp -f scripts/database_scheme.sql

# Run Botpress migration
psql -U postgres -d mp -f scripts/update_database_for_botpress.sql
```

### Step 4: Update .env.local

```env
DB_USER=postgres
DB_HOST=localhost
DB_PASSWORD=your_postgres_password
DB=mp
DB_PORT=5432
```

---

## Verify Setup

After setting up, verify the database:

### Option 1: Docker PostgreSQL

```powershell
docker exec -it botpress_postgres psql -U postgres -d mp
```

### Option 2: Local PostgreSQL

```powershell
psql -U postgres -d mp
```

### Check Tables

```sql
-- List tables
\dt

-- Should see:
--  public | websitevisitors

-- Check schema
\d websitevisitors

-- Should have columns:
--  sessionid
--  email
--  website
--  companyname
--  mylistingurl (stores bot config)
--  screenshoturl
--  created_at (new)
--  updated_at (new)

-- Exit
\q
```

---

## Troubleshooting

### Can't connect to Docker PostgreSQL

**Problem:** `psql: error: connection refused`

**Solution:**
```powershell
# Check if container is running
docker ps | findstr postgres

# If not running, start it
docker-compose up -d

# Check logs
docker logs botpress_postgres
```

### Port conflict

**Problem:** Port 5432 or 5433 already in use

**Solution:**
Edit `docker-compose.yml`:
```yaml
postgres:
  ports:
    - "5434:5432"  # Change to unused port
```

Then update `.env.local`:
```env
DB_PORT=5434
```

### Can't find psql command

**Problem:** `psql: command not found`

**Solutions:**

**If using Docker PostgreSQL:**
```powershell
# Use docker exec instead
docker exec -it botpress_postgres psql -U postgres
```

**If using local PostgreSQL:**
Add to PATH:
```powershell
# Find PostgreSQL installation
# Usually: C:\Program Files\PostgreSQL\15\bin

# Add to PATH (Windows Settings → Environment Variables)
# Or use full path:
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres
```

### Wrong password

**Problem:** `psql: error: password authentication failed`

**For Docker PostgreSQL:**
Password is: `botpress_password` (set in docker-compose.yml)

**For local PostgreSQL:**
Use your PostgreSQL password from installation

### Database already exists

**Problem:** `ERROR: database "mp" already exists`

**Solution:**
```sql
-- Drop and recreate
DROP DATABASE IF EXISTS mp;
CREATE DATABASE mp;
```

Or just skip database creation and run migrations.

---

## Testing Database Connection

### Quick Test

```powershell
# Docker PostgreSQL
docker exec botpress_postgres psql -U postgres -d mp -c "SELECT 1;"

# Local PostgreSQL
psql -U postgres -d mp -c "SELECT 1;"
```

Should output:
```
 ?column?
----------
        1
(1 row)
```

### Test from Magic Page

Create a test script: `test-db.js`

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'mp',
  password: 'botpress_password', // or your password
  port: 5433, // or 5432
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connected successfully!');
    console.log('Current time:', res.rows[0].now);
  }
  pool.end();
});
```

Run it:
```powershell
node test-db.js
```

---

## Migration Scripts Explained

### `database_scheme.sql`

Creates the initial table:
- `websitevisitors` table
- Columns for session, email, website, company, etc.

### `update_database_for_botpress.sql`

Adds Botpress-specific features:
- Converts `mylistingurl` to TEXT (stores JSON)
- Adds `created_at` and `updated_at` timestamps
- Adds triggers for auto-updating timestamps
- Adds indexes for performance

---

## Advanced: Manual Schema Creation

If you prefer to create manually:

```sql
-- Connect to database
\c mp

-- Create table
CREATE TABLE websitevisitors (
    sessionid TEXT PRIMARY KEY,
    email TEXT,
    website TEXT,
    companyname TEXT,
    mylistingurl TEXT,
    screenshoturl BYTEA,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_sessionid ON websitevisitors(sessionid);

-- Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
CREATE TRIGGER update_websitevisitors_updated_at
    BEFORE UPDATE ON websitevisitors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify
\d websitevisitors
```

---

## Next Steps

After database is set up:

1. ✅ Verify tables exist
2. Update `.env.local` with correct credentials
3. Continue with Botpress setup (QUICKSTART.md)
4. Test Magic Page application

---

## Quick Reference

**Docker PostgreSQL:**
```powershell
# Connect
docker exec -it botpress_postgres psql -U postgres -d mp

# Run script
docker exec -i botpress_postgres psql -U postgres -d mp < script.sql

# Check logs
docker logs botpress_postgres
```

**Local PostgreSQL:**
```powershell
# Connect
psql -U postgres -d mp

# Run script
psql -U postgres -d mp -f script.sql

# List databases
psql -U postgres -l
```

**Connection Details:**
- **Docker:** localhost:5433, user: postgres, password: botpress_password
- **Local:** localhost:5432, user: postgres, password: (your password)
