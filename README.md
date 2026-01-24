```
===============================================================================

    ███╗   ███╗ █████╗  ██████╗ ██╗ ██████╗    ██████╗  █████╗  ██████╗ ███████╗
    ████╗ ████║██╔══██╗██╔════╝ ██║██╔════╝    ██╔══██╗██╔══██╗██╔════╝ ██╔════╝
    ██╔████╔██║███████║██║  ███╗██║██║         ██████╔╝███████║██║  ███╗█████╗
    ██║╚██╔╝██║██╔══██║██║   ██║██║██║         ██╔═══╝ ██╔══██║██║   ██║██╔══╝
    ██║ ╚═╝ ██║██║  ██║╚██████╔╝██║╚██████╗    ██║     ██║  ██║╚██████╔╝███████╗
    ╚═╝     ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝ ╚═════╝    ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚══════╝

                    [ AI Chatbot Generation • Lead Capture ]

                         "Enter a URL. Get a chatbot."

                              Est. 2025 • v2.0

===============================================================================
```

## What This Does

Magic Page takes any website URL and creates a trained AI chatbot for it in under 60 seconds.

The system scrapes the website, extracts business information using GPT-4, uploads it to Botpress Cloud as a knowledge base, and presents a fully functional chatbot widget. Visitors can immediately start asking questions about the business.

**Live at:** https://mb.membies.com

## How It Works

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   SUBMIT    │───▶│   SCRAPE    │───▶│   TRAIN     │───▶│    CHAT     │
│  url+email  │    │  website    │    │  botpress   │    │   widget    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                  │                  │                  │
      ▼                  ▼                  ▼                  ▼
  Validate          Playwright         Upload KB          JWT Auth
  Dedupe            Cheerio            Index docs         Theme bot
  Screenshot        GPT-4 extract      Wait ready         Show chat
```

**Step 1: Submit** — User enters website URL and email. System checks for duplicates, captures screenshot, sends notification email.

**Step 2: Scrape** — Playwright renders JavaScript-heavy sites. Cheerio parses static HTML. GPT-4 extracts the useful bits: company name, services, contact info, FAQs.

**Step 3: Train** — Content uploads to Botpress Cloud as a knowledge base file. System polls until indexing completes. Bot theme generated from website colors.

**Step 4: Chat** — JWT token generated. Botpress webchat widget loads with custom theming. User can immediately ask questions about the business.

## The Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Framework | Next.js 14 (Pages Router) | API routes + React in one package |
| Database | PostgreSQL 14 | Stores visitors, sessions, bot configs |
| AI | OpenAI GPT-4o-mini | Content extraction, FAQ generation, theme analysis |
| Chatbot | Botpress Cloud | Enterprise chatbot platform with KB support |
| Scraping | Playwright + Cheerio | JS rendering + fast HTML parsing |
| Email | Resend | Transactional email (notifications, confirmations) |
| Screenshots | screenshotapi.net | Website thumbnail capture |
| Process | PM2 | Production process management |
| Proxy | Nginx | SSL termination, reverse proxy |

## Running Locally

```bash
# Clone and install
git clone https://github.com/stooky/magicker-page.git
cd magicker-page
npm install

# Start database
docker-compose -f docker-compose-db-only.yml up -d

# Configure environment
cp .env.local.sample .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev
```

Open http://localhost:3000

## Environment Variables

```env
# Required
OPENAI_API_KEY=sk-...                    # GPT-4 for content extraction
BOTPRESS_BOT_ID=...                      # Your Botpress bot ID
BOTPRESS_CLIENT_ID=...                   # Botpress workspace ID
BOTPRESS_API_TOKEN=bp_pat_...            # Botpress Personal Access Token
SCREENSHOTAPI_TOKEN=...                  # screenshotapi.net token
JWT_SECRET=...                           # 64-char hex string for auth tokens

# Database
DB_HOST=localhost
DB_PORT=5433
DB_USER=postgres
DB_PASSWORD=magicpage_password
DB=mp

# Email (Resend)
RESEND_API_KEY=re_...                    # From resend.com
EMAIL_FROM="Magic Page <noreply@yourdomain.com>"
NOTIFY_EMAIL=admin@yourdomain.com        # Where to send signup alerts

# Optional
SHARE_LINK_BASE_URL=https://mb.membies.com
```

## Production Deployment

The production server runs on Ubuntu with Nginx + PM2.

```bash
# SSH to server
ssh -i ~/.ssh/id_wiki root@mb.membies.com

# App location
cd /root/magicker-page

# Rebuild and restart
source /root/.nvm/nvm.sh
npm run build
pm2 restart magic-page

# View logs
pm2 logs magic-page --lines 100 --nostream
```

### Server Architecture

```
Internet → Nginx (SSL) → localhost:3000 → Next.js (PM2)
                                              ↓
                                         PostgreSQL :5433
