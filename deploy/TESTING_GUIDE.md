# Deployment Testing Guide

Complete guide for testing Magic Page deployment on Ubuntu server (Vultr).

## Vultr Server Specifications

### Recommended Configuration

**For Testing/Staging:**
- **Plan:** Cloud Compute - Regular Performance
- **Specs:** 2 vCPU, 4GB RAM, 80GB SSD
- **OS:** Ubuntu 22.04 LTS x64
- **Monthly cost:** ~$12/month
- **Location:** Choose closest to your users

**For Production:**
- **Plan:** Cloud Compute - High Frequency
- **Specs:** 2 vCPU, 4GB RAM, 128GB NVMe SSD
- **Monthly cost:** ~$24/month
- **Optional:** Add backups (~$2.40/month)

**Why these specs:**
- 2 vCPU handles Next.js + Docker services
- 4GB RAM comfortable for PostgreSQL + Botpress + Node.js
- 80GB+ for logs, database, and Docker images

---

## Pre-Deployment Checklist

### ☐ Vultr Server Setup

1. **Create Vultr account**
   - Sign up at https://vultr.com
   - Add payment method

2. **Deploy new server**
   - Click "Deploy New Server"
   - Choose: **Cloud Compute**
   - Location: Choose nearest to you
   - OS: **Ubuntu 22.04 x64**
   - Plan: **2 vCPU / 4GB RAM / 80GB SSD**
   - Disable Auto Backups (for testing)
   - Enable IPv6 (optional)
   - Add SSH key (recommended) or use password
   - Hostname: `magic-page-test`
   - Click **Deploy Now**

3. **Note server details**
   - Server IP: `xxx.xxx.xxx.xxx`
   - Root password: (check email or Vultr dashboard)
   - SSH command: `ssh root@xxx.xxx.xxx.xxx`

### ☐ Domain Configuration

1. **Point domain to server**
   - Go to your domain registrar (Namecheap, GoDaddy, etc.)
   - DNS Management → Add A Record:
     - Type: `A`
     - Host: `@` (or subdomain like `app`)
     - Value: `YOUR_VULTR_SERVER_IP`
     - TTL: `300` (5 minutes)

2. **Verify DNS propagation**
   ```bash
   # On your Windows machine
   nslookup yourdomain.com

   # Should return your Vultr server IP
   ```

   **Note:** DNS can take 5-60 minutes to propagate.

### ☐ API Keys Ready

Gather these before deployment:

- [ ] **Botpress Cloud**
  - Bot ID
  - Workspace ID (Client ID)
  - Personal Access Token
  - Verify at: https://studio.botpress.cloud

- [ ] **ScreenshotAPI**
  - API Token
  - Verify at: https://screenshotapi.net

- [ ] **OpenAI**
  - API Key
  - Verify at: https://platform.openai.com/api-keys

- [ ] **PeopleDataLabs** (optional but recommended)
  - API Key
  - Verify at: https://www.peopledatalabs.com

- [ ] **Database Password**
  - Generate secure password:
    ```bash
    # On Windows (PowerShell)
    -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 24 | % {[char]$_})
    ```

---

## Testing Procedure

### Phase 1: Initial Server Access

**Connect to your Vultr server:**

```bash
# From Windows PowerShell or Windows Terminal
ssh root@YOUR_VULTR_IP
```

**First login actions:**

```bash
# Update system
apt update && apt upgrade -y

# Set timezone (optional)
timedatectl set-timezone America/New_York

# Verify Ubuntu version
lsb_release -a
# Should show: Ubuntu 22.04.x LTS

# Check available resources
free -h     # Memory
df -h       # Disk space
nproc       # CPU cores
```

Expected output:
- Memory: ~4GB total
- Disk: ~76GB available
- CPU: 2 cores

---

### Phase 2: Run Setup Script

**Download and execute setup script:**

```bash
# Download setup script
wget https://raw.githubusercontent.com/stooky/magicker-page/master/deploy/setup-ubuntu.sh

# Make executable
chmod +x setup-ubuntu.sh

# Run setup
bash setup-ubuntu.sh
```

