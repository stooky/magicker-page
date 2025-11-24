# Magic Page Deployment - Quick Checklist

**Print this page or keep it open during deployment**

---

## Pre-Deployment Prep

### ☐ Server Information
- Vultr IP: `___.___.___.___`
- Domain: `________________________`
- SSH Password: (saved securely)

### ☐ DNS Configured
```bash
# Verify from Windows:
nslookup yourdomain.com
# Should return your Vultr IP
```

### ☐ API Keys Ready
```
Botpress Bot ID:        bot_________________
Botpress Workspace ID:  ws__________________
Botpress API Token:     bp_pat______________
Screenshot API Token:   _____________________
OpenAI API Key:         sk-_________________
PDL API Key:            _____________________
Database Password:      _____________________ (24+ chars)
```

**Generate secure passwords:**
```powershell
# Windows PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 24 | % {[char]$_})
```

---

## Deployment Steps (45-60 min)

### Phase 1: Connect to Server ⏱️ 2 min
```bash
ssh root@YOUR_VULTR_IP
```

**Verify Ubuntu:**
```bash
lsb_release -a    # Should show Ubuntu 22.04
free -h           # Check ~4GB RAM
df -h             # Check ~76GB disk
```

☐ Ubuntu 22.04 confirmed
☐ 4GB RAM available
☐ 76GB+ disk space

---

### Phase 2: Run Setup Script ⏱️ 10 min
```bash
wget https://raw.githubusercontent.com/stooky/magicker-page/master/deploy/setup-ubuntu.sh
chmod +x setup-ubuntu.sh
bash setup-ubuntu.sh
```

**After completion:**
```bash
exit  # ⚠️ MUST LOG OUT AND BACK IN!
ssh root@YOUR_VULTR_IP
docker ps  # Should work without sudo
```

☐ Script completed successfully
☐ Logged out and back in
☐ Docker works without sudo

---

### Phase 3: Clone Repository ⏱️ 2 min
```bash
mkdir -p /opt/magic-page
cd /opt/magic-page
git clone https://github.com/stooky/magicker-page.git .
ls -la  # Verify files present
```

☐ Repository cloned
☐ Files verified (package.json, deploy/, etc.)

---

### Phase 4: Run Installation ⏱️ 10 min
```bash
bash deploy/install-app.sh
```

**Interactive prompts:**
- Create .env.local? → `y`
- SSL setup with Let's Encrypt? → `y`
  - Enter domain: `yourdomain.com`
- Start PostgreSQL? → `y`

**Verify:**
```bash
docker compose ps  # All services "Up"
ls .env.local      # File exists
```

☐ Dependencies installed
☐ SSL certificate generated
☐ PostgreSQL running
☐ Database created

---

### Phase 5: Configure Environment ⏱️ 5 min
```bash
nano .env.local
```

**Critical variables to update:**
```env
# Domain (should already be set)
DOMAIN=yourdomain.com
NEXT_PUBLIC_DOMAIN=yourdomain.com

# SSL (should already be set)
SSL_KEY_PATH="/etc/letsencrypt/live/yourdomain.com/privkey.pem"
SSL_CERT_PATH="/etc/letsencrypt/live/yourdomain.com/fullchain.pem"

# Database - CHANGE PASSWORD!
DB_PASSWORD=YOUR_24_CHAR_PASSWORD

# Botpress - ADD YOUR VALUES
BOTPRESS_BOT_ID=bot_your_id
BOTPRESS_CLIENT_ID=ws_your_id
BOTPRESS_API_TOKEN=bp_pat_your_token
NEXT_PUBLIC_BOTPRESS_BOT_ID=bot_your_id
NEXT_PUBLIC_BOTPRESS_CLIENT_ID=ws_your_id

# Generate these:
BOTPRESS_WEBHOOK_SECRET=<run: openssl rand -hex 32>
JWT_SECRET=<run: openssl rand -hex 64>

# API Keys
SCREENSHOTAPI_TOKEN=your_token
OPENAI_API_KEY=sk-your_key
NEXT_PUBLIC_PDL_API_KEY=your_key
```

**Save:** `Ctrl+X` → `Y` → `Enter`

**Update docker-compose.yml:**
```bash
nano docker-compose.yml
# Find: POSTGRES_PASSWORD: botpress_password
# Change to: POSTGRES_PASSWORD: YOUR_24_CHAR_PASSWORD
# Save: Ctrl+X, Y, Enter

docker compose restart postgres
```

☐ All API keys configured
☐ Secrets generated
☐ DB password changed (both files)
☐ PostgreSQL restarted

---

### Phase 6: Build Application ⏱️ 5 min
```bash
npm run build
```

**Look for:** `✓ Compiled successfully`

☐ Build completed without errors
☐ `.next/` directory created

---

