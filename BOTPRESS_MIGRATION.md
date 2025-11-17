# Botpress Migration Guide

## Overview
This guide documents the migration from Vendasta's chat agent to Botpress, an open-source conversational AI platform.

## Prerequisites

### 1. Install Docker Desktop (Windows)
- Download from: https://www.docker.com/products/docker-desktop
- Install and restart your computer
- Verify: Open PowerShell and run `docker --version`

### 2. Verify Node.js Installation
- Check: `node --version` (should be v18+)
- Check: `npm --version`
- If not installed, download from: https://nodejs.org/

## Setup Instructions

### Step 1: Start Botpress

```bash
# From the magic-page directory
docker-compose up -d
```

This will start:
- **Botpress** on http://localhost:3001
- **PostgreSQL** for Botpress on port 5433
- **Duckling** (NLU service) on port 8000

### Step 2: Access Botpress Admin

1. Open browser: http://localhost:3001
2. Create admin account (first time only)
3. Create a new bot:
   - Name: "Magic Page Lead Bot"
   - Template: "Empty Bot" or "Lead Capture"

### Step 3: Configure the Lead Capture Bot

#### Create Conversation Flow:
1. Go to **Flows** → Create new flow: "lead-capture"
2. Add nodes:
   - **Greeting**: "Hi! I'd love to learn more about your business."
   - **Capture Name**: "What's your name?"
   - **Capture Email**: "What's your email address?"
   - **Capture Company**: "What's your company name?"
   - **Capture Website**: "What's your website URL?"
   - **Qualification Questions**: Add custom questions based on your needs
   - **Thank You**: "Thanks! We'll be in touch soon."

#### Configure Slots (Variables):
- `session.name` - String
- `session.email` - String (with email validation)
- `session.company` - String
- `session.website` - String (with URL validation)

#### Add Webhooks:
1. Go to **Code Editor** → Create action: `saveLeadToDatabase.js`
2. Use the Botpress SDK to send data to Magic Page API

### Step 4: Get Webchat Widget Code

1. In Botpress: **Config** → **Webchat**
2. Enable webchat
3. Customize appearance:
   - Bot name
   - Avatar
   - Colors (match Magic Page theme)
   - Container width
4. Copy the **Bot ID** - you'll need this

### Step 5: Configure Environment Variables

Create `.env.local` from `.env.local.sample`:

```bash
# Botpress Configuration (NEW)
BOTPRESS_SERVER_URL=http://localhost:3001
BOTPRESS_BOT_ID=<your-bot-id-here>
BOTPRESS_WEBHOOK_SECRET=<generate-random-string>

# Keep existing database config for Magic Page data
DB_USER=postgres
DB_HOST=localhost
DB_PASSWORD=<your-password>
DB=mp
DB_PORT=5432

# Remove/comment out Vendasta variables (no longer needed)
# VENDASTA_PARTNER_ID=...
# VENDASTA_PRIVATE_KEY=...
```

### Step 6: Install Dependencies

```bash
npm install
```

### Step 7: Start Development Server

```bash
npm run dev
```

Magic Page will be available at: http://localhost:3000

## Architecture Changes

### What's Being Removed:
- ❌ `pages/api/vendasta-automation-proxy.js`
- ❌ `pages/api/vendasta-mylisting-proxy.js`
- ❌ `pages/api/webhookListener.js`
- ❌ `lib/getVendastaAccessToken.js`
- ❌ `components/utils/VendastaWebhook.js`
- ❌ All Vendasta OAuth logic

### What's Being Added:
- ✅ `pages/api/botpress/create-session.js` - Create bot session
- ✅ `pages/api/botpress/webhook.js` - Receive bot events
- ✅ Updated `components/Valhallah.js` - Botpress widget integration
- ✅ Simplified workflow (no external automation needed)

### New Flow:
```
User fills form
    ↓
Create Botpress session via API
    ↓
Load Botpress widget with session ID
    ↓
User interacts with bot
    ↓
Bot sends webhook to /api/botpress/webhook
    ↓
Store lead data in PostgreSQL
    ↓
Display chat in Valhallah component
```

## Database Schema Changes

The `mylistingurl` column will be repurposed to store Botpress session data:

```sql
-- Rename column for clarity
ALTER TABLE websitevisitors
RENAME COLUMN mylistingurl TO chatSessionData;

-- Or keep as is and use for storing Botpress session JSON
```

## Testing Checklist

- [ ] Docker containers running: `docker ps`
- [ ] Botpress admin accessible: http://localhost:3001
- [ ] Bot created and published
- [ ] Widget displays in Magic Page
- [ ] Form submission creates bot session
- [ ] Chat widget loads correctly
- [ ] Lead data saves to database
- [ ] Zapier integration still works (optional)

## Production Deployment

### Option 1: Self-Hosted Botpress
- Deploy Botpress container to your server
- Use environment variable for production URL
- Set `BP_PRODUCTION=true`

### Option 2: Botpress Cloud
- Sign up at https://botpress.com
- Create bot in cloud dashboard
- Use cloud Bot ID in Magic Page
- No self-hosting required

## Rollback Plan

If you need to revert to Vendasta:
1. Stop using the new Botpress code
2. Restore Vendasta API files from git
3. Update `.env.local` with Vendasta credentials
4. Redeploy

## Support

- Botpress Docs: https://botpress.com/docs
- Botpress Community: https://discord.gg/botpress
- Magic Page Issues: Create in your repo
