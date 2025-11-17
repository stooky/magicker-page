# Magic Page - AI Chatbot Lead Capture

Transform any website into an intelligent AI-powered lead capture system in seconds. Built with Next.js and Botpress Cloud.

## 🚀 Overview

Magic Page is a revolutionary lead generation tool that automatically creates AI chatbots for websites. Simply enter a website URL and email address, and watch as the system:

1. **Scrapes** the website content intelligently
2. **Extracts** key information using OpenAI GPT-4
3. **Creates** a Botpress Cloud chatbot trained on the website
4. **Captures** leads through conversational AI

Powered by **Member Solutions** | Copyright © 2025

## ✨ Features

### Core Functionality
- **One-Click Bot Creation**: Generate AI chatbots from any website URL
- **Intelligent Scraping**: Multi-strategy web scraping with Playwright, Cheerio, and custom parsers
- **AI-Powered Extraction**: OpenAI GPT-4 intelligently extracts relevant snippets from web content
- **Lead Capture**: Automated lead collection with PostgreSQL storage
- **Domain Deduplication**: Prevents duplicate bot creation for the same domain
- **Beautiful UI**: Member Solutions branded interface with animated AI orb

### Technical Features
- **Botpress Cloud Integration**: Enterprise-grade chatbot platform
- **PostgreSQL Database**: Reliable data persistence with Docker support
- **Next.js 14**: Modern React framework with API routes
- **Graceful Degradation**: Continues working even if database is unavailable
- **Screenshot Capture**: Automatic website screenshots for visual context
- **Real-time Progress**: Live updates during bot creation process

## 🛠️ Technology Stack

- **Frontend**: Next.js 14.2.3, React 18
- **Backend**: Next.js API Routes, Node.js
- **Database**: PostgreSQL 14 (Docker)
- **AI/ML**: OpenAI GPT-4, Botpress Cloud
- **Scraping**: Playwright, Cheerio, Axios
- **Styling**: CSS3 with custom animations
- **DevOps**: Docker Compose, PowerShell automation

## 📋 Prerequisites

- Node.js 16+ and npm
- Docker Desktop (for PostgreSQL)
- OpenAI API Key
- Botpress Cloud Account
- Screenshot API Token (screenshotapi.net)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/stooky/magicker-page.git
cd magicker-page
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the sample environment file and configure it:

```bash
cp .env.local.sample .env.local
```

Edit `.env.local` with your credentials:

```env
# Domain Settings
DOMAIN=localhost
NEXT_PUBLIC_DOMAIN=localhost:3000

# Botpress Configuration
BOTPRESS_SERVER_URL=https://chat.botpress.cloud
BOTPRESS_BOT_ID=your-bot-id-here
BOTPRESS_CLIENT_ID=your-client-id-here
BOTPRESS_WEBHOOK_SECRET=your-webhook-secret

# PostgreSQL
DB_USER=postgres
DB_HOST=localhost
DB_PASSWORD=magicpage_password
DB=mp
DB_PORT=5433

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini
USE_OPENAI_EXTRACTION=true

# Screenshot API
SCREENSHOTAPI_TOKEN=your-screenshotapi-token
```

### 4. Start the Database

```bash
docker-compose up -d postgres
```

Or use the database-only configuration:

```bash
docker-compose -f docker-compose-db-only.yml up -d
```

### 5. Initialize the Database

```bash
# Connect to PostgreSQL and create the database
docker exec -it botpress_postgres psql -U postgres -c "CREATE DATABASE mp;"

# Run the schema updates
docker exec -i botpress_postgres psql -U postgres -d mp < scripts/update_database_for_botpress.sql
```

### 6. Start the Development Server

#### Option A: Using PowerShell (Windows - Recommended)
```powershell
.\start-dev.ps1
```

#### Option B: Using npm directly
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 📖 Documentation

Comprehensive documentation is available in the following guides:

- **[QUICKSTART.md](./QUICKSTART.md)** - Get up and running in 5 minutes
- **[DATABASE_SETUP.md](./DATABASE_SETUP.md)** - Detailed database configuration
- **[SCRAPER_SETUP.md](./SCRAPER_SETUP.md)** - Web scraping system setup
- **[BOTPRESS_MIGRATION.md](./BOTPRESS_MIGRATION.md)** - Migration from Vendasta to Botpress
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - QA workflows and testing procedures
- **[IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md)** - Deployment checklist
- **[README-BOTPRESS.md](./README-BOTPRESS.md)** - Botpress integration details

## 🏗️ Architecture

### Frontend Flow
1. User enters email and website URL
2. Loading screen with AI orb animation
3. Scanning screen showing website thumbnail and extracted snippets
4. Final screen with chatbot widget ready for interaction

### Backend Flow
1. **Domain Check** (`/api/dbCheckDomain`) - Prevent duplicates
2. **Screenshot Capture** (`/api/get-screenshot`) - Visual representation
3. **Web Scraping** (`/api/scrape-website`) - Content extraction
4. **Database Insert** (`/api/dbInsertVisitor`) - Store visitor data
5. **Botpress Session** (`/api/botpress/create-session`) - Create chatbot
6. **Database Update** (`/api/dbUpdateVisitor`) - Store bot config

