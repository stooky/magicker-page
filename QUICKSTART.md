# Magic Page + Botpress - Quick Start Guide

This guide will help you get Magic Page running with Botpress in **under 15 minutes**.

## Prerequisites

✅ **Required:**
- Docker Desktop installed and running
- Node.js v18+ and npm
- PostgreSQL database (can use existing or Docker)

## Step 1: Start Botpress (2 minutes)

```bash
cd magic-page

# Start Botpress with Docker Compose
docker-compose up -d

# Verify containers are running
docker ps
```

You should see 3 containers:
- `botpress` - Main bot server
- `botpress_postgres` - Database for Botpress
- `botpress_duckling` - NLU service

## Step 2: Create Your Bot (5 minutes)

1. **Open Botpress Admin:**
   - Navigate to: http://localhost:3001
   - Create admin account (first time only)

2. **Create New Bot:**
   - Click "Create Bot"
   - Name: `magic-page-lead-bot`
   - Template: Choose "Empty Bot"

3. **Get Your Bot ID:**
   - After creating, you'll see the Bot ID in the URL
   - Example: `http://localhost:3001/studio/YOUR-BOT-ID`
   - Copy this ID - you'll need it in Step 3

## Step 3: Configure Environment (2 minutes)

Edit `.env.local` file (already created in your directory):

```bash
# Update these values:
BOTPRESS_BOT_ID=paste-your-bot-id-here
DB_PASSWORD=your-postgres-password
NEXT_PUBLIC_PDL_API_KEY=your-pdl-key (optional)
SCREENSHOTAPI_TOKEN=your-token (optional)
```

**Required:** Only `BOTPRESS_BOT_ID` and `DB_PASSWORD`

## Step 4: Set Up Database (1 minute)

```bash
# Connect to your PostgreSQL database
psql -U postgres -d mp

# Run the update script
\i scripts/update_database_for_botpress.sql

# Exit
\q
```

If you don't have the `mp` database yet:
```bash
psql -U postgres
CREATE DATABASE mp;
\c mp
\i scripts/database_scheme.sql
\i scripts/update_database_for_botpress.sql
\q
```

## Step 5: Create Bot Flow (3 minutes)

### Option A: Use Botpress Studio (Recommended for beginners)

1. Open Bot Studio: http://localhost:3001/studio/YOUR-BOT-ID
2. Go to **Flows** → Create flow: `lead-capture`
3. Click **Start Node** → Add these nodes:

**Node 1: Welcome**
- Type: Standard
- On Enter: Text → "Hi! 👋 I'd love to learn about your business."
- Transition: → Node 2

**Node 2: Capture Name**
- Type: Standard
- On Enter: Text → "What's your name?"
- On Receive: `session.name = event.preview`
- Transition: → Node 3

**Node 3: Capture Email**
- Type: Standard
- On Enter: Text → "What's your email address?"
- On Receive: `session.email = event.preview`
- Transition: → Node 4

**Node 4: Capture Company**
- Type: Standard
- On Enter: Text → "What company do you represent?"
- On Receive: `session.company = event.preview`
- Transition: → Node 5

**Node 5: Capture Website**
- Type: Standard
- On Enter: Text → "What's your website URL?"
- On Receive: `session.website = event.preview`
- Transition: → Node 6

**Node 6: Thank You**
- Type: Standard
- On Enter: Text → "Thanks {{session.name}}! We'll reach out to {{session.email}} soon."
- On Enter: Execute code → `saveLeadToMagicPage` (see Step 6)

4. Click **Publish** (top right)

### Option B: Import Pre-built Flow (Advanced)

1. Copy `botpress-bot-config/flows/lead-capture.json`
2. In Botpress Studio, go to **Code Editor**
3. Navigate to `data/bots/YOUR-BOT-ID/flows/`
4. Create `lead-capture.flow.json` and paste content
5. Restart Botpress: `docker-compose restart botpress`

## Step 6: Add Lead Save Action (2 minutes)

1. In Botpress Studio, go to **Code Editor**
2. Navigate to `data/bots/YOUR-BOT-ID/actions/`
3. Create new file: `saveLeadToMagicPage.js`
4. Copy content from `botpress-bot-config/actions/saveLeadToMagicPage.js`
5. Save file

Or use this simple version:

```javascript
const axios = require('axios');

const saveLeadToMagicPage = async () => {
  try {
    await axios.post('http://localhost:3000/api/botpress/webhook', {
      type: 'custom',
      payload: {
        action: 'save_lead',
        data: {
          sessionID: session.magicPageSessionID,
          email: session.email,
          company: session.company,
          website: session.website,
          name: session.name
        }
      }
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
};

return saveLeadToMagicPage();
```

## Step 7: Start Magic Page (1 minute)

```bash
# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

Visit: http://localhost:3000

## Step 8: Test It! (1 minute)

1. Open http://localhost:3000
2. Fill out the form:
   - Email: test@example.com
   - Website: https://example.com
3. Click Submit
4. Wait for "Your AI Agent is ready!"
5. Click "Give it a try!"
6. Chat with your bot!

## Verify Everything Works

### Check Botpress
- Botpress admin: http://localhost:3001
- View conversations: Studio → Conversations
- See captured data in conversation variables

### Check Database
```sql
SELECT * FROM websitevisitors ORDER BY created_at DESC LIMIT 5;
```

### Check Logs
```bash
# Magic Page logs
npm run dev  # Watch the console

# Botpress logs
docker logs -f botpress
```

## Customization

### Change Bot Personality
1. Go to Botpress Studio → Flows
2. Edit text messages in nodes
3. Add images, cards, quick replies
4. Click Publish

### Style the Chat Widget
1. Studio → Config → Webchat
2. Customize:
   - Colors
   - Bot avatar
   - Chat bubble style
   - Header text

### Add More Questions
1. Create new nodes in flow
2. Capture to session variables
3. Access in `saveLeadToMagicPage` action

## Troubleshooting

### Enable Debug Logging

For detailed request/response logging, edit `configuration/debugConfig.js`:

```javascript
export const DEBUG_BOTPRESS_REQUESTS = true;  // Enable verbose logging
```

This logs all Botpress API calls in chronological order:
- **Server console**: KB uploads, JWT generation, session creation
- **Browser console**: Webchat init(), events, messages

Each log entry shows timestamp, sequence number, and full payload:
```
╔══════════════════════════════════════════════════════════════
║ [1] BOTPRESS REQUEST - KB-CREATE
║ Time: 2025-11-25T14:30:00.000Z
║ Action: Upload file to Botpress
╠══════════════════════════════════════════════════════════════
║ Payload: { ... }
╚══════════════════════════════════════════════════════════════
```

### "Botpress not configured" error
- Check `BOTPRESS_BOT_ID` in `.env.local`
- Restart dev server: `npm run dev`

### Chat widget not loading
- Verify Botpress is running: `docker ps`
- Check bot is published in Studio
- Open browser console (F12) for errors
- Enable debug logging to see exact init() payload

### Database connection failed
- Verify PostgreSQL is running
- Check `DB_PASSWORD` in `.env.local`
- Test connection: `psql -U postgres -d mp`

### userData not reaching bot workflow
- Enable debug logging to verify userData in init() call
- Check Botpress Studio logs for domain resolution
- See [BOTPRESS-INTEGRATION-ANALYSIS.md](./docs/BOTPRESS-INTEGRATION-ANALYSIS.md) for detailed troubleshooting

### Port conflicts
If ports 3000, 3001, or 5432 are in use:

**Change Botpress port (3001):**
Edit `docker-compose.yml`:
```yaml
ports:
  - "3002:3000"  # Change 3001 to 3002
```
Update `.env.local`:
```
BOTPRESS_SERVER_URL=http://localhost:3002
```

**Change Magic Page port (3000):**
```bash
PORT=3005 npm run dev
```

## Next Steps

- [ ] Deploy Botpress to production (see BOTPRESS_MIGRATION.md)
- [ ] Add more conversation flows
- [ ] Integrate with CRM (Salesforce, HubSpot)
- [ ] Add AI-powered responses with GPT
- [ ] Set up email notifications
- [ ] Add analytics tracking

## Resources

- [Botpress Documentation](https://botpress.com/docs)
- [Magic Page Migration Guide](./BOTPRESS_MIGRATION.md)
- [Botpress Community Discord](https://discord.gg/botpress)

## Support

Having issues? Check:
1. All containers running: `docker ps`
2. Environment variables set correctly
3. Database initialized
4. Bot published in Studio

Still stuck? Create an issue with:
- Error message
- Console logs
- Docker logs: `docker logs botpress`
