# Magic Page Deployment Guide

Choose your deployment path based on your hosting environment.

---

## 🚀 Deployment Options

### Option 1: Ubuntu Server (Cloud/VPS) - **RECOMMENDED FOR PRODUCTION**

**Best for:** Production deployments, cloud hosting, scalability

**Platforms:**
- Vultr
- DigitalOcean
- AWS EC2
- Linode
- Any Ubuntu 20.04/22.04 LTS server

**Characteristics:**
- ✅ Production-ready with PM2 process management
- ✅ Automatic SSL with Let's Encrypt
- ✅ Runs on ports 80/443 (standard HTTP/HTTPS)
- ✅ Firewall configured (UFW)
- ✅ Automated backups and monitoring
- ✅ Scalable and performant
- ✅ **Fully documented with automation scripts**

**Time to deploy:** 45-60 minutes (first time)

**Monthly cost:** $12-24/month (Vultr 2 vCPU / 4GB RAM)

➡️ **[Go to Ubuntu Deployment Guide](./deploy/ubuntu/README.md)**

---

### Option 2: Windows Self-Hosted (Local/Development)

**Best for:** Development, testing, local hosting, Windows servers

**Platforms:**
- Windows 10/11 (local development)
- Windows Server 2019/2022
- Personal computer hosting

**Characteristics:**
- ✅ Run on your own Windows machine
- ✅ Development-focused workflow
- ✅ Docker Desktop integration
- ✅ PowerShell automation scripts
- ✅ Great for testing before production
- ⚠️ Requires port forwarding for external access
- ⚠️ Self-signed certificates (or manual Let's Encrypt setup)

**Time to deploy:** 30-45 minutes

**Cost:** Free (use your own hardware)

➡️ **[Go to Windows Self-Hosted Guide](./deploy/windows/README.md)**

---

## 📊 Quick Comparison

| Feature | Ubuntu Server | Windows Self-Hosted |
|---------|---------------|---------------------|
| **Difficulty** | Easy (automated) | Medium (manual steps) |
| **Use Case** | Production | Development/Testing |
| **SSL** | Auto (Let's Encrypt) | Manual or self-signed |
| **Process Management** | PM2 (auto-restart) | Manual or Task Scheduler |
| **Ports** | 80, 443 (standard) | 3000 or custom |
| **Public Access** | Native | Port forwarding needed |
| **Backups** | Automated scripts | Manual |
| **Monitoring** | Health checks included | Manual |
| **Cost** | $12-24/month | Free (own hardware) |
| **Scalability** | Easy (upgrade VPS) | Limited (hardware) |
| **Documentation** | Complete | Complete |

---

## 🎯 Which Should You Choose?

### Choose Ubuntu Server if:
- ✅ You need production-ready deployment
- ✅ You want public internet access
- ✅ You need reliability and uptime
- ✅ You want automated management
- ✅ You're okay with $12-24/month cost
- ✅ **You want the easiest path (fully automated)**

### Choose Windows Self-Hosted if:
- ✅ You're developing/testing before production
- ✅ You want to run on existing Windows hardware
- ✅ You need local-only access (or can do port forwarding)
- ✅ You prefer Windows environment
- ✅ Cost is a concern (use own hardware)
- ✅ You're comfortable with manual configuration

---

## 📂 Repository Structure

```
magic-page/
├── deploy/
│   ├── ubuntu/              # Ubuntu deployment (Vultr, DigitalOcean, etc.)
│   │   ├── README.md        # Ubuntu setup guide
│   │   ├── TESTING_GUIDE.md # Detailed testing procedure
│   │   ├── QUICK_CHECKLIST.md # One-page checklist
│   │   ├── setup-ubuntu.sh  # Initial server setup
│   │   ├── install-app.sh   # App installation
│   │   ├── start-production.sh
│   │   ├── backup-database.sh
│   │   ├── health-check.sh
│   │   └── test-deployment.sh
│   │
│   ├── windows/             # Windows self-hosted
│   │   ├── README.md        # Windows setup guide
│   │   ├── QUICK_START.md   # Quick start checklist
│   │   └── (PowerShell scripts in root)
│   │
│   ├── ENVIRONMENT_SETUP.md # Environment variables (both platforms)
│   └── DEPLOYMENT_GUIDE.md  # This file
│
├── setup-windows.ps1        # Windows setup script
├── start-dev.ps1            # Windows dev server
├── kill-dev-servers.ps1     # Windows cleanup
├── view-logs.ps1            # Windows log viewer
├── docker-compose.yml       # Docker services (both platforms)
└── server.js                # Production HTTPS server
```

---

## 🚀 Quick Start

### Ubuntu Server (Production)

```bash
# On Ubuntu server
wget https://raw.githubusercontent.com/stooky/magicker-page/master/deploy/ubuntu/setup-ubuntu.sh
bash setup-ubuntu.sh
# Follow the guide: deploy/ubuntu/README.md
```

### Windows Self-Hosted (Development)

```powershell
# In PowerShell (as Administrator)
git clone https://github.com/stooky/magicker-page.git
cd magicker-page
.\setup-windows.ps1
# Follow the guide: deploy/windows/README.md
```

---

## 📚 Additional Resources

### Both Platforms
- **Environment Variables Guide:** `deploy/ENVIRONMENT_SETUP.md`
- **Docker Configuration:** `docker-compose.yml`
- **Database Setup:** `DATABASE_SETUP.md`
- **Botpress Migration:** `BOTPRESS_MIGRATION.md`

### Ubuntu Specific
- **Complete Deployment Guide:** `deploy/ubuntu/README.md` (was `UBUNTU_DEPLOYMENT.md`)
- **Testing Guide:** `deploy/ubuntu/TESTING_GUIDE.md`
- **Quick Checklist:** `deploy/ubuntu/QUICK_CHECKLIST.md`
- **All automation scripts:** `deploy/ubuntu/*.sh`

### Windows Specific
- **Windows Setup Guide:** `deploy/windows/README.md` (NEW)
- **Quick Start:** `deploy/windows/QUICK_START.md` (NEW)
- **PowerShell scripts:** Root directory `*.ps1`

---

## 🔄 Hybrid Approach

**Best practice workflow:**

1. **Develop on Windows:**
   - Use Windows self-hosted setup for development
   - Test features locally
   - Iterate quickly

2. **Deploy to Ubuntu for Production:**
   - Once tested, deploy to Ubuntu server
   - Use automation scripts for reliability
   - Enjoy production features (PM2, backups, monitoring)

This gives you the best of both worlds!

---

## 💡 Need Help?

**For Ubuntu deployment:**
- See: `deploy/ubuntu/README.md`
- Issues: Typically DNS, SSL, or API key related
- Fully automated with health checks

**For Windows deployment:**
- See: `deploy/windows/README.md`
- Issues: Typically Docker Desktop or port conflicts
- More manual but runs on existing hardware

**General support:**
- GitHub Issues: https://github.com/stooky/magicker-page/issues
- Check environment variables: `deploy/ENVIRONMENT_SETUP.md`

---

## 🎉 Ready to Deploy?

Pick your path and follow the guide:

**For Production:** → `deploy/ubuntu/README.md`

**For Development:** → `deploy/windows/README.md`

Both paths are fully documented and tested!