### Database Schema

```sql
CREATE TABLE websitevisitors (
    sessionid VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255),
    website VARCHAR(255),
    companyname VARCHAR(255),
    mylistingurl TEXT,  -- JSON: Botpress configuration
    screenshoturl TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🎨 Branding

The application features Member Solutions branding with the following color scheme:

- **Primary Orange**: `#E76F00`
- **Dark Blue**: `#00234C`
- **Gold**: `#F8A433`
- **Light Orange**: `#FFBB7B`

## 🔧 Development

### Project Structure

```
magicker-page/
├── components/           # React components
│   ├── FormComponent.js       # Initial form
│   ├── LoadingComponent.js    # Loading animation
│   ├── ScanningComponent.js   # Scanning progress
│   ├── Valhallah.js          # Final chatbot screen
│   └── utils/
│       └── database.js        # Database connection
├── pages/
│   ├── index.js              # Main application
│   └── api/                  # API routes
│       ├── botpress/         # Botpress endpoints
│       ├── dbCheckDomain.js
│       ├── dbInsertVisitor.js
│       ├── dbUpdateVisitor.js
│       ├── get-screenshot.js
│       └── scrape-website.js
├── lib/
│   └── scrapers/            # Web scraping modules
├── scripts/                 # Database and utility scripts
├── botpress-bot-config/    # Botpress configuration
├── docker-compose.yml      # Docker services
└── .env.local             # Environment configuration
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# PowerShell scripts (Windows)
.\start-dev.ps1      # Start dev server with logging
.\kill-dev-servers.ps1  # Stop all dev servers
.\view-logs.ps1      # View application logs
```

### Database Export

Export all database tables to CSV:

```bash
node scripts/export-db.js
```

Files will be saved to `db_dump/` directory.

## 🐳 Docker Services

### PostgreSQL Database
- **Container**: `botpress_postgres`
- **Port**: 5433 (mapped from 5432)
- **Database**: `mp`
- **User**: `postgres`
- **Password**: Set in `.env.local`

### Starting Services

```bash
# Start all services
docker-compose up -d

# Start only database
docker-compose up -d postgres

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## 🔐 Security Notes

- Never commit `.env.local` - it contains sensitive credentials
- Database dumps (`db_dump/`) are excluded from version control
- Use environment variables for all secrets
- Personal Access Tokens should have minimal required scopes
- Rotate API keys regularly

## 🐛 Troubleshooting

### Database Connection Errors

**Error**: `ECONNREFUSED ::1:5433`

**Solution**: Ensure PostgreSQL is running and port is correctly set:
```bash
docker-compose up -d postgres
# Verify port in .env.local is 5433
```

### Authentication Errors

**Error**: `password authentication failed`

**Solution**: Check password in `.env.local` matches Docker configuration
```bash
# Default password is: magicpage_password
```

### Scraping Failures

**Error**: `Failed to scrape website`

**Solution**:
1. Check OpenAI API key is valid
2. Verify website is accessible
3. Check Playwright installation: `npx playwright install`

## 📊 Database Management

### View Database Tables
```bash
docker exec -it botpress_postgres psql -U postgres -d mp -c "\dt"
```

### View Visitor Records
```bash
docker exec -it botpress_postgres psql -U postgres -d mp -c "SELECT * FROM websitevisitors;"
```

### Backup Database
```bash
docker exec botpress_postgres pg_dump -U postgres mp > backup.sql
```

### Restore Database
```bash
docker exec -i botpress_postgres psql -U postgres mp < backup.sql
```

## 🚀 Deployment

See [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) for detailed deployment steps.

### Production Checklist

- [ ] Set production environment variables
- [ ] Configure SSL certificates
- [ ] Set up production database
- [ ] Configure Botpress Cloud production bot
- [ ] Set up domain and DNS
- [ ] Configure error monitoring
- [ ] Set up automated backups
- [ ] Test lead capture flow end-to-end

## 📝 API Endpoints

### Public Endpoints

- `GET /` - Main application
- `POST /api/dbCheckDomain` - Check if domain already processed
- `POST /api/dbInsertVisitor` - Create new visitor record
- `POST /api/dbUpdateVisitor` - Update visitor with bot config
- `GET /api/get-screenshot` - Capture website screenshot
- `POST /api/scrape-website` - Extract website content

### Botpress Endpoints

- `POST /api/botpress/create-session` - Create Botpress session
- `GET /api/botpress/get-config` - Retrieve bot configuration
- `POST /api/botpress/webhook` - Botpress webhook handler

## 🤝 Contributing

This is a private project for Member Solutions. For questions or issues, contact the development team.

## 📄 License

Copyright © 2025 Member Solutions. All rights reserved.

## 🙏 Acknowledgments

- **Botpress Cloud** - AI chatbot platform
- **OpenAI** - GPT-4 for intelligent content extraction
- **Playwright** - Web scraping and browser automation
- **PostgreSQL** - Reliable database system
- **Next.js** - React framework

## 📞 Support

For technical support or questions:
- Review the documentation in this repository
- Check the troubleshooting section above
- Contact the Member Solutions development team

---

**Built with ❤️ by Member Solutions**

*Transforming websites into intelligent lead generation machines*
