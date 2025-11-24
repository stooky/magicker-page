# Environment Variables Setup Guide

Complete reference for configuring `.env.local` for Magic Page deployment.

## Quick Setup

```bash
# Copy template
cp .env.local.sample .env.local

# Edit with your values
nano .env.local
```

---

## Required Variables

### Domain Configuration

```env
DOMAIN=yourdomain.com
NEXT_PUBLIC_DOMAIN=yourdomain.com
```

**Description:** Your application's domain name.

**Examples:**
- `membersolutions.com`
- `app.membersolutions.com`

**Notes:**
- Must match SSL certificate domain
- Used for CORS and redirect URLs

---

### SSL/TLS Certificates

```env
SSL_KEY_PATH="/etc/letsencrypt/live/yourdomain.com/privkey.pem"
SSL_CERT_PATH="/etc/letsencrypt/live/yourdomain.com/fullchain.pem"
```

**Description:** Paths to SSL certificate files for HTTPS.

**Let's Encrypt paths:**
```env
SSL_KEY_PATH="/etc/letsencrypt/live/yourdomain.com/privkey.pem"
SSL_CERT_PATH="/etc/letsencrypt/live/yourdomain.com/fullchain.pem"
```

**Self-signed paths:**
```env
SSL_KEY_PATH="/etc/ssl/magic-page/privkey.pem"
SSL_CERT_PATH="/etc/ssl/magic-page/fullchain.pem"
```

**Generate Let's Encrypt certificate:**
```bash
sudo certbot certonly --standalone -d yourdomain.com
```

---

### PostgreSQL Database

```env
DB_USER=postgres
DB_HOST=localhost
DB_PASSWORD=your_secure_password_here
DB=mp
DB_PORT=5433
```

**Description:** PostgreSQL connection settings.

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_USER` | Database username | `postgres` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PASSWORD` | Database password | `MySecurePass123!` |
| `DB` | Database name | `mp` |
| `DB_PORT` | Database port | `5433` |

**Important:**
- Port `5433` avoids conflicts with system PostgreSQL (5432)
- Password must match `docker-compose.yml` setting
- Use strong password (16+ chars, mixed case, numbers, symbols)

**Generate secure password:**
```bash
openssl rand -base64 32
```

---

### Botpress Cloud Integration

```env
BOTPRESS_SERVER_URL=https://chat.botpress.cloud
BOTPRESS_BOT_ID=your-bot-id-here
BOTPRESS_CLIENT_ID=your-workspace-id-here
BOTPRESS_WEBHOOK_SECRET=random-secret-string
BOTPRESS_API_TOKEN=bp_pat_your-token-here
JWT_SECRET=random-jwt-secret

# Public variables (exposed to browser)
NEXT_PUBLIC_BOTPRESS_BOT_ID=your-bot-id-here
NEXT_PUBLIC_BOTPRESS_CLIENT_ID=your-workspace-id-here
```

**Where to find these values:**

1. **BOTPRESS_BOT_ID & NEXT_PUBLIC_BOTPRESS_BOT_ID**
   - Go to: https://studio.botpress.cloud
   - Open your bot
   - Settings → Bot ID
   - Format: `bot_abc123...`

2. **BOTPRESS_CLIENT_ID & NEXT_PUBLIC_BOTPRESS_CLIENT_ID**
   - Botpress Studio → Workspace Settings
   - Workspace ID
   - Format: `ws_xyz789...` or UUID

3. **BOTPRESS_API_TOKEN**
   - Botpress Studio → Profile (top right)
   - Personal Access Tokens
   - Create new token
   - Format: `bp_pat_abc123...`

4. **BOTPRESS_WEBHOOK_SECRET**
   - Generate random string:
   ```bash
   openssl rand -hex 32
   ```

5. **JWT_SECRET**
   - Generate random string:
   ```bash
   openssl rand -hex 64
   ```

**Notes:**
- `NEXT_PUBLIC_*` variables are exposed to browser (client-side)
- Keep `BOTPRESS_API_TOKEN` secret (server-side only)

---

### Screenshot API

```env
SCREENSHOTAPI_TOKEN=your-api-token-here
```

**Description:** API token from screenshotapi.net for website screenshots.

**How to get:**
1. Sign up at https://screenshotapi.net
2. Get API token from dashboard
3. Format: Usually alphanumeric string

**Pricing:**
- Free tier available
- Check limits for production usage

---

