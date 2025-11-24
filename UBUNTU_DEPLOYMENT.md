# Ubuntu Server Deployment Guide

Complete guide for deploying Magic Page (Member Solutions) on Ubuntu Server.

## Table of Contents
- [System Requirements](#system-requirements)
- [Pre-Installation Checklist](#pre-installation-checklist)
- [Installation Steps](#installation-steps)
- [SSL/TLS Setup](#ssltls-setup)
- [Service Management](#service-management)
- [Monitoring & Logs](#monitoring--logs)
- [Troubleshooting](#troubleshooting)

---

## System Requirements

### Minimum Hardware
- **CPU:** 2 cores (4 recommended for production)
- **RAM:** 4GB (8GB recommended)
- **Storage:** 20GB available (50GB+ recommended for logs/database)
- **Network:** Static IP or domain name configured

### Software Requirements
- **OS:** Ubuntu 20.04 LTS or 22.04 LTS
- **Node.js:** v18.x or v20.x
- **Docker:** v24.x or later
- **Docker Compose:** v2.x or later
- **PostgreSQL:** 14+ (via Docker)

### Network Requirements
- **Ports to open:**
  - `80` - HTTP (redirects to HTTPS)
  - `443` - HTTPS (Next.js app)
  - `3001` - Botpress UI (optional, for admin access)
  - `5433` - PostgreSQL (localhost only, unless remote access needed)
  - `8000` - Duckling NLU service (Docker internal)

---

## Pre-Installation Checklist

### DNS & Domain Setup
- [ ] Domain registered and pointing to server IP
- [ ] A record configured: `yourdomain.com -> SERVER_IP`
- [ ] Subdomain configured (optional): `app.yourdomain.com -> SERVER_IP`
- [ ] DNS propagation verified (`nslookup yourdomain.com`)

### API Keys & Credentials
Gather these before starting:
- [ ] **Botpress Cloud:** Bot ID, Workspace ID, Personal Access Token
- [ ] **ScreenshotAPI:** API token from screenshotapi.net
- [ ] **OpenAI:** API key for snippet extraction
- [ ] **PDL (PeopleDataLabs):** API key for company enrichment
- [ ] **Vendasta:** Service account credentials (if using)
- [ ] **Database:** Choose a secure password for PostgreSQL

### Server Access
- [ ] SSH access to Ubuntu server
- [ ] Sudo/root privileges
- [ ] Firewall configured (UFW recommended)

---

## Installation Steps

### Step 1: System Update & Prerequisites

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential build tools
sudo apt install -y curl wget git build-essential

# Install UFW firewall (if not installed)
sudo apt install -y ufw
```

### Step 2: Install Node.js (via nvm)

```bash
# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell configuration
source ~/.bashrc

# Install Node.js LTS
nvm install 20
nvm use 20
nvm alias default 20

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show v10.x.x
```

### Step 3: Install Docker & Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group (avoid using sudo)
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt install -y docker-compose-plugin

# Verify installation
docker --version
docker compose version

# IMPORTANT: Log out and back in for group membership to take effect
exit
# (SSH back in)

# Test Docker without sudo
docker ps
```

### Step 4: Clone Repository

```bash
# Create application directory
sudo mkdir -p /opt/magic-page
sudo chown $USER:$USER /opt/magic-page

# Clone repository
cd /opt/magic-page
git clone https://github.com/stooky/magicker-page.git .

# Verify files
ls -la
```

### Step 5: Install Node Dependencies

```bash
# Install Playwright system dependencies
npx playwright install-deps

# Install Node.js packages
npm install

# Install Playwright browsers
npx playwright install
```

### Step 6: Configure Environment Variables

```bash
# Copy sample environment file
cp .env.local.sample .env.local

# Edit with your values
nano .env.local
```

**Required variables to configure:**

```env
# Domain Configuration
DOMAIN=yourdomain.com
NEXT_PUBLIC_DOMAIN=yourdomain.com

# SSL Certificate Paths (set these after running certbot)
SSL_KEY_PATH="/etc/letsencrypt/live/yourdomain.com/privkey.pem"
SSL_CERT_PATH="/etc/letsencrypt/live/yourdomain.com/fullchain.pem"

# PostgreSQL (use strong password)
DB_USER=postgres
DB_HOST=localhost
DB_PASSWORD=YOUR_SECURE_PASSWORD_HERE
DB=mp
DB_PORT=5433

# Botpress Cloud
BOTPRESS_SERVER_URL=https://chat.botpress.cloud
BOTPRESS_BOT_ID=your-bot-id
BOTPRESS_CLIENT_ID=your-workspace-id
BOTPRESS_WEBHOOK_SECRET=random-secret-string
BOTPRESS_API_TOKEN=bp_pat_your-token
JWT_SECRET=random-jwt-secret

# Public Botpress (same as above)
NEXT_PUBLIC_BOTPRESS_BOT_ID=your-bot-id
NEXT_PUBLIC_BOTPRESS_CLIENT_ID=your-workspace-id

# Screenshot API
SCREENSHOTAPI_TOKEN=your-token

# OpenAI
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-4o-mini
USE_OPENAI_EXTRACTION=true

# PDL (Company Enrichment)
NEXT_PUBLIC_PDL_API_KEY=your-pdl-key
NEXT_PUBLIC_PDL_API_URL=https://api.peopledatalabs.com/v5/company/enrich
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

### Step 7: Configure Docker Compose for Production

Update `docker-compose.yml` with production settings:

```bash
nano docker-compose.yml
```

**Key changes for production:**

```yaml
services:
  botpress:
    environment:
      - BP_PRODUCTION=true  # Change to true
      - EXTERNAL_URL=https://yourdomain.com  # Update with your domain
    restart: always  # Change from unless-stopped

  postgres:
    environment:
      POSTGRES_PASSWORD: YOUR_SECURE_PASSWORD  # Match .env.local
    restart: always

  duckling:
    restart: always
```

---

## SSL/TLS Setup

### Option A: Let's Encrypt (Free, Recommended)

```bash
# Install Certbot
sudo apt install -y certbot

# Stop any service using port 80
sudo ufw allow 80
sudo ufw allow 443

# Generate certificate (standalone mode)
sudo certbot certonly --standalone -d yourdomain.com

# Certificates will be saved to:
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem

# Grant read access to application user
sudo chmod 755 /etc/letsencrypt/live
sudo chmod 755 /etc/letsencrypt/archive
```

**Update .env.local with certificate paths:**

```env
SSL_KEY_PATH="/etc/letsencrypt/live/yourdomain.com/privkey.pem"
SSL_CERT_PATH="/etc/letsencrypt/live/yourdomain.com/fullchain.pem"
```

**Auto-renewal setup:**

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot automatically installs a cron job for renewal
# Verify it's scheduled:
sudo systemctl status certbot.timer
```

### Option B: Self-Signed Certificate (Development/Testing Only)

```bash
# Create directory for certificates
sudo mkdir -p /etc/ssl/magic-page

# Generate self-signed certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/magic-page/privkey.pem \
  -out /etc/ssl/magic-page/fullchain.pem \
  -subj "/CN=yourdomain.com"

# Update .env.local
SSL_KEY_PATH="/etc/ssl/magic-page/privkey.pem"
SSL_CERT_PATH="/etc/ssl/magic-page/fullchain.pem"
```

---

## Database Setup

```bash
# Start PostgreSQL container
cd /opt/magic-page
docker compose up -d postgres

# Wait for PostgreSQL to initialize
sleep 10

# Create database
docker exec -it botpress_postgres psql -U postgres -c "CREATE DATABASE mp;"

# Verify database exists
docker exec -it botpress_postgres psql -U postgres -c "\l"

# You should see 'mp' in the database list
```

---

## Build & Start Application

### Step 1: Build Next.js Production Bundle

```bash
cd /opt/magic-page

# Build the application
npm run build

# This may take 2-5 minutes
# Look for: "Compiled successfully"
```

### Step 2: Start Docker Services

```bash
# Start all Docker services
docker compose up -d

# Verify services are running
docker compose ps

# Expected output:
# botpress         running
# botpress_postgres running
# botpress_duckling running
```

### Step 3: Start Next.js Server

#### Option A: Using PM2 (Recommended for Production)

```bash
# Install PM2 globally
npm install -g pm2

# Start application with PM2
pm2 start npm --name "magic-page" -- start

# Save PM2 process list
pm2 save

# Configure PM2 to start on boot
pm2 startup
# Follow the instructions shown (copy/paste the sudo command)

# Verify it's running
pm2 status
pm2 logs magic-page
```

#### Option B: Using Systemd Service

Create systemd service file:

```bash
sudo nano /etc/systemd/system/magic-page.service
```

**Service configuration:**

```ini
[Unit]
Description=Magic Page Next.js Application
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/opt/magic-page
Environment="NODE_ENV=production"
ExecStart=/home/YOUR_USERNAME/.nvm/versions/node/v20.x.x/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Replace:**
- `YOUR_USERNAME` with your actual username
- `v20.x.x` with your actual Node.js version (run `node --version`)

**Enable and start service:**

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable magic-page

# Start service
sudo systemctl start magic-page

# Check status
sudo systemctl status magic-page

# View logs
sudo journalctl -u magic-page -f
```

---

## Firewall Configuration

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (IMPORTANT: Do this first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Optional: Allow Botpress UI from specific IP only
sudo ufw allow from YOUR_IP_ADDRESS to any port 3001

# Check firewall status
sudo ufw status verbose
```

---

## Service Management

### PM2 Commands (if using PM2)

```bash
# View all processes
pm2 list

# View logs
pm2 logs magic-page

# Restart application
pm2 restart magic-page

# Stop application
pm2 stop magic-page

# View resource usage
pm2 monit
```

### Systemd Commands (if using systemd)

```bash
# Check status
sudo systemctl status magic-page

# Start service
sudo systemctl start magic-page

# Stop service
sudo systemctl stop magic-page

# Restart service
sudo systemctl restart magic-page

# View logs
sudo journalctl -u magic-page -f
sudo journalctl -u magic-page --since "1 hour ago"
```

### Docker Services

```bash
# View running containers
docker compose ps

# View logs
docker compose logs -f

# Restart a service
docker compose restart botpress

# Stop all services
docker compose down

# Start all services
docker compose up -d

# Rebuild and restart
docker compose up -d --build
```

---

## Monitoring & Logs

### Application Logs

```bash
# PM2 logs
pm2 logs magic-page

# Systemd logs
sudo journalctl -u magic-page -f

# Next.js server logs (if running manually)
tail -f logs/production.log
```

### Docker Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f postgres
docker compose logs -f botpress

# Last 100 lines
docker compose logs --tail=100
```

### Database Logs

```bash
# Connect to database
docker exec -it botpress_postgres psql -U postgres -d mp

# List tables
\dt

# Query visitors
SELECT * FROM visitors ORDER BY created_at DESC LIMIT 10;

# Exit
\q
```

### Disk Space Monitoring

```bash
# Check disk usage
df -h

# Check Docker disk usage
docker system df

# Clean up unused Docker resources
docker system prune -a
```

---

## Troubleshooting

### Issue: Port 443 Already in Use

```bash
# Find process using port 443
sudo lsof -i :443

# Kill the process (replace PID)
sudo kill -9 PID

# Or stop the service
sudo systemctl stop apache2  # If Apache is running
sudo systemctl stop nginx    # If Nginx is running
```

### Issue: SSL Certificate Errors

```bash
# Verify certificate files exist
ls -l /etc/letsencrypt/live/yourdomain.com/

# Check file permissions
sudo chmod 644 /etc/letsencrypt/live/yourdomain.com/fullchain.pem
sudo chmod 600 /etc/letsencrypt/live/yourdomain.com/privkey.pem

# Test SSL configuration
openssl s_client -connect yourdomain.com:443
```

### Issue: Database Connection Refused

```bash
# Check if PostgreSQL is running
docker compose ps postgres

# Check PostgreSQL logs
docker compose logs postgres

# Verify database exists
docker exec -it botpress_postgres psql -U postgres -c "\l"

# Test connection from host
docker exec -it botpress_postgres psql -U postgres -d mp -c "SELECT 1;"
```

### Issue: Botpress Not Connecting

```bash
# Verify environment variables
cat .env.local | grep BOTPRESS

# Check Botpress Cloud status
curl -I https://chat.botpress.cloud

# Test API token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.botpress.cloud/v1/chat/workspaces/YOUR_WORKSPACE_ID
```

### Issue: Out of Memory

```bash
# Check memory usage
free -h

# Check Node.js memory
pm2 monit

# Increase Node.js memory limit
pm2 delete magic-page
pm2 start npm --name "magic-page" --node-args="--max-old-space-size=4096" -- start
pm2 save
```

### Issue: High CPU Usage

```bash
# Check process usage
top
# Press 'P' to sort by CPU

# Check Playwright processes
ps aux | grep chromium

# Limit concurrent Playwright instances
# Edit pages/api/screenshot.js or scraper config
```

---

## Updating the Application

```bash
# Navigate to application directory
cd /opt/magic-page

# Pull latest changes
git pull origin master

# Install any new dependencies
npm install

# Rebuild application
npm run build

# Restart services
pm2 restart magic-page
# OR
sudo systemctl restart magic-page

# Restart Docker services if needed
docker compose restart
```

---

## Backup Strategy

### Database Backups

```bash
# Create backup script
nano ~/backup-magic-page.sh
```

**Backup script:**

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/magic-page"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker exec botpress_postgres pg_dump -U postgres mp > $BACKUP_DIR/db_backup_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/db_backup_$DATE.sql"
```

**Make executable and schedule:**

```bash
chmod +x ~/backup-magic-page.sh

# Add to crontab (daily at 2 AM)
crontab -e

# Add this line:
0 2 * * * /home/YOUR_USERNAME/backup-magic-page.sh
```

---

## Security Hardening

### 1. Secure PostgreSQL

```bash
# Change default password
docker exec -it botpress_postgres psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'NEW_STRONG_PASSWORD';"

# Update .env.local and docker-compose.yml with new password
```

### 2. Restrict Botpress UI Access

```bash
# Only allow access from your IP
sudo ufw delete allow 3001
sudo ufw allow from YOUR_IP to any port 3001
```

### 3. Enable Fail2Ban (SSH Protection)

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 4. Keep System Updated

```bash
# Enable automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## Performance Optimization

### 1. Enable Next.js Compression

Already enabled via `server.js` - no changes needed.

### 2. Configure Nginx as Reverse Proxy (Optional)

For better performance and load balancing:

```bash
sudo apt install -y nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/magic-page
```

**Nginx configuration:**

```nginx
upstream magic_page {
  server localhost:443;
}

server {
  listen 80;
  server_name yourdomain.com;
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name yourdomain.com;

  ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

  location / {
    proxy_pass https://localhost:443;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/magic-page /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## Summary Checklist

### Initial Deployment
- [ ] Ubuntu server provisioned with required specs
- [ ] Domain DNS configured and propagated
- [ ] Node.js, Docker, and Docker Compose installed
- [ ] Repository cloned to `/opt/magic-page`
- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables configured (`.env.local`)
- [ ] SSL certificates generated (Let's Encrypt)
- [ ] Docker services started (`docker compose up -d`)
- [ ] Database created and verified
- [ ] Application built (`npm run build`)
- [ ] Application started (PM2 or systemd)
- [ ] Firewall configured (UFW)
- [ ] Application accessible at https://yourdomain.com

### Production Readiness
- [ ] PM2 or systemd configured for auto-restart
- [ ] Backup strategy implemented
- [ ] Log rotation configured
- [ ] Monitoring setup (optional: Grafana, Prometheus)
- [ ] SSL auto-renewal verified
- [ ] Security hardening applied
- [ ] Performance optimization complete

---

## Support & Resources

- **Repository:** https://github.com/stooky/magicker-page
- **Botpress Docs:** https://botpress.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Docker Docs:** https://docs.docker.com

For issues or questions, check the repository issues page or create a new issue.