```

Nginx handles SSL termination and proxies to the Next.js app. PM2 keeps the process alive and manages restarts.

## API Endpoints

### Core Flow
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/dbCheckDomain` | POST | Check if domain already processed |
| `/api/get-screenshot` | GET | Capture website thumbnail |
| `/api/scrape-website` | POST | Extract content with GPT-4 |
| `/api/dbInsertVisitor` | POST | Store visitor record |
| `/api/notify-signup` | POST | Send email notifications |

### Botpress Integration
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/botpress/kb-create` | POST | Upload content to knowledge base |
| `/api/botpress/kb-status` | GET | Poll indexing status |
| `/api/botpress/get-auth-token` | POST | Generate JWT for webchat |
| `/api/botpress/webhook` | POST | Receive Botpress events |

### Shareable Links
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/share/get-config` | GET | Load chatbot config by slug |
| `/api/share/trigger-email` | POST | Send shareable link email |
| `/[slug]` | GET | Dynamic chatbot page (e.g., `/gibbonheating-com`) |

## Database Schema

```sql
CREATE TABLE websitevisitors (
    sessionid VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255),
    website VARCHAR(255),
    companyname VARCHAR(255),
    mylistingurl TEXT,              -- JSON: Botpress config
    screenshoturl TEXT,             -- Path: /screenshots/[sessionID].png
    slug VARCHAR(100) UNIQUE,       -- URL slug for sharing
    bot_theme JSONB,                -- Chatbot theming config
    kb_file_id VARCHAR(100),        -- Botpress knowledge base file ID
    share_email_sent BOOLEAN DEFAULT FALSE,
    share_link_visits INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Project Structure

```
magicker-page/
├── pages/
│   ├── index.js              # Main application (form → scan → chat)
│   ├── [slug].js             # Shareable chatbot pages
│   └── api/
│       ├── botpress/         # Botpress Cloud integration
│       ├── share/            # Shareable link endpoints
│       ├── dbCheckDomain.js  # Domain deduplication
│       ├── dbInsertVisitor.js
│       ├── dbUpdateVisitor.js
│       ├── get-screenshot.js
│       ├── scrape-website.js
│       ├── notify-signup.js  # Email notifications
│       └── analyze-thumbnail.js  # AI theme extraction
├── components/
│   ├── FormComponent.js      # Email + URL input form
│   ├── LoadingComponent.js   # AI orb animation
│   ├── ScanningComponent.js  # Progress + snippets display
│   └── Valhallah.js          # Final chatbot screen
├── lib/
│   └── scrapers/             # Multi-strategy web scraping
├── configuration/
│   ├── masterConfig.js       # App-wide settings
│   └── screenStates.js       # UI state machine
├── docs/
│   └── captains_log/         # Development logs
└── public/
    └── screenshots/          # Captured website thumbnails
```

## Key Decisions

**Why Pages Router over App Router?** — Started before App Router was stable. Works fine. Migration would be effort with no user-facing benefit.

**Why Botpress Cloud over self-hosted?** — Managed infrastructure, built-in NLU, knowledge base indexing. Trade-off: vendor lock-in. Worth it for time savings.

**Why Resend over SendGrid/SES?** — Simple API, easy domain verification, good free tier. 3,000 emails/month free is plenty for this use case.

**Why Screenshot API over Puppeteer screenshots?** — Consistent results, no browser maintenance, handles edge cases. $29/month for 10K screenshots.

**Why store screenshots as files not base64?** — Base64 in database bloated records. Files on disk are simpler, faster, and work with CDNs.

## Troubleshooting

**App hangs at scanning stage**
- Check PM2 is running production build, not dev mode
- Run `npm run build` then `pm2 restart magic-page`

**Emails not sending**
- Verify domain in Resend dashboard
- Check RESEND_API_KEY and EMAIL_FROM in .env.local
- View logs: `pm2 logs magic-page | grep EMAIL`

**Chatbot not loading**
- Check JWT_SECRET matches between server and .env.local
- Verify BOTPRESS_BOT_ID and BOTPRESS_CLIENT_ID
- Check browser console for CORS errors

**Database connection refused**
- Ensure PostgreSQL container is running: `docker ps`
- Verify DB_PORT matches container mapping (5433, not 5432)

## Monitoring

```bash
# PM2 status
pm2 status

# Real-time logs
pm2 logs magic-page

# Database check
docker exec -it botpress_postgres psql -U postgres -d mp -c "SELECT COUNT(*) FROM websitevisitors;"

# Recent signups
docker exec -it botpress_postgres psql -U postgres -d mp -c "SELECT email, website, created_at FROM websitevisitors ORDER BY created_at DESC LIMIT 10;"
```

## Development Notes

Captain's logs are kept in `docs/captains_log/` for context across sessions. Run `/captainslog list` to see history.

The app uses a state machine for UI transitions: `FORM → LOADING → SCANNING → CHAT_TEASE → CHAT`. States defined in `configuration/screenStates.js`.

Botpress webchat theming is dynamic — `analyze-thumbnail.js` uses GPT-4 Vision to extract colors from the website screenshot and generate a matching bot avatar.

---

```
===============================================================================

                    Built by Member Solutions • 2025

          "Because every website deserves an AI that knows its stuff"

===============================================================================
```