**What to expect:**
- Duration: 5-10 minutes
- Installs: Node.js, Docker, PM2, build tools
- Output: Color-coded with ✓ for success

**Checkpoints:**
- [ ] System updated successfully
- [ ] Build tools installed
- [ ] nvm and Node.js v20 installed
- [ ] Docker installed
- [ ] Docker Compose installed
- [ ] UFW configured (not enabled yet)
- [ ] PM2 installed globally

**After completion:**
```bash
# IMPORTANT: Log out and back in
exit

# SSH back in
ssh root@YOUR_VULTR_IP

# Verify Docker works without sudo
docker ps
# Should show empty list (no error)
```

---

### Phase 3: Clone Repository

```bash
# Create application directory
mkdir -p /opt/magic-page
cd /opt/magic-page

# Clone repository
git clone https://github.com/stooky/magicker-page.git .

# Verify files
ls -la
# Should see: package.json, docker-compose.yml, deploy/, etc.

# Check current branch and commits
git log --oneline -5
```

**Checkpoints:**
- [ ] Repository cloned successfully
- [ ] All files present (package.json, deploy/, etc.)
- [ ] Latest commits visible

---

### Phase 4: Run Installation Script

```bash
cd /opt/magic-page

# Run installation script
bash deploy/install-app.sh
```

**Interactive prompts:**

1. **npm install**
   - Duration: 2-3 minutes
   - Watch for: "added XXX packages"

2. **Playwright installation**
   - Duration: 3-5 minutes
   - Downloads Chrome, Firefox, WebKit
   - Total size: ~1GB

3. **Create .env.local?**
   - Select: `y` (yes)
   - Creates from `.env.local.sample`

4. **SSL setup with Let's Encrypt?**
   - Select: `y` (yes)
   - Enter your domain: `yourdomain.com`
   - Certbot will validate domain ownership (port 80 must be accessible)
   - Certificate saved to `/etc/letsencrypt/live/yourdomain.com/`

5. **Start PostgreSQL?**
   - Select: `y` (yes)
   - Waits 10 seconds for initialization
   - Creates database `mp`

**Checkpoints:**
- [ ] Dependencies installed (check `node_modules/` exists)
- [ ] Playwright browsers installed
- [ ] `.env.local` created
- [ ] SSL certificate generated successfully
- [ ] PostgreSQL container running
- [ ] Database `mp` created

**Verify PostgreSQL:**
```bash
docker compose ps
# Should show postgres, botpress, duckling running

docker exec -it botpress_postgres psql -U postgres -d mp -c "\dt"
# Should show: "Did not find any relations." (empty database is OK)
```

---

### Phase 5: Configure Environment

```bash
# Edit environment file
nano .env.local
```

**Update these critical variables:**

```env
# Domain (should already be set by install script)
DOMAIN=yourdomain.com
NEXT_PUBLIC_DOMAIN=yourdomain.com

# SSL (should already be set)
SSL_KEY_PATH="/etc/letsencrypt/live/yourdomain.com/privkey.pem"
SSL_CERT_PATH="/etc/letsencrypt/live/yourdomain.com/fullchain.pem"

# Database - CHANGE PASSWORD
DB_USER=postgres
DB_HOST=localhost
DB_PASSWORD=YOUR_SECURE_PASSWORD_FROM_CHECKLIST
DB=mp
DB_PORT=5433

# Botpress Cloud - ADD YOUR CREDENTIALS
BOTPRESS_SERVER_URL=https://chat.botpress.cloud
BOTPRESS_BOT_ID=your-bot-id-here
BOTPRESS_CLIENT_ID=your-workspace-id-here
BOTPRESS_WEBHOOK_SECRET=<generate random: openssl rand -hex 32>
BOTPRESS_API_TOKEN=bp_pat_your-token-here
JWT_SECRET=<generate random: openssl rand -hex 64>

# Public Botpress (must match above)
NEXT_PUBLIC_BOTPRESS_BOT_ID=your-bot-id-here
NEXT_PUBLIC_BOTPRESS_CLIENT_ID=your-workspace-id-here

# API Keys
SCREENSHOTAPI_TOKEN=your-screenshot-api-token
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4o-mini
USE_OPENAI_EXTRACTION=true
NEXT_PUBLIC_PDL_API_KEY=your-pdl-key

# Settings
SNIPPET_SHOW=5
BYPASS_MODE=OFF
ENV=prod
```