### OpenAI (Snippet Extraction)

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini
USE_OPENAI_EXTRACTION=true
```

**Description:** OpenAI API for intelligent snippet extraction from scraped content.

**How to get:**
1. Sign up at https://platform.openai.com
2. Go to API Keys section
3. Create new secret key
4. Format: `sk-proj-...` or `sk-...`

**Recommended models:**
- `gpt-4o-mini` - Fast, cost-effective (recommended)
- `gpt-4o` - More accurate, higher cost
- `gpt-3.5-turbo` - Budget option

**Cost considerations:**
- `gpt-4o-mini`: ~$0.15 per 1M input tokens
- `gpt-4o`: ~$2.50 per 1M input tokens

**Disable OpenAI (use basic extraction):**
```env
USE_OPENAI_EXTRACTION=false
```

---

### PeopleDataLabs (Company Enrichment)

```env
NEXT_PUBLIC_PDL_API_KEY=your-pdl-api-key-here
NEXT_PUBLIC_PDL_API_URL=https://api.peopledatalabs.com/v5/company/enrich
```

**Description:** PeopleDataLabs API for company name lookup and enrichment.

**How to get:**
1. Sign up at https://www.peopledatalabs.com
2. Get API key from dashboard
3. Format: Alphanumeric string

**Notes:**
- Used to enrich company data from domain names
- Free tier available
- Exposed to browser (`NEXT_PUBLIC_`)

---

### Vendasta Integration (Optional)

```env
ENV=prod
WEBHOOK=http://automations.businessapp.io/start/PID/automation_id
VENDASTA_PARTNER_ID=your-partner-id
VENDASTA_PRIVATE_KEY_ID=your-service-account-id
VENDASTA_CLIENT_EMAIL=your-service-account-email
VENDASTA_TOKEN_URI=https://sso-api-prod.apigateway.co/oauth2/token
VENDASTA_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END RSA PRIVATE KEY-----\n
```

**Description:** Vendasta CRM integration (if using).

**Notes:**
- Only required if integrating with Vendasta
- Contact Vendasta for service account credentials
- Private key should include `\n` for line breaks

---

### Bypass Mode (Development/Testing)

```env
BYPASS_MODE=OFF
VENDASTA_BUSINESS_ID=your-account-id
BYPASS_WEBHOOK=http://automations.businessapp.io/start/PID/automation_id
MY_LISTING_DEFAULT="https://sales.vendasta.com/vendasta-example/"
```

**Description:** Testing mode to bypass account creation.

**Values:**
- `OFF` - Normal operation (production)
- `ON` - Bypass mode enabled (development)

**Notes:**
- Only use in development
- Set to `OFF` for production

---

### Snippet Display Settings

```env
SNIPPET_SHOW=5
```

**Description:** Number of snippets to show before transitioning to chatbot.

**Values:**
- `1` to `10` - Number of snippets to display
- Recommended: `5`

---

## Complete Example Configuration

### Production Environment

```env
# ==========================================
# Domain & SSL
# ==========================================
DOMAIN=membersolutions.com
NEXT_PUBLIC_DOMAIN=membersolutions.com
SSL_KEY_PATH="/etc/letsencrypt/live/membersolutions.com/privkey.pem"
SSL_CERT_PATH="/etc/letsencrypt/live/membersolutions.com/fullchain.pem"

# ==========================================
# Database
# ==========================================
DB_USER=postgres
DB_HOST=localhost
DB_PASSWORD=YourVerySecurePassword123!@#
DB=mp
DB_PORT=5433

# ==========================================
# Botpress Cloud
# ==========================================
BOTPRESS_SERVER_URL=https://chat.botpress.cloud
BOTPRESS_BOT_ID=bot_abc123xyz789
BOTPRESS_CLIENT_ID=ws_workspace123
BOTPRESS_WEBHOOK_SECRET=a1b2c3d4e5f6789012345678901234567890abcdef
BOTPRESS_API_TOKEN=bp_pat_YourRealTokenHere123
JWT_SECRET=your-very-long-random-jwt-secret-here-at-least-64-characters-long

# Public Botpress (must match above)
NEXT_PUBLIC_BOTPRESS_BOT_ID=bot_abc123xyz789
NEXT_PUBLIC_BOTPRESS_CLIENT_ID=ws_workspace123

# ==========================================
# API Keys
# ==========================================
SCREENSHOTAPI_TOKEN=your-screenshot-api-token
OPENAI_API_KEY=sk-proj-YourOpenAIKeyHere
OPENAI_MODEL=gpt-4o-mini
USE_OPENAI_EXTRACTION=true
NEXT_PUBLIC_PDL_API_KEY=your-pdl-api-key

# ==========================================
# Optional Settings
# ==========================================
SNIPPET_SHOW=5
BYPASS_MODE=OFF
ENV=prod
```

### Development Environment

```env
# Same as production, but:
DOMAIN=localhost
NEXT_PUBLIC_DOMAIN=localhost
BYPASS_MODE=ON
ENV=dev

