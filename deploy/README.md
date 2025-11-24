# Deployment Scripts

Automated deployment scripts for Magic Page on Ubuntu Server.

## Scripts Overview

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `setup-ubuntu.sh` | Initial server setup | First time on a new Ubuntu server |
| `install-app.sh` | Install application dependencies | After cloning repository |
| `start-production.sh` | Start all services | Every time you want to start the app |
| `backup-database.sh` | Backup PostgreSQL database | Daily via cron, or manually |
| `health-check.sh` | Verify all services are healthy | Monitoring, troubleshooting |

## Quick Start

### 1. Initial Server Setup (Run Once)

```bash
# Download and run setup script
wget https://raw.githubusercontent.com/stooky/magicker-page/master/deploy/setup-ubuntu.sh
bash setup-ubuntu.sh

# Log out and back in (required for Docker group membership)
exit
```

### 2. Clone Repository & Install

```bash
# Create application directory
sudo mkdir -p /opt/magic-page
sudo chown $USER:$USER /opt/magic-page

# Clone repository
cd /opt/magic-page
git clone https://github.com/stooky/magicker-page.git .

# Run installation script
bash deploy/install-app.sh
```

### 3. Configure Environment

```bash
# Edit environment variables
nano .env.local

# Configure these critical variables:
# - DOMAIN (your domain name)
# - SSL_CERT_PATH & SSL_KEY_PATH (SSL certificates)
# - BOTPRESS_BOT_ID, BOTPRESS_CLIENT_ID, BOTPRESS_API_TOKEN
# - DB_PASSWORD (secure database password)
# - OPENAI_API_KEY
# - SCREENSHOTAPI_TOKEN
```

### 4. Build & Start

```bash
# Build the Next.js application
npm run build

# Start all services
bash deploy/start-production.sh
```

### 5. Verify Deployment

```bash
# Run health check
bash deploy/health-check.sh

# Check application logs
pm2 logs magic-page
```

---

## Script Details

### setup-ubuntu.sh

**Purpose:** Prepares a fresh Ubuntu server with all required system dependencies.

**What it installs:**
- System updates
- Build tools (curl, wget, git)
- Node.js v20 via nvm
- Docker & Docker Compose
- UFW Firewall (configured but not enabled)
- PM2 process manager

**Usage:**
```bash
bash setup-ubuntu.sh
```

**Important:** You must log out and back in after running this script for Docker group membership to take effect.

---

### install-app.sh

**Purpose:** Installs application-specific dependencies and configures the environment.

**What it does:**
- Installs Node.js dependencies (`npm install`)
- Installs Playwright browsers and system deps
- Creates `.env.local` from template
- Optionally sets up SSL with Let's Encrypt
- Optionally starts PostgreSQL and creates database

**Usage:**
```bash
cd /opt/magic-page
bash deploy/install-app.sh
```

**Interactive prompts:**
- SSL setup with Let's Encrypt (recommended)
- Database initialization
- Environment file creation

---

### start-production.sh

**Purpose:** Starts all services in production mode.

**What it does:**
1. Validates environment configuration
2. Builds Next.js app (if not already built)
3. Starts Docker services (PostgreSQL, Botpress, Duckling)
4. Starts Next.js app with PM2 (or directly if PM2 not available)

**Usage:**
```bash
cd /opt/magic-page
bash deploy/start-production.sh
```

**Output:**
- Shows service status
- Displays PM2 process info
- Provides log viewing commands

---

### backup-database.sh

**Purpose:** Creates timestamped, compressed database backups.

**What it does:**
- Dumps PostgreSQL database to SQL file
- Compresses backup with gzip
- Cleans up backups older than 7 days (configurable)
- Stores backups with timestamp format: `magic_page_db_YYYYMMDD_HHMMSS.sql.gz`

**Usage:**

```bash
# Manual backup (default location: ./backups)
bash deploy/backup-database.sh

# Backup to specific directory
bash deploy/backup-database.sh /opt/backups/magic-page
```

**Schedule with Cron:**

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /opt/magic-page/deploy/backup-database.sh /opt/backups/magic-page
```

**Restore a backup:**

```bash
# Uncompress
gunzip /opt/backups/magic-page/magic_page_db_20251124_020000.sql.gz

# Restore
cat /opt/backups/magic-page/magic_page_db_20251124_020000.sql | \
  docker exec -i botpress_postgres psql -U postgres mp
