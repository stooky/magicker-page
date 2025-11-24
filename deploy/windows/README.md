# Windows Self-Hosted Deployment Guide

Complete guide for running Magic Page on Windows 10/11 or Windows Server.

---

## 📋 Overview

This guide helps you run Magic Page on your Windows machine for:
- **Development:** Test features before production deployment
- **Local hosting:** Run on your own hardware
- **Internal use:** Company intranet or private network
- **Learning:** Understand the application before cloud deployment

**Estimated setup time:** 30-45 minutes

---

## ✅ Prerequisites

### System Requirements

**Minimum:**
- Windows 10 (64-bit) or Windows Server 2019+
- 8GB RAM
- 20GB free disk space
- Internet connection

**Recommended:**
- Windows 11 Pro or Windows Server 2022
- 16GB RAM
- 50GB SSD
- Stable internet connection

### Required Software

1. **Docker Desktop**
   - Download: https://www.docker.com/products/docker-desktop
   - Version: 4.0+ with WSL2 backend
   - **Must be running** before setup

2. **Node.js**
   - Download: https://nodejs.org/ (LTS version)
   - Version: 18.x or 20.x
   - Includes npm package manager

3. **Git for Windows**
   - Download: https://git-scm.com/download/win
   - For cloning repository

4. **PowerShell 5.1+** (included with Windows 10/11)

### Optional but Recommended

- **Windows Terminal:** https://aka.ms/terminal (better than cmd.exe)
- **Visual Studio Code:** https://code.visualstudio.com/ (for editing files)

---

## 🚀 Installation Steps

### Step 1: Install Prerequisites

#### 1.1 Install Docker Desktop

```powershell
# Download and install Docker Desktop
# https://www.docker.com/products/docker-desktop

# After installation:
# 1. Restart your computer
# 2. Start Docker Desktop
# 3. Wait for "Docker Desktop is running" notification
```

**Verify Docker:**
```powershell
docker --version
docker ps
# Should show empty list (no errors)
```

#### 1.2 Install Node.js

```powershell
# Download Node.js LTS from https://nodejs.org/
# Run installer (use default settings)
# Restart PowerShell after installation

# Verify:
node --version   # Should show v18.x or v20.x
npm --version    # Should show v9.x or v10.x
```

#### 1.3 Install Git

```powershell
# Download from https://git-scm.com/download/win
# Run installer (use default settings)

# Verify:
git --version
```

---

### Step 2: Clone Repository

```powershell
# Open PowerShell as Administrator
# (Right-click PowerShell → Run as Administrator)

# Navigate to where you want to install
cd C:\
mkdir dev
cd dev

# Clone repository
git clone https://github.com/stooky/magicker-page.git magic-page
cd magic-page

# Verify files
dir
# Should see: package.json, docker-compose.yml, etc.
```

---

### Step 3: Run Windows Setup Script

```powershell
# Still in PowerShell as Administrator
# Make sure you're in the magic-page directory

.\setup-windows.ps1
```

**What this script does:**
- ✅ Checks Docker Desktop is running
- ✅ Checks Node.js is installed
- ✅ Checks for .env.local file
- ✅ Installs Node.js dependencies (`npm install`)
- ✅ Installs Playwright browsers
- ✅ Starts Docker services (PostgreSQL, Botpress, Duckling)
- ✅ Creates database

**Expected duration:** 10-15 minutes (downloads dependencies)

---

### Step 4: Configure Environment Variables

```powershell
# Copy sample environment file
copy .env.local.sample .env.local

# Edit with Notepad or VS Code
notepad .env.local
# Or: code .env.local
```

**Critical variables to configure:**

