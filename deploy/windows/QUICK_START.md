# Windows Quick Start Checklist

**Print this or keep it open while setting up Magic Page on Windows**

---

## Prerequisites (Install First)

### ☐ Docker Desktop
- Download: https://www.docker.com/products/docker-desktop
- Install and **start Docker Desktop**
- Restart computer after installation

### ☐ Node.js (LTS)
- Download: https://nodejs.org/
- Version: 18.x or 20.x
- Restart PowerShell after installation

### ☐ Git for Windows
- Download: https://git-scm.com/download/win
- Use default settings during installation

**Verify installations:**
```powershell
docker --version
node --version
npm --version
git --version
```

---

## Setup Steps (30-45 min)

### 1. Clone Repository ⏱️ 3 min

```powershell
# Open PowerShell as Administrator
cd C:\
mkdir dev
cd dev
git clone https://github.com/stooky/magicker-page.git magic-page
cd magic-page
```

☐ Repository cloned to C:\dev\magic-page

---

### 2. Run Setup Script ⏱️ 10-15 min

```powershell
.\setup-windows.ps1
```

**This installs:**
- Node dependencies
- Playwright browsers
- Docker services (PostgreSQL, Botpress)
- Creates database

☐ Setup script completed successfully
☐ All Docker containers running

---

### 3. Configure Environment ⏱️ 5 min

```powershell
# Copy template
copy .env.local.sample .env.local

# Edit file
notepad .env.local
```

**Minimum required:**
```env
DOMAIN=localhost
NEXT_PUBLIC_DOMAIN=localhost

SSL_KEY_PATH="./ssl/localhost-key.pem"
SSL_CERT_PATH="./ssl/localhost-cert.pem"

DB_USER=postgres
DB_HOST=localhost
DB_PASSWORD=botpress_password
DB=mp
DB_PORT=5433

BOTPRESS_BOT_ID=your-bot-id
BOTPRESS_CLIENT_ID=your-workspace-id
BOTPRESS_API_TOKEN=bp_pat_your-token
NEXT_PUBLIC_BOTPRESS_BOT_ID=your-bot-id
NEXT_PUBLIC_BOTPRESS_CLIENT_ID=your-workspace-id

SCREENSHOTAPI_TOKEN=your-token
OPENAI_API_KEY=sk-your-key
```

**Generate secrets:**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})
# Use for JWT_SECRET and BOTPRESS_WEBHOOK_SECRET
```

☐ .env.local created and configured

---

### 4. Create SSL Certificate ⏱️ 2 min

```powershell
mkdir ssl

# With OpenSSL (if installed):
openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
  -keyout ssl/localhost-key.pem `
  -out ssl/localhost-cert.pem `
  -subj "/CN=localhost"

# OR use PowerShell:
$cert = New-SelfSignedCertificate -DnsName "localhost" -CertStoreLocation "cert:\LocalMachine\My" -NotAfter (Get-Date).AddYears(1)
```

☐ SSL certificate created

---

### 5. Build Application ⏱️ 5 min

```powershell
npm run build
```

**Look for:** `✓ Compiled successfully`

☐ Build completed without errors

---

### 6. Start Server ⏱️ 1 min

**Development mode (recommended):**
```powershell
.\start-dev.ps1
```

**OR Production mode:**
```powershell
npm start
```

☐ Server started successfully

---

## Access & Test

### ☐ Open Browser
- Dev mode: http://localhost:3000
- Production: https://localhost

### ☐ Test Form
1. Enter website URL
2. Wait for screenshot
3. Verify chat appears

### ☐ Test Database
```powershell
docker exec -it botpress_postgres psql -U postgres -d mp -c "SELECT COUNT(*) FROM visitors;"
```

---

## Quick Commands

**View status:**
```powershell
docker-compose ps          # Docker services
Get-Process node           # Next.js process
```

**View logs:**
```powershell
.\view-logs.ps1                    # Application logs
docker-compose logs -f              # Docker logs
```

**Restart:**
```powershell
.\kill-dev-servers.ps1     # Stop all
.\start-dev.ps1            # Start again
```

**Stop everything:**
```powershell
# Stop Node.js
.\kill-dev-servers.ps1

# Stop Docker
docker-compose down
```

---

## Troubleshooting Quick Fixes

### Docker not starting
```powershell
# Restart Docker Desktop from system tray
# Wait for "Docker Desktop is running"
```

### Port 3000 in use
```powershell
.\kill-dev-servers.ps1
# OR manually:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Build fails
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force .next
npm install
npm run build
```

### Database connection failed
```powershell
docker-compose restart postgres
Start-Sleep -Seconds 5
docker exec -it botpress_postgres psql -U postgres -d mp -c "SELECT 1;"
```

---

## Success Criteria ✅

Your setup is successful when:
- ☑ Docker Desktop running (check system tray)
- ☑ All Docker containers "Up" (docker-compose ps)
- ☑ No errors in .\start-dev.ps1 output
- ☑ Can access http://localhost:3000
- ☑ Form submission records to database
- ☑ Chat widget loads and responds

---

## Daily Use

**Start working:**
```powershell
cd C:\dev\magic-page
docker-compose up -d      # Start Docker
.\start-dev.ps1           # Start app
```

**Stop working:**
```powershell
# Press Ctrl+C to stop dev server
docker-compose down       # Stop Docker
```

---

## API Keys Needed

Before you start, get these:

**Botpress Cloud** (https://studio.botpress.cloud)
- Bot ID: `bot_...`
- Workspace ID: `ws_...`
- API Token: `bp_pat_...`

**ScreenshotAPI** (https://screenshotapi.net)
- API Token

**OpenAI** (https://platform.openai.com)
- API Key: `sk-...`

**PeopleDataLabs** (https://peopledatalabs.com) - Optional
- API Key

---

## For Production Deployment

Windows is great for development, but for production:

**Recommended:** Deploy to Ubuntu server
- See: `../ubuntu/README.md`
- Fully automated setup
- PM2 process management
- Auto SSL with Let's Encrypt
- Built-in monitoring and backups
- Cost: $12-24/month on Vultr

**Workflow:**
1. Develop on Windows (this guide)
2. Test locally
3. Deploy to Ubuntu for production

---

## Need Help?

**Full guide:** `README.md` (in this directory)

**Common issues:**
- Docker → Restart Docker Desktop
- Ports → Use .\kill-dev-servers.ps1
- Build → Clear caches and rebuild
- API errors → Check .env.local values

**Support:**
- Issues: https://github.com/stooky/magicker-page/issues
- Environment guide: `../ENVIRONMENT_SETUP.md`

---

**Setup Date:** ______________
**Started:** ______:______
**Completed:** ______:______
**Total Time:** ______ minutes

**Notes:**
_________________________________
_________________________________
_________________________________