```

---

### health-check.sh

**Purpose:** Comprehensive health check of all services and system resources.

**What it checks:**
- ✅ Docker services (PostgreSQL, Botpress, Duckling)
- ✅ Database connectivity
- ✅ Next.js application status
- ✅ Configuration file existence
- ✅ SSL certificate validity and expiry
- ✅ Disk space usage
- ✅ Memory usage
- ✅ Docker disk usage

**Usage:**

```bash
cd /opt/magic-page
bash deploy/health-check.sh
```

**Exit codes:**
- `0` - All checks passed
- `1` - One or more checks failed

**Example output:**

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
ℹ Visitors in database: 42

Next.js Application:
--------------------
✓ Application is running (PM2)
ℹ Memory usage: 256MB
ℹ Uptime: 12h

Configuration:
--------------
✓ .env.local exists
✓ Botpress Bot ID configured
✓ SSL certificate exists
ℹ SSL expires: Jan 15 2026

System Resources:
-----------------
✓ Disk usage: 45%
✓ Memory usage: 62% (2489MB / 4096MB)
ℹ Docker disk usage: 1.2GB

============================================
✓ All health checks passed!
```

**Schedule with Cron (monitoring):**

```bash
# Check health every hour and log results
0 * * * * /opt/magic-page/deploy/health-check.sh >> /var/log/magic-page-health.log 2>&1
```

---

## Automated Monitoring Setup

### 1. Health Check Monitoring

Create a monitoring script that sends alerts on failure:

```bash
nano /opt/magic-page/deploy/monitor.sh
```

```bash
#!/bin/bash
cd /opt/magic-page

if ! bash deploy/health-check.sh; then
    # Send alert (email, Slack, etc.)
    echo "Health check failed at $(date)" | mail -s "Magic Page Alert" admin@yourdomain.com
fi
```

```bash
chmod +x /opt/magic-page/deploy/monitor.sh

# Schedule every 15 minutes
crontab -e
*/15 * * * * /opt/magic-page/deploy/monitor.sh
```

### 2. Automatic Backups

```bash
# Daily database backup at 2 AM
0 2 * * * /opt/magic-page/deploy/backup-database.sh /opt/backups/magic-page

# Weekly full backup (code + database)
0 3 * * 0 tar -czf /opt/backups/full_backup_$(date +\%Y\%m\%d).tar.gz /opt/magic-page
```

### 3. Log Rotation

Create log rotation config:

```bash
sudo nano /etc/logrotate.d/magic-page
```

```
/var/log/magic-page*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
```

---

## Troubleshooting

### Scripts Not Executable

```bash
cd /opt/magic-page/deploy
chmod +x *.sh
```

### Permission Denied (Docker)

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in
exit
```

### PM2 Not Starting on Boot

```bash
# Generate startup script
pm2 startup

# Copy and run the command shown
# Then save PM2 process list
pm2 save
```

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker compose ps postgres

# Check logs
docker compose logs postgres

# Verify credentials in .env.local match docker-compose.yml
```

### SSL Certificate Renewal Failed

```bash
# Test renewal
sudo certbot renew --dry-run

# Manual renewal
sudo certbot renew

# Check certbot timer
sudo systemctl status certbot.timer
```

---

## Production Checklist

### Pre-Deployment
- [ ] Server meets minimum requirements (2 CPU, 4GB RAM, 20GB disk)
- [ ] Domain DNS configured and propagated
- [ ] All API keys and credentials gathered
- [ ] Firewall rules planned

### Initial Setup
- [ ] Run `setup-ubuntu.sh`
- [ ] Log out and back in
- [ ] Clone repository
- [ ] Run `install-app.sh`
- [ ] Configure `.env.local`
- [ ] Generate SSL certificates

### Deployment
- [ ] Build application (`npm run build`)
- [ ] Start services (`bash deploy/start-production.sh`)
- [ ] Run health check (`bash deploy/health-check.sh`)
- [ ] Test application in browser

### Post-Deployment
- [ ] Configure automated backups
- [ ] Set up health monitoring
- [ ] Configure log rotation
- [ ] Document custom configurations
- [ ] Test backup restoration procedure

---

## Maintenance

### Updates

```bash
cd /opt/magic-page

# Pull latest code
git pull origin master

# Install any new dependencies
npm install

# Rebuild application
npm run build

# Restart services
pm2 restart magic-page
docker compose restart
```

### View Logs

```bash
# Application logs (PM2)
pm2 logs magic-page
pm2 logs magic-page --lines 100

# Docker service logs
docker compose logs -f
docker compose logs postgres --tail=50

# System logs
sudo journalctl -u magic-page -f
```

### Stop Services

```bash
# Stop application
pm2 stop magic-page

# Stop Docker services
docker compose down

# Stop everything
pm2 stop all && docker compose down
```

---

## Additional Resources

- **Full Deployment Guide:** `../UBUNTU_DEPLOYMENT.md`
- **Application README:** `../README.md`
- **Environment Variables:** `../.env.local.sample`
- **Docker Compose Config:** `../docker-compose.yml`

---

## Support

For issues or questions:
- Check logs first: `pm2 logs magic-page` and `docker compose logs`
- Run health check: `bash deploy/health-check.sh`
- Review full deployment guide: `UBUNTU_DEPLOYMENT.md`
- Open issue: https://github.com/stooky/magicker-page/issues
