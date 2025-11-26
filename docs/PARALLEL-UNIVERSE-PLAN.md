# Parallel Universe: Concurrency Improvements Plan

## Overview
This plan addresses critical concurrency issues to enable the app to handle multiple simultaneous sessions without data corruption, memory exhaustion, or resource starvation.

---

## Phase 1: Critical Fixes (Must Do First)

### ~~1.1 Fix Global Zapier Response State~~ REMOVED
Zapier integration was removed - no longer using global response state.
Files deleted: `zapier-callback.js`, `zapier-proxy.js`, `get-latest-response.js`, `clear-response.js`, `components/utils/zapier.js`, `app/zapier.js`

---

### 1.1 Implement Playwright Browser Pool
**File:** `lib/scrapers/playwright-scraper.js`

**Problem:** Each scrape launches new Chromium instance (50-100MB each). 10 concurrent requests = 1GB RAM.

**Solution:** Shared browser instance with page pool
```javascript
// lib/browser-pool.js
let browser = null;
let pageCount = 0;
const MAX_PAGES = 5;

export async function getBrowser() {
    if (!browser) {
        browser = await chromium.launch({ headless: true });
    }
    return browser;
}

export async function getPage() {
    if (pageCount >= MAX_PAGES) {
        throw new Error('Browser pool exhausted - try again later');
    }
    const browser = await getBrowser();
    pageCount++;
    const page = await browser.newPage();
    return page;
}

export async function releasePage(page) {
    await page.close();
    pageCount--;
}
```

**Estimated effort:** 2 hours

---

## Phase 2: High Priority Improvements

### 2.1 Create Singleton Clients
**New file:** `lib/clients/index.js`

```javascript
// Botpress singleton
let botpressClient = null;
export function getBotpressClient() {
    if (!botpressClient) {
        const { Client } = require('@botpress/client');
        botpressClient = new Client({
            token: process.env.BOTPRESS_API_TOKEN,
            botId: process.env.BOTPRESS_BOT_ID
        });
    }
    return botpressClient;
}

// OpenAI singleton
let openaiClient = null;
export function getOpenAIClient() {
    if (!openaiClient) {
        const OpenAI = require('openai');
        openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }
    return openaiClient;
}
```

**Files to update:**
- `lib/scrapers/openai-extractor.js` - Use `getOpenAIClient()`
- `pages/api/botpress/kb-create.js` - Use `getBotpressClient()`
- `pages/api/botpress/test-conversation.js` - Use `getBotpressClient()`

**Estimated effort:** 1.5 hours

---

### 2.2 Fix Duplicate Database Pool
**File:** `pages/api/botpress/webhook.js`

**Problem:** Creates its own Pool instead of using shared one.

**Solution:** Import from `components/utils/database.js`
```javascript
// Before
const pool = new Pool({ ... });

// After
const pool = require('../../../components/utils/database');
```

**Estimated effort:** 15 minutes

---

### 2.3 Async File Operations
**File:** `pages/api/botpress/kb-create.js`

**Problem:** `fs.writeFileSync` blocks the event loop.

**Solution:** Use async/await
```javascript
// Before
fs.writeFileSync(localFilePath, fullContent, 'utf8');

// After
await fs.promises.writeFile(localFilePath, fullContent, 'utf8');
```

**Estimated effort:** 15 minutes

---

## Phase 3: Performance Optimizations

### 3.1 Exponential Backoff for Polling
**Files:** `pages/api/botpress/kb-create.js`, `pages/api/botpress/test-conversation.js`

**Problem:** Fixed 1-second polling wastes API calls.

**Solution:**
```javascript
async function waitForIndexing(fileId, maxWaitMs = 30000) {
    let interval = 500;  // Start at 500ms
    const maxInterval = 4000;  // Max 4 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
        const status = await checkStatus(fileId);
        if (status === 'indexing_completed') return true;

        await new Promise(r => setTimeout(r, interval));
        interval = Math.min(interval * 1.5, maxInterval);  // Exponential backoff
    }
    return false;
}
```

**Estimated effort:** 30 minutes

---

### 3.2 Request Queue for Heavy Operations (Optional)
**New file:** `lib/request-queue.js`

For scraping operations that are resource-intensive:
```javascript
import PQueue from 'p-queue';

// Only 3 concurrent scrapes allowed
export const scrapeQueue = new PQueue({ concurrency: 3 });

// Usage in API route:
const result = await scrapeQueue.add(() => scrapeWebsite(url));
```

**Estimated effort:** 1 hour

---

### 3.3 Vendasta Token Caching (Optional)
**File:** `lib/getVendastaAccessToken.js`

**Problem:** Generates new JWT and fetches token for every request.

**Solution:**
```javascript
let cachedToken = null;
let tokenExpiry = 0;

export async function getVendastaAccessToken() {
    // Return cached if still valid (with 1 min buffer)
    if (cachedToken && Date.now() < tokenExpiry - 60000) {
        return cachedToken;
    }

    // Generate new token
    const token = await fetchNewToken();
    cachedToken = token.access_token;
    tokenExpiry = Date.now() + (token.expires_in * 1000);
    return cachedToken;
}
```

**Estimated effort:** 30 minutes

---

## Implementation Order

### Day 1: Critical Fixes
1. [ ] Fix Zapier response state (Phase 1.1)
2. [ ] Implement browser pool (Phase 1.2)

### Day 2: High Priority
3. [ ] Create singleton clients (Phase 2.1)
4. [ ] Fix duplicate DB pool (Phase 2.2)
5. [ ] Async file operations (Phase 2.3)

### Day 3: Polish
6. [ ] Exponential backoff (Phase 3.1)
7. [ ] Request queue (Phase 3.2) - Optional
8. [ ] Vendasta caching (Phase 3.3) - Optional

---

## Testing Plan

### Load Testing
```bash
# Install artillery for load testing
npm install -g artillery

# Create test file
artillery quick --count 10 --num 5 http://localhost:3000/api/scrape-website
```

### Concurrency Test Scenarios
1. **Zapier race condition:** Send 5 simultaneous zapier callbacks with different sessionIDs
2. **Memory exhaustion:** Trigger 10 concurrent Playwright scrapes
3. **Client reuse:** Monitor API rate limits with 20 rapid KB creates

---

## Success Metrics

| Metric | Before | Target |
|--------|--------|--------|
| Concurrent sessions | ~3 before memory issues | 10+ |
| Memory per scrape | 100MB (new browser) | 20MB (shared page) |
| Response data integrity | Race conditions possible | 100% session isolation |
| Client instantiation | Per request | Singleton |

---

## Files Changed Summary

| File | Change Type |
|------|-------------|
| `lib/response-store.js` | **NEW** |
| `lib/browser-pool.js` | **NEW** |
| `lib/clients/index.js` | **NEW** |
| `pages/api/zapier-callback.js` | MODIFY |
| `pages/api/get-latest-response.js` | MODIFY |
| `pages/api/clear-response.js` | MODIFY |
| `lib/scrapers/playwright-scraper.js` | MODIFY |
| `lib/scrapers/openai-extractor.js` | MODIFY |
| `pages/api/botpress/kb-create.js` | MODIFY |
| `pages/api/botpress/webhook.js` | MODIFY |
| `pages/api/botpress/test-conversation.js` | MODIFY |

---

## Rollback Plan

Each phase can be rolled back independently:
- Phase 1.1: Revert to global variable (not recommended)
- Phase 1.2: Revert to browser-per-request
- Phase 2.x: Revert to inline client creation

All changes are backward compatible - no database migrations required.