# Use self-signed SSL for local development
SSL_KEY_PATH="/etc/ssl/magic-page/privkey.pem"
SSL_CERT_PATH="/etc/ssl/magic-page/fullchain.pem"
```

---

## Validation Checklist

Before deploying, verify:

### Required Variables
- [ ] `DOMAIN` and `NEXT_PUBLIC_DOMAIN` set to your domain
- [ ] `SSL_CERT_PATH` and `SSL_KEY_PATH` point to valid certificate files
- [ ] `DB_PASSWORD` is strong and matches `docker-compose.yml`
- [ ] `BOTPRESS_BOT_ID`, `BOTPRESS_CLIENT_ID`, `BOTPRESS_API_TOKEN` configured
- [ ] `JWT_SECRET` and `BOTPRESS_WEBHOOK_SECRET` are random and secure
- [ ] `SCREENSHOTAPI_TOKEN` is valid
- [ ] `OPENAI_API_KEY` is valid (if using OpenAI extraction)

### API Keys Work
```bash
# Test Botpress connection
curl -H "Authorization: Bearer $BOTPRESS_API_TOKEN" \
  https://api.botpress.cloud/v1/chat/workspaces/$BOTPRESS_CLIENT_ID

# Test OpenAI
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Test PDL
curl "https://api.peopledatalabs.com/v5/company/enrich?website=google.com" \
  -H "X-Api-Key: $NEXT_PUBLIC_PDL_API_KEY"
```

### Security
- [ ] Database password is NOT default (`botpress_password`)
- [ ] JWT_SECRET is random (not example value)
- [ ] BOTPRESS_WEBHOOK_SECRET is random
- [ ] OPENAI_API_KEY is kept secret (not committed to git)
- [ ] `.env.local` is in `.gitignore`

---

## Security Best Practices

### 1. Generate Strong Secrets

```bash
# Generate random secrets
openssl rand -hex 32  # For WEBHOOK_SECRET
openssl rand -hex 64  # For JWT_SECRET
openssl rand -base64 32  # For DB_PASSWORD
```

### 2. Protect API Keys

```bash
# Set restrictive permissions
chmod 600 .env.local

# Verify not tracked by git
git check-ignore .env.local
# Should output: .env.local
```

### 3. Rotate Secrets Regularly

- Rotate database password every 90 days
- Rotate API tokens every 180 days
- Regenerate JWT_SECRET on security incidents

### 4. Use Environment-Specific Files

```bash
# Development
.env.local

# Production
.env.production.local

# Never commit these files!
```

---

## Troubleshooting

### Variable Not Loading

**Issue:** Environment variable not recognized.

**Solutions:**
1. Check file name is exactly `.env.local`
2. Verify no typos in variable names
3. Restart application after changes
4. Check for syntax errors (no spaces around `=`)

### HTTPS Certificate Errors

**Issue:** SSL certificate not found or invalid.

**Solutions:**
```bash
# Verify certificate exists
ls -l /etc/letsencrypt/live/yourdomain.com/

# Check certificate validity
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -noout -text

# Test SSL connection
openssl s_client -connect yourdomain.com:443
```

### Database Connection Failed

**Issue:** Cannot connect to PostgreSQL.

**Solutions:**
1. Verify PostgreSQL is running:
   ```bash
   docker compose ps postgres
   ```

2. Check password matches in both files:
   ```bash
   grep DB_PASSWORD .env.local
   grep POSTGRES_PASSWORD docker-compose.yml
   ```

3. Test connection:
   ```bash
   docker exec -it botpress_postgres psql -U postgres -d mp -c "SELECT 1;"
   ```

### Botpress API Errors

**Issue:** Bot not responding or API errors.

**Solutions:**
1. Verify bot is published in Botpress Studio
2. Check API token is valid and not expired
3. Verify workspace ID matches your workspace
4. Test API token:
   ```bash
   curl -H "Authorization: Bearer $BOTPRESS_API_TOKEN" \
     https://api.botpress.cloud/v1/chat/workspaces/$BOTPRESS_CLIENT_ID
   ```

---

## Migration from Development to Production

### 1. Copy Template

```bash
cp .env.local .env.production.local
```

### 2. Update These Variables

```env
# Change domain
DOMAIN=yourdomain.com
NEXT_PUBLIC_DOMAIN=yourdomain.com

# Update SSL paths
SSL_KEY_PATH="/etc/letsencrypt/live/yourdomain.com/privkey.pem"
SSL_CERT_PATH="/etc/letsencrypt/live/yourdomain.com/fullchain.pem"

# Disable bypass mode
BYPASS_MODE=OFF

# Set production environment
ENV=prod

# Generate new secrets (don't reuse dev secrets)
JWT_SECRET=new-production-secret
BOTPRESS_WEBHOOK_SECRET=new-production-secret
DB_PASSWORD=new-production-password
```

### 3. Verify All API Keys

Test each API key in production environment before going live.

---

## Quick Reference

**Required for basic functionality:**
```
DOMAIN, SSL paths, Database config, Botpress config
```

**Required for full features:**
```
+ SCREENSHOTAPI_TOKEN, OPENAI_API_KEY, PDL_API_KEY
```

**Optional:**
```
Vendasta integration, Bypass mode settings
```

---

## Support

- **Environment template:** `.env.local.sample`
- **Deployment guide:** `UBUNTU_DEPLOYMENT.md`
- **Docker config:** `docker-compose.yml`
- **Issues:** https://github.com/stooky/magicker-page/issues