**Generate secrets:**
```bash
# While editing, open another SSH session to generate:
openssl rand -hex 32  # For BOTPRESS_WEBHOOK_SECRET
openssl rand -hex 64  # For JWT_SECRET
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

**Update docker-compose.yml password:**
```bash
nano docker-compose.yml

# Find this line under postgres service:
POSTGRES_PASSWORD: botpress_password

# Change to match your .env.local DB_PASSWORD
POSTGRES_PASSWORD: YOUR_SECURE_PASSWORD_FROM_CHECKLIST

# Save: Ctrl+X, Y, Enter
```

**Restart PostgreSQL with new password:**
```bash
docker compose down postgres
docker compose up -d postgres
sleep 5

# Test connection
docker exec -it botpress_postgres psql -U postgres -d mp -c "SELECT 1;"
# Should return: (1 row)
```

**Checkpoints:**
- [ ] All API keys configured
- [ ] Database password changed and matches in both files
- [ ] Secrets generated and configured
- [ ] Domain and SSL paths correct

---

### Phase 6: Build Application

```bash
cd /opt/magic-page

# Build Next.js application
npm run build
```

**What to expect:**
- Duration: 2-5 minutes
- Creates `.next/` directory with production build
- Output should end with: "✓ Compiled successfully"

**If build fails:**
- Check for syntax errors in code
- Verify all dependencies installed
- Review error messages carefully

**Checkpoints:**
- [ ] Build completed successfully
- [ ] `.next/` directory created
- [ ] No error messages in output

---

### Phase 7: Start Production

```bash
cd /opt/magic-page

# Start all services
bash deploy/start-production.sh
```

**What to expect:**
1. Docker services start (PostgreSQL, Botpress, Duckling)
2. Next.js app starts with PM2
3. Display shows PM2 status table

**Checkpoints:**
- [ ] Docker services running (`docker compose ps` shows all "Up")
- [ ] PM2 shows "magic-page" as "online"
- [ ] No errors in startup logs

**View logs:**
```bash
# Application logs
pm2 logs magic-page

# Docker logs
docker compose logs -f

# Look for:
# - "Ready on https://yourdomain.com:443"
# - No connection errors
# - Botpress initialization messages
```

---

### Phase 8: Enable Firewall

```bash
# Enable UFW firewall
sudo ufw enable

# Confirm with 'y'

# Verify rules
sudo ufw status verbose

# Should show:
# - 22/tcp (SSH) ALLOW
# - 80/tcp (HTTP) ALLOW
# - 443/tcp (HTTPS) ALLOW
```

**⚠️ WARNING:** Make sure SSH (port 22) is allowed before enabling UFW, or you'll lock yourself out!

---

### Phase 9: Verification & Testing

**1. Health Check**

```bash
cd /opt/magic-page
bash deploy/health-check.sh
```

**Expected output:**
```
============================================
  Magic Page - Health Check
============================================

Docker Services:
----------------
✓ botpress_postgres is running
✓ botpress is running
✓ botpress_duckling is running

Database:
---------
✓ PostgreSQL connection OK
ℹ Visitors in database: 0

Next.js Application:
--------------------
✓ Application is running (PM2)
ℹ Memory usage: 256MB
ℹ Uptime: 0h

Configuration:
--------------
✓ .env.local exists
✓ Botpress Bot ID configured
✓ SSL certificate exists
ℹ SSL expires: [date]

System Resources:
-----------------
✓ Disk usage: 35%
✓ Memory usage: 45% (1823MB / 4096MB)
ℹ Docker disk usage: 2.1GB

============================================
✓ All health checks passed!
```

**2. Test HTTPS Access**

From your Windows machine:

```powershell
# Test HTTPS connection
curl https://yourdomain.com