```env
# Domain (use localhost for local development)
DOMAIN=localhost
NEXT_PUBLIC_DOMAIN=localhost

# SSL Certificate Paths (self-signed for Windows)
SSL_KEY_PATH="./ssl/localhost-key.pem"
SSL_CERT_PATH="./ssl/localhost-cert.pem"

# Database (match docker-compose.yml)
DB_USER=postgres
DB_HOST=localhost
DB_PASSWORD=botpress_password  # Change in production!
DB=mp
DB_PORT=5433

# Botpress Cloud
BOTPRESS_SERVER_URL=https://chat.botpress.cloud
BOTPRESS_BOT_ID=your-bot-id
BOTPRESS_CLIENT_ID=your-workspace-id
BOTPRESS_API_TOKEN=bp_pat_your-token
JWT_SECRET=<generate-random-string>
BOTPRESS_WEBHOOK_SECRET=<generate-random-string>

# Public Botpress (must match above)
NEXT_PUBLIC_BOTPRESS_BOT_ID=your-bot-id
NEXT_PUBLIC_BOTPRESS_CLIENT_ID=your-workspace-id

# API Keys
SCREENSHOTAPI_TOKEN=your-token
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-4o-mini
USE_OPENAI_EXTRACTION=true
NEXT_PUBLIC_PDL_API_KEY=your-pdl-key

# Settings
SNIPPET_SHOW=5
BYPASS_MODE=OFF  # Set to ON for testing without real data
ENV=dev          # Development environment
```

**Generate random secrets (PowerShell):**
```powershell
# For JWT_SECRET and BOTPRESS_WEBHOOK_SECRET
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})
```

**Save and close** the file.

---

### Step 5: Create Self-Signed SSL Certificate

For local development, create a self-signed certificate:

```powershell
# Create SSL directory
mkdir ssl

# Generate self-signed certificate (requires OpenSSL)
# If you don't have OpenSSL, see alternative method below

# With OpenSSL:
openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
  -keyout ssl/localhost-key.pem `
  -out ssl/localhost-cert.pem `
  -subj "/CN=localhost"
```

**Alternative: Use PowerShell to generate certificate**
```powershell
# Create self-signed certificate using PowerShell
$cert = New-SelfSignedCertificate `
    -DnsName "localhost" `
    -CertStoreLocation "cert:\LocalMachine\My" `
    -NotAfter (Get-Date).AddYears(1)

# Export certificate
$pwd = ConvertTo-SecureString -String "temp123" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath ".\ssl\localhost.pfx" -Password $pwd

# Convert to PEM format (requires OpenSSL or use pfx directly in code)
# For development, browser will show security warning (this is normal)
```

**Note:** Browser will show "Not Secure" warning - this is expected for self-signed certificates in development.

---

### Step 6: Build the Application

```powershell
# Build Next.js production bundle
npm run build
```

**Expected output:**
- Duration: 2-5 minutes
- Should end with: `✓ Compiled successfully`
- Creates `.next/` directory

---

### Step 7: Start Development Server

**Option A: Using the start script (recommended for development)**

```powershell
.\start-dev.ps1
```

**What this does:**
- Cleans up any old Node processes
- Starts Docker services (if not running)
- Starts Next.js dev server on port 3000
- Opens log file for monitoring

**Access at:** `http://localhost:3000`

**Option B: Using production server**

```powershell
# Start production server (HTTPS on port 443)
npm start
```

**Access at:** `https://localhost` (port 443)

**Note:** Requires administrator privileges for port 443.

---

## 🔧 Configuration

### Port Configuration

**Default ports:**
- `3000` - Next.js dev server (HTTP)
- `443` - Production server (HTTPS, requires admin)
- `3001` - Botpress UI
- `5433` - PostgreSQL
- `8000` - Duckling NLU

**To use different ports:**

Edit `server.js` for production:
```javascript
// Change port 443 to something else (e.g., 3443)
.listen(3443, err => {
```

Or use dev server which uses port 3000 (no admin needed).

### Firewall Configuration

**For external access:**

1. **Windows Firewall:**
   ```powershell
   # Allow port 3000 (dev) or 443 (production)
   New-NetFirewallRule -DisplayName "Magic Page" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
   ```

2. **Router Port Forwarding:**
   - Log into your router
   - Forward external port 80/443 to internal port 3000/443
   - Point to your Windows PC's local IP

### Public Access Setup

**To make your Windows server accessible from internet:**

1. **Get your public IP:**
   ```powershell
   Invoke-RestMethod -Uri "https://api.ipify.org"
   ```

2. **Configure Dynamic DNS** (if IP changes):
   - Use services like No-IP, DuckDNS, or DynDNS
   - Update .env.local with your DDNS domain

3. **Router Configuration:**
   - Port forward 80 → 3000 (HTTP)
   - Port forward 443 → 443 (HTTPS)

4. **Firewall Rules:**
   - Allow inbound traffic on forwarded ports

---

## 📊 Managing Services

### Docker Services

**View status:**
```powershell
docker-compose ps
```

**Start services:**
```powershell
docker-compose up -d
```