### Phase 7: Start Production ⏱️ 3 min
```bash
bash deploy/start-production.sh
```

**Verify:**
```bash
pm2 status          # Should show "online"
docker compose ps   # All "Up"
```

☐ Docker services running
☐ PM2 shows "online"
☐ No errors in logs

---

### Phase 8: Enable Firewall ⏱️ 2 min
```bash
sudo ufw enable  # Type 'y' to confirm
sudo ufw status verbose
```

**Should show:**
- 22/tcp ALLOW (SSH)
- 80/tcp ALLOW (HTTP)
- 443/tcp ALLOW (HTTPS)

☐ Firewall enabled
☐ Required ports open

---

### Phase 9: Verification ⏱️ 10 min

**Health Check:**
```bash
bash deploy/health-check.sh
```

☐ All services passing
☐ Database connected
☐ SSL valid

**Test Deployment Script:**
```bash
bash deploy/test-deployment.sh
```

☐ All tests passing
☐ 0 critical errors

**Browser Test (from Windows):**
- Open: `https://yourdomain.com`
- Submit a website URL
- Verify: Screenshot loads, chat appears

☐ HTTPS loads without warnings
☐ Form submission works
☐ Chat widget appears

**Database Check:**
```bash
docker exec -it botpress_postgres psql -U postgres -d mp -c "SELECT COUNT(*) FROM visitors;"
```

☐ Visitor recorded in database

---

### Phase 10: Performance ⏱️ 5 min

**Resource Check:**
```bash
free -h              # Memory usage
df -h                # Disk usage
pm2 monit            # Live monitoring (Ctrl+C to exit)
```

☐ Memory < 3GB used
☐ Disk < 80% used
☐ App responsive

---

## Post-Deployment

### ☐ Configure Auto-Start
```bash
pm2 startup
# Run the command it shows
pm2 save
```

### ☐ Schedule Backups
```bash
crontab -e
# Add:
0 2 * * * /opt/magic-page/deploy/backup-database.sh /opt/backups/magic-page
```

### ☐ Document Customizations
- Note any configuration changes
- Save API key references
- Document domain/DNS settings

---

## Quick Commands Reference

**View Logs:**
```bash
pm2 logs magic-page              # Application logs
pm2 logs magic-page --lines 100  # Last 100 lines
docker compose logs -f           # Docker logs
```

**Restart Services:**
```bash
pm2 restart magic-page           # Restart app
docker compose restart           # Restart Docker services
```

**Stop Services:**
```bash
pm2 stop magic-page              # Stop app
docker compose down              # Stop Docker
```

**Check Status:**
```bash
pm2 status                       # PM2 status
docker compose ps                # Docker status
bash deploy/health-check.sh      # Full health check
```

---

## Troubleshooting Quick Fixes

### Issue: DNS not resolving
```bash
# Use IP temporarily, fix DNS later
# Update .env.local with IP instead of domain
```

### Issue: Let's Encrypt failed
```bash
# Use self-signed certificate
sudo mkdir -p /etc/ssl/magic-page
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/magic-page/privkey.pem \
  -out /etc/ssl/magic-page/fullchain.pem \
  -subj "/CN=yourdomain.com"

# Update .env.local:
SSL_KEY_PATH="/etc/ssl/magic-page/privkey.pem"
SSL_CERT_PATH="/etc/ssl/magic-page/fullchain.pem"
```

### Issue: Docker requires sudo
```bash
# User not in docker group
sudo usermod -aG docker $USER
exit
# Log back in
```

### Issue: PM2 app crashed
```bash
pm2 logs magic-page --lines 50   # Check error
# Fix issue in .env.local or code
pm2 restart magic-page
```

### Issue: Out of memory
```bash
# Add swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## Success Criteria ✅

Deployment is successful when:
- ☑ Health check passes all tests
- ☑ HTTPS loads in browser without warnings
- ☑ Form submission records to database
- ☑ Chat widget loads and responds
- ☑ All Docker services running
- ☑ PM2 shows app "online"
- ☑ Memory usage < 80%
- ☑ No errors in logs

---

## Support Resources

**Full Guides:**
- Complete guide: `UBUNTU_DEPLOYMENT.md`
- Testing guide: `deploy/TESTING_GUIDE.md`
- Environment setup: `deploy/ENVIRONMENT_SETUP.md`

**Scripts:**
- Health check: `bash deploy/health-check.sh`
- Test deployment: `bash deploy/test-deployment.sh`
- Backup database: `bash deploy/backup-database.sh`

**Get Help:**
- Issues: https://github.com/stooky/magicker-page/issues

---

**Deployment Date:** ________________
**Server IP:** ________________
**Domain:** ________________
**Deployed By:** ________________

---

**Estimated Total Time:** 45-60 minutes
**Start Time:** ______:______
**End Time:** ______:______
**Actual Duration:** ______ minutes
