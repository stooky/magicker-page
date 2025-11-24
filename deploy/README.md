# Magic Page Deployment

Choose your deployment platform and follow the appropriate guide.

---

## 🚀 Deployment Options

### Ubuntu Server (Production) ✅ RECOMMENDED

**For:** Production deployments, cloud hosting (Vultr, DigitalOcean, AWS, etc.)

**Features:**
- Fully automated setup with bash scripts
- PM2 process management with auto-restart
- Automatic SSL with Let's Encrypt
- Health monitoring and automated backups
- Production-ready out of the box

**→ [Ubuntu Deployment Guide](./ubuntu/README.md)**

---

### Windows Self-Hosted (Development)

**For:** Local development, testing, Windows servers

**Features:**
- PowerShell automation scripts
- Docker Desktop integration
- Great for development workflow
- Run on your own hardware

**→ [Windows Deployment Guide](./windows/README.md)**

---

## 📂 Directory Structure

```
deploy/
├── README.md                 # This file - deployment options
├── DEPLOYMENT_GUIDE.md       # Detailed comparison and decision guide
├── ENVIRONMENT_SETUP.md      # Environment variables reference (both platforms)
│
├── ubuntu/                   # Ubuntu Server deployment
│   ├── README.md             # Complete Ubuntu setup guide
│   ├── TESTING_GUIDE.md      # Detailed testing procedure
│   ├── QUICK_CHECKLIST.md    # One-page printable checklist
│   ├── setup-ubuntu.sh       # Initial server setup script
│   ├── install-app.sh        # Application installation script
│   ├── start-production.sh   # Start all services
│   ├── backup-database.sh    # Database backup script
│   ├── health-check.sh       # Service health monitoring
│   └── test-deployment.sh    # Deployment verification
│
└── windows/                  # Windows self-hosted
    ├── README.md             # Complete Windows setup guide
    └── QUICK_START.md        # Quick start checklist
```

---

## 🎯 Quick Decision Guide

**Choose Ubuntu if:**
- ✅ You need production deployment
- ✅ You want fully automated setup
- ✅ You need public internet access
- ✅ Budget: $12-24/month is okay

**Choose Windows if:**
- ✅ You're developing/testing
- ✅ You want to use existing Windows hardware
- ✅ You need local-only or internal access
- ✅ Budget: Free (use own hardware)

**Not sure?** Read the detailed comparison: [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)

---

## 📚 Additional Resources

- **Environment Variables:** `ENVIRONMENT_SETUP.md` (applies to both platforms)
- **Docker Configuration:** `../docker-compose.yml`
- **Database Setup:** `../DATABASE_SETUP.md`
- **Botpress Integration:** `../BOTPRESS_MIGRATION.md`
- **Main README:** `../README.md`

---

## 🚀 Quick Start

### Ubuntu

```bash
wget https://raw.githubusercontent.com/stooky/magicker-page/master/deploy/ubuntu/setup-ubuntu.sh
bash setup-ubuntu.sh
```

### Windows

```powershell
git clone https://github.com/stooky/magicker-page.git
cd magicker-page
.\setup-windows.ps1
```

---

## 💡 Recommended Workflow

**Best practice:** Develop on Windows, deploy to Ubuntu

1. **Development:** Use Windows setup for local development and testing
2. **Production:** Deploy to Ubuntu server for public/production use
3. **Iterate:** Test locally on Windows, push to Ubuntu when ready

This gives you the best of both worlds!

---

## 🆘 Getting Help

- **Ubuntu issues:** See `ubuntu/README.md` troubleshooting section
- **Windows issues:** See `windows/README.md` troubleshooting section
- **Environment variables:** Check `ENVIRONMENT_SETUP.md`
- **GitHub Issues:** https://github.com/stooky/magicker-page/issues

---

**Choose your platform above and get started!** 🎉
