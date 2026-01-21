# Production Rollback Reference

## Last Known Working State

| Field | Value |
|-------|-------|
| **Commit Hash** | `b816e16ae2ed683ae04841af7633d06decd17bb5` |
| **Short Hash** | `b816e16` |
| **Date** | 2025-11-26 08:19:09 -0600 |
| **Message** | Replace webchat loading overlay with megaman GIF |
| **Branch** | master |
| **Server** | mb.membies.com |
| **Verified Working** | 2026-01-21 |

## Emergency Rollback Procedure

If a deployment breaks the site, run these commands:

```bash
# SSH into server
ssh -i ~/.ssh/id_wiki root@mb.membies.com

# Navigate to app directory
cd ~/magicker-page

# Rollback to last known working commit
git fetch origin
git checkout b816e16ae2ed683ae04841af7633d06decd17bb5

# Restart the application
source ~/.nvm/nvm.sh
pm2 restart magic-page

# Verify it's running
pm2 status
curl -I http://localhost:3000
```

## Rollback to Any Previous Commit

```bash
# List recent commits
git log --oneline -20

# Checkout specific commit
git checkout <commit-hash>

# Restart
source ~/.nvm/nvm.sh
pm2 restart magic-page
```

## Return to Latest After Rollback

```bash
git checkout master
git pull origin master
pm2 restart magic-page
```

## Server Architecture

```
Internet (80/443)
    ↓
Nginx (SSL via Let's Encrypt)
    ↓
PM2 → Next.js (port 3000)
    ↓
Docker Services:
  - postgres (port 5433)
  - botpress (port 3001)
  - duckling (port 8000)
```

## Important Paths

- **App Directory**: `/root/magicker-page`
- **PM2 Logs**: `/root/.pm2/logs/magic-page-*.log`
- **Nginx Config**: `/etc/nginx/sites-enabled/mb.membies.com`
- **SSL Certs**: `/etc/letsencrypt/live/mb.membies.com/`

## Useful Commands

```bash
# Check app status
pm2 status

# View logs
pm2 logs magic-page --lines 50

# Check nginx
nginx -t && systemctl status nginx

# Check docker services
docker compose ps
```