# Or open in browser:
# https://yourdomain.com
```

**Expected:**
- HTTPS loads without certificate warnings
- Shows Magic Page landing page
- No mixed content errors in browser console

**3. Test Form Submission**

1. Go to: `https://yourdomain.com`
2. Enter a website URL (e.g., `https://google.com`)
3. Wait for scanning animation
4. Verify:
   - Screenshot loads
   - Messages cycle through
   - Transitions to chat interface
   - Chat widget appears (Botpress)

**4. Test Database Recording**

```bash
# On server, check if visitor was recorded
docker exec -it botpress_postgres psql -U postgres -d mp -c "SELECT * FROM visitors ORDER BY created_at DESC LIMIT 1;"

# Should show your test submission with:
# - website URL
# - session ID
# - timestamp
```

**5. Test Botpress Chat**

1. In the chat widget, send a message
2. Verify bot responds
3. Check Botpress Studio Logs:
   - Go to: https://studio.botpress.cloud
   - Open your bot → Logs
   - Verify conversation appears

**6. Test Knowledge Base**

If you have KB files uploaded for a domain:

1. Submit that domain's website
2. Ask domain-specific questions in chat
3. Verify bot uses domain-specific knowledge

---

### Phase 10: Performance Testing

**1. Check Response Times**

```bash
# From Windows PowerShell
Measure-Command { Invoke-WebRequest -Uri https://yourdomain.com }

# Should complete in < 2 seconds
```

**2. Monitor Resource Usage**

```bash
# On server
watch -n 2 'free -h && echo && docker stats --no-stream'

# Watch while testing
# Memory should stay under 3GB
# CPU spikes during requests are normal
```

**3. Test Multiple Concurrent Requests**

```powershell
# From Windows PowerShell
1..5 | ForEach-Object -Parallel {
    Invoke-WebRequest -Uri https://yourdomain.com
}
```

**Monitor on server:**
```bash
pm2 monit
# Watch memory and CPU usage
```

---

## Validation Checklist

### ✓ Infrastructure
- [ ] Vultr server running Ubuntu 22.04
- [ ] 2 vCPU, 4GB RAM confirmed
- [ ] Domain DNS pointing to server IP
- [ ] SSH access working
- [ ] Firewall enabled with correct ports

### ✓ Dependencies
- [ ] Node.js v20 installed
- [ ] Docker installed and working without sudo
- [ ] Docker Compose installed
- [ ] PM2 installed globally
- [ ] Playwright browsers installed

### ✓ Application
- [ ] Repository cloned
- [ ] Dependencies installed (node_modules/)
- [ ] .env.local configured with API keys
- [ ] SSL certificate generated and valid
- [ ] Application built successfully (.next/)

### ✓ Services
- [ ] PostgreSQL running and accessible
- [ ] Botpress running
- [ ] Duckling running
- [ ] Next.js app running via PM2
- [ ] All services started automatically

### ✓ Functionality
- [ ] HTTPS loads without errors
- [ ] Form submission works
- [ ] Screenshots display correctly
- [ ] Database records visitors
- [ ] Botpress chat widget loads
- [ ] Bot responds to messages
- [ ] KB integration works (if configured)

### ✓ Monitoring
- [ ] Health check passes all tests
- [ ] Logs accessible (pm2 logs, docker logs)
- [ ] Resource usage acceptable (<80% memory)
- [ ] No errors in application logs

---

## Troubleshooting

### Issue: DNS not propagating

**Check propagation:**
```bash
nslookup yourdomain.com 8.8.8.8
```

**Solution:** Wait 5-60 minutes, or use server IP temporarily.

### Issue: Let's Encrypt fails

**Common causes:**
- Port 80 not accessible (check Vultr firewall)
- DNS not propagated yet
- Domain not pointing to server

**Solution:** Use self-signed certificate temporarily:
```bash
sudo mkdir -p /etc/ssl/magic-page
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/magic-page/privkey.pem \
  -out /etc/ssl/magic-page/fullchain.pem \
  -subj "/CN=yourdomain.com"

# Update .env.local
SSL_KEY_PATH="/etc/ssl/magic-page/privkey.pem"
SSL_CERT_PATH="/etc/ssl/magic-page/fullchain.pem"
```