**Stop services:**
```powershell
docker-compose down
```

**View logs:**
```powershell
docker-compose logs -f
docker-compose logs postgres
docker-compose logs botpress
```

**Restart a specific service:**
```powershell
docker-compose restart postgres
```

### Next.js Application

**Development mode:**
```powershell
.\start-dev.ps1           # Automated startup
# Or manually:
npm run dev               # Starts on port 3000
```

**Production mode:**
```powershell
npm run build             # Build first
npm start                 # Start production server
```

**Kill all Node processes:**
```powershell
.\kill-dev-servers.ps1
```

**View logs:**
```powershell
.\view-logs.ps1
# Or manually:
Get-Content logs\dev-server_*.log -Tail 50 -Wait
```

---

## 🧪 Testing & Verification

### Quick Health Check

```powershell
# Check Docker services
docker-compose ps

# Check if Next.js is running
Get-Process node

# Test database connection
docker exec -it botpress_postgres psql -U postgres -d mp -c "SELECT 1;"

# Test web access
Start-Process "http://localhost:3000"
```

### Full Test Procedure

1. **Verify all services running:**
   ```powershell
   docker-compose ps
   # All should show "Up"
   ```

2. **Open application:**
   - Dev: http://localhost:3000
   - Production: https://localhost

3. **Test form submission:**
   - Enter a website URL (e.g., https://google.com)
   - Wait for screenshot
   - Verify chat widget appears

4. **Test database:**
   ```powershell
   docker exec -it botpress_postgres psql -U postgres -d mp -c "SELECT * FROM visitors;"
   # Should show your test submission
   ```

5. **Test Botpress chat:**
   - Send a message in chat widget
   - Verify bot responds
   - Check Botpress Studio logs

---

## 🔄 Daily Operations

### Starting the Application

```powershell
# Open PowerShell in project directory
cd C:\dev\magic-page

# Start Docker services
docker-compose up -d

# Start Next.js (choose one):
.\start-dev.ps1          # Development mode
# OR
npm start                # Production mode
```

### Stopping the Application

```powershell
# Stop Next.js
# Press Ctrl+C in the terminal running the app
# OR
.\kill-dev-servers.ps1

# Stop Docker services
docker-compose down
```

### Updating the Application

```powershell
# Pull latest changes
git pull origin master

# Install any new dependencies
npm install

# Rebuild application
npm run build

# Restart Docker services
docker-compose down
docker-compose up -d

# Restart Next.js
.\start-dev.ps1  # or npm start
```

---

## 💾 Backup & Maintenance

### Database Backups

**Manual backup:**
```powershell
# Create backups directory
mkdir backups

# Backup database
docker exec botpress_postgres pg_dump -U postgres mp > backups\backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql
```

**Restore backup:**
```powershell
# Restore from backup file
Get-Content backups\backup_20251124_120000.sql | docker exec -i botpress_postgres psql -U postgres mp
```

**Scheduled backups (Task Scheduler):**

1. Create PowerShell backup script (`backup-db.ps1`):
   ```powershell
   $date = Get-Date -Format "yyyyMMdd_HHmmss"
   docker exec botpress_postgres pg_dump -U postgres mp > "C:\dev\magic-page\backups\backup_$date.sql"
   ```

2. Open Task Scheduler → Create Basic Task
3. Set trigger (e.g., daily at 2 AM)
4. Action: Run PowerShell script
5. Program: `powershell.exe`
6. Arguments: `-File C:\dev\magic-page\backup-db.ps1`

### Log Rotation

```powershell
# Clean old logs (older than 7 days)
Get-ChildItem logs\*.log | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-7)} | Remove-Item
```

### Disk Space Management

```powershell
# Check Docker disk usage
docker system df

# Clean up unused Docker resources
docker system prune -a
```

---

## 🐛 Troubleshooting

### Issue: Docker Desktop not starting

**Solutions:**
1. Check if Hyper-V is enabled (Windows Features)
2. Enable WSL2: `wsl --install`
3. Restart computer
4. Reinstall Docker Desktop

### Issue: Port 3000 already in use

```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID)
taskkill /PID <PID> /F

# Or use the cleanup script
.\kill-dev-servers.ps1
```

### Issue: Port 443 requires administrator

**Solution 1:** Use dev server (port 3000)
```powershell
npm run dev
# Access at http://localhost:3000
```

**Solution 2:** Run PowerShell as Administrator
```powershell
# Right-click PowerShell → Run as Administrator
npm start
```

### Issue: SSL certificate errors

**For development:**
- Self-signed certificates will show browser warnings
- Click "Advanced" → "Proceed anyway"
- This is normal for local development

**For production-like testing:**
- Use port 3000 (HTTP) instead
- Or get a real certificate from Let's Encrypt (complex on Windows)

### Issue: Database connection refused

```powershell
# Check if PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres

# Verify port 5433 is available
netstat -ano | findstr :5433
```

### Issue: Botpress not responding

```powershell
# Check Botpress logs
docker-compose logs botpress

# Restart Botpress
docker-compose restart botpress

# Verify API credentials in .env.local
```

### Issue: npm install fails

```powershell
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
Remove-Item -Recurse -Force node_modules
npm install
```

### Issue: Build fails

```powershell
# Check Node.js version
node --version  # Should be v18+ or v20+

# Clear Next.js cache
Remove-Item -Recurse -Force .next

# Rebuild
npm run build
```

---

## 🔒 Security Considerations

### For Development

- ✅ Use self-signed certificates (browser warnings OK)
- ✅ Keep .env.local out of version control
- ✅ Use localhost (no external access)
- ✅ Use BYPASS_MODE=ON for testing

### For Production-Like Hosting

- ⚠️ **Not recommended for public production** (use Ubuntu server instead)
- If you must:
  - Get real SSL certificate
  - Use strong database passwords
  - Configure Windows Firewall properly
  - Keep Windows updated
  - Use dynamic DNS for changing IPs
  - Configure router firewall
  - Consider using Cloudflare for DDoS protection

---

## 📈 Performance Optimization

### Resource Allocation

**Docker Desktop settings:**
1. Open Docker Desktop → Settings → Resources
2. Allocate:
   - CPUs: 2-4
   - Memory: 4-8GB
   - Disk: 50GB+

### Next.js Optimization

**For better dev performance:**
```powershell
# Use turbo mode (faster rebuilds)
npm run dev -- --turbo
```

**For production:**
- Build with optimizations (already default)
- Use production mode (`npm start`)

---

## 🆚 Windows vs Ubuntu Comparison

| Feature | Windows | Ubuntu Server |
|---------|---------|---------------|
| Setup complexity | Medium | Easy (automated) |
| SSL setup | Manual/Self-signed | Auto (Let's Encrypt) |
| Public access | Port forwarding | Native |
| Process management | Manual/Task Scheduler | PM2 (automatic) |
| Backups | Manual scripts | Automated |
| Monitoring | Manual | Health checks |
| Cost | Free (own HW) | $12-24/month |
| Production ready | ⚠️ Not ideal | ✅ Yes |

**Recommendation:** Use Windows for development, deploy to Ubuntu for production.

---

## 📚 Additional Resources

- **Environment Variables:** `../ENVIRONMENT_SETUP.md`
- **Docker Configuration:** `../../docker-compose.yml`
- **Botpress Setup:** `../../BOTPRESS_MIGRATION.md`
- **Database Setup:** `../../DATABASE_SETUP.md`
- **Ubuntu Deployment:** `../ubuntu/README.md` (for production)

---

## 🆘 Getting Help

**Common issues:**
- Docker not starting → Restart Docker Desktop
- Port conflicts → Use .\kill-dev-servers.ps1
- Database errors → Check docker-compose logs
- Build errors → Check Node.js version

**For support:**
- GitHub Issues: https://github.com/stooky/magicker-page/issues
- Check all environment variables are set
- Verify all API keys are valid

---

## ✅ Success Checklist

- [ ] Docker Desktop installed and running
- [ ] Node.js installed (v18+ or v20+)
- [ ] Repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] .env.local configured with API keys
- [ ] Docker services running (`docker-compose ps`)
- [ ] Database created and accessible
- [ ] Application built (`npm run build`)
- [ ] Dev server starts without errors
- [ ] Can access http://localhost:3000
- [ ] Form submission works
- [ ] Chat widget appears and responds

**Once all checked:** You're ready for development! 🎉

**For production deployment:** See `../ubuntu/README.md`

---

**Last Updated:** 2025-11-24
**Platform:** Windows 10/11, Windows Server 2019+
**Node.js:** v18.x, v20.x
**Docker:** Desktop 4.0+
