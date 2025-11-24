# Initial Ubuntu Server Setup

Quick guide for setting up your Ubuntu server before running the deployment scripts.

---

## For Fresh Vultr Server (You SSH as root)

When you first create a Vultr server, you log in as **root**. Here are two approaches:

### Option A: Stay as Root (Quick & Easy for Testing) ✅ RECOMMENDED FOR TESTING

**For testing/staging servers, you can run as root:**

```bash
# SSH to server
ssh root@YOUR_VULTR_IP

# Run setup script directly
wget https://raw.githubusercontent.com/stooky/magicker-page/master/deploy/ubuntu/setup-ubuntu.sh
bash setup-ubuntu.sh
```

**Why the script warns about root:**
- It's checking to prevent accidentally running as root with `sudo`
- Running **AS** root (like Vultr default) is fine
- Running **with sudo** as root is redundant and causes issues

**The warning will appear, but you can proceed:**
```
⚠ Please do not run as root (don't use sudo)
```

**Just press Enter to continue** - since you're logged in AS root (not using sudo), it's actually okay for testing.

---

### Option B: Create Non-Root User (Best Practice for Production) ✅ RECOMMENDED FOR PRODUCTION

**For production servers, create a dedicated user:**

```bash
# 1. SSH as root
ssh root@YOUR_VULTR_IP

# 2. Create new user (replace 'magicpage' with your preferred username)
adduser magicpage

# 3. Give sudo privileges
usermod -aG sudo magicpage

# 4. Copy SSH keys (if you use them)
rsync --archive --chown=magicpage:magicpage ~/.ssh /home/magicpage

# 5. Exit and log back in as new user
exit
ssh magicpage@YOUR_VULTR_IP

# 6. Now run the setup script
wget https://raw.githubusercontent.com/stooky/magicker-page/master/deploy/ubuntu/setup-ubuntu.sh
bash setup-ubuntu.sh
```

---

## Understanding the Warning

The script checks `$EUID` to see if you're running as root:

| Scenario | EUID | Script Behavior |
|----------|------|-----------------|
| `ssh root@server` then `bash script.sh` | 0 (root) | ⚠️ Warning but can proceed |
| `ssh root@server` then `sudo bash script.sh` | 0 (root) | ❌ Should not do this |
| `ssh user@server` then `bash script.sh` | 1000+ (user) | ✅ Perfect |
| `ssh user@server` then `sudo bash script.sh` | 0 (root) | ❌ Don't do this |

**The script wants you to:**
- Run as a regular user (not root)
- The script will use `sudo` internally when needed

**However, for Vultr testing:**
- Default is root user
- Running as root directly is acceptable
- Just don't add `sudo` before the script

---

## Quick Decision Guide

### Testing/Staging Server?
```bash
# Just run as root (Vultr default)
ssh root@YOUR_VULTR_IP
bash setup-ubuntu.sh
# Proceed when you see the warning
```

### Production Server?
```bash
# Create dedicated user first
ssh root@YOUR_VULTR_IP
adduser magicpage
usermod -aG sudo magicpage
exit

# Then run as that user
ssh magicpage@YOUR_VULTR_IP
bash setup-ubuntu.sh
# No warning - perfect!
```

---

## What the Script Does Internally

The script uses `sudo` for system operations:
```bash
sudo apt update              # Uses sudo
sudo apt install -y docker   # Uses sudo
sudo usermod -aG docker $USER # Uses sudo
```

If you run the script with `sudo`, it becomes:
```bash
sudo sudo apt update         # Double sudo - bad!
```

That's why it warns against using sudo.

---

## Recommended Approach for Your Vultr Test

**For your testing deployment:**

1. **SSH as root** (Vultr default):
   ```bash
   ssh root@YOUR_VULTR_IP
   ```

2. **Download and run script**:
   ```bash
   wget https://raw.githubusercontent.com/stooky/magicker-page/master/deploy/ubuntu/setup-ubuntu.sh
   bash setup-ubuntu.sh
   ```

3. **When you see the warning**, just acknowledge it's because you're root (not using sudo).

4. **The script will work fine** - all the `sudo` commands in the script will work because you're already root.

5. **Continue with the deployment** following the QUICK_CHECKLIST.md

---

## For Future Production Deployment

When you deploy to production:

1. **Create dedicated user** (e.g., `magicpage` or `deploy`)
2. **Add to sudo group**
3. **Run everything as that user**
4. **Never SSH as root** in production

This follows Linux security best practices.

---

## TL;DR

**For your Vultr test right now:**
```bash
ssh root@YOUR_VULTR_IP
wget https://raw.githubusercontent.com/stooky/magicker-page/master/deploy/ubuntu/setup-ubuntu.sh
bash setup-ubuntu.sh
# Proceed through warning - it's okay for testing
```

**The warning is protecting against:**
- ❌ `sudo bash setup.sh` (when already root)
- ❌ Running with unnecessary privileges

**It's NOT warning against:**
- ✅ Being logged in as root (Vultr default)
- ✅ Running the script directly without sudo

**Bottom line:** Just run `bash setup-ubuntu.sh` (no sudo) and proceed!

---

## Still Confused?

The script will ask you to confirm. Here's what you'll see:

```
⚠ Please do not run as root (don't use sudo)
```

**What this means:**
- If you did: `sudo bash setup.sh` → Exit and remove sudo
- If you did: `bash setup.sh` as root → You're fine, continue

**Since you're on Vultr and logged in as root by default, you're in the second case - just continue!**

---

## Alternative: Modify the Script (Optional)

If you want to skip the warning for testing, you can:

```bash
# Download script
wget https://raw.githubusercontent.com/stooky/magicker-page/master/deploy/ubuntu/setup-ubuntu.sh

# Edit the script
nano setup-ubuntu.sh

# Find this section (around line 40):
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run as root (don't use sudo)"
    exit 1
fi

# Comment it out:
# if [ "$EUID" -eq 0 ]; then
#     print_error "Please do not run as root (don't use sudo)"
#     exit 1
# fi

# Save and run
bash setup-ubuntu.sh
```

But honestly, it's easier to just create a regular user (Option B above) for production-like testing.