### Issue: PM2 app crashed

```bash
# Check logs
pm2 logs magic-page --lines 100

# Common issues:
# - SSL certificate path wrong
# - Database connection failed
# - Port already in use

# Restart after fixing
pm2 restart magic-page
```

### Issue: Out of memory

```bash
# Check memory usage
free -h

# Increase swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Issue: Docker containers won't start

```bash
# Check Docker daemon
sudo systemctl status docker

# Restart Docker
sudo systemctl restart docker

# Check container logs
docker compose logs postgres
docker compose logs botpress

# Restart containers
docker compose down
docker compose up -d
```

---

## Post-Testing Actions

### If Testing Successful ✅

1. **Document custom configurations**
   - Note any deviations from standard setup
   - Document specific API settings
   - Record performance benchmarks

2. **Set up monitoring**
   ```bash
   # Schedule health checks
   crontab -e

   # Add:
   */15 * * * * /opt/magic-page/deploy/health-check.sh >> /var/log/magic-page-health.log 2>&1
   0 2 * * * /opt/magic-page/deploy/backup-database.sh /opt/backups/magic-page
   ```

3. **Configure PM2 startup**
   ```bash
   pm2 startup
   # Run the command it shows
   pm2 save
   ```

4. **Enable auto-updates** (optional)
   ```bash
   sudo apt install unattended-upgrades
   sudo dpkg-reconfigure --priority=low unattended-upgrades
   ```

### If Testing Failed ❌

1. **Collect logs**
   ```bash
   # Create diagnostics bundle
   mkdir ~/diagnostics
   pm2 logs magic-page --lines 500 > ~/diagnostics/pm2.log
   docker compose logs > ~/diagnostics/docker.log
   cp .env.local ~/diagnostics/env.txt  # Remove sensitive data first!
   tar -czf ~/diagnostics.tar.gz ~/diagnostics/
   ```

2. **Review common issues**
   - Check all API keys are valid
   - Verify SSL certificates exist and are readable
   - Confirm database password matches in both files
   - Check port conflicts

3. **Get support**
   - Open issue: https://github.com/stooky/magicker-page/issues
   - Include diagnostics bundle (remove sensitive data)
   - Describe steps taken and error messages

---

## Cleanup (If Testing Complete)

### Keep Server Running
- No cleanup needed
- Proceed with production use

### Destroy Test Server
```bash
# On Vultr dashboard:
# 1. Go to "Servers"
# 2. Click on your server
# 3. Settings → "Delete Server"
# 4. Confirm deletion

# Charges stop immediately
```

---

## Next Steps

After successful testing:

1. **Production deployment**
   - Use same process on production server
   - Use strong passwords and secrets
   - Configure backups
   - Set up monitoring

2. **Performance tuning**
   - Enable caching
   - Configure CDN (Cloudflare)
   - Optimize database queries
   - Monitor resource usage

3. **Security hardening**
   - Disable root SSH login
   - Configure fail2ban
   - Set up log monitoring
   - Regular security updates

---

## Testing Timeline

**Estimated total time: 45-60 minutes**

- Phase 1 (Server Access): 5 min
- Phase 2 (Setup Script): 10 min
- Phase 3 (Clone Repo): 2 min
- Phase 4 (Installation): 10 min
- Phase 5 (Configure): 5 min
- Phase 6 (Build): 5 min
- Phase 7 (Start): 3 min
- Phase 8 (Firewall): 2 min
- Phase 9 (Verification): 10 min
- Phase 10 (Performance): 5 min

**Total:** ~57 minutes (first-time deployment)

**Subsequent deployments:** ~20 minutes (skip dependency installation)

---

## Support

- **Deployment Guide:** `UBUNTU_DEPLOYMENT.md`
- **Environment Setup:** `deploy/ENVIRONMENT_SETUP.md`
- **Script README:** `deploy/README.md`
- **Issues:** https://github.com/stooky/magicker-page/issues
