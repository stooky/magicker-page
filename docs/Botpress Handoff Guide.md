# Botpress Handoff Guide

A comprehensive technical guide to how Magic Page integrates with Botpress Cloud, including data flow, context passing, error handling, and debugging.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Flow](#architecture-flow)
3. [Environment Variables](#environment-variables)
4. [Phase 1: Website Scraping](#phase-1-website-scraping)
5. [Phase 2: Knowledge Base Creation](#phase-2-knowledge-base-creation)
6. [Phase 3: JWT Token Generation](#phase-3-jwt-token-generation)
7. [Phase 4: Webchat Preloading](#phase-4-webchat-preloading)
8. [Phase 5: Webchat Initialization (Valhallah)](#phase-5-webchat-initialization-valhallah)
9. [Phase 6: Context Passing Methods](#phase-6-context-passing-methods)
10. [Phase 7: Botpress Studio Configuration](#phase-7-botpress-studio-configuration)
11. [Error Handling](#error-handling)
12. [Debugging](#debugging)
13. [Troubleshooting](#troubleshooting)

---

## Overview

Magic Page creates a personalized AI chatbot for any website by:

1. Scraping the website content
2. Creating a Knowledge Base file in Botpress Cloud with domain tags
3. Initializing the Botpress webchat with dynamic theming
4. Passing the domain context to the bot so it searches the correct KB
5. The bot responds using content from that specific website's KB

### Key Challenge Solved

Botpress Cloud hosts a single bot, but we need it to respond differently based on which website the user came from. We solve this by:
- Tagging KB files with domain names
- Passing the domain to the bot via `user.data`
- Using Execute Code in Botpress to search the correct KB based on domain

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER JOURNEY                                   │
└─────────────────────────────────────────────────────────────────────────┘

[1. Form Submit]
      │
      ▼
[2. Screenshot Capture] ──────► [2a. Thumbnail Analysis]
      │                              (OpenAI Vision)
      ▼                                    │
[3. Website Scraping]                      │
      │                                    │
      ▼                                    ▼
[4. KB Creation] ◄────────────────── [Theme Generated]
   (Botpress API)                     (name, colors)
      │
      ▼
[5. Wait for Indexing]
   (polls until ready)
      │
      ▼
[6. JWT Generation]
   (domain in payload)
      │
      ▼
[7. Webchat Preload] ◄─────────── [Theme Applied]
   (during scanning phase)
      │
      ▼
[8. Transition to Chat Screen]
      │
      ▼
[9. Valhallah: updateUser()]
   (sets user.data.domain)
      │
      ▼
[10. Valhallah: open()]
   (starts conversation)
      │
      ▼
[11. Valhallah: sendMessage()]
   (clean greeting)
      │
      ▼
[12. Botpress Execute Code]
   (reads user.data.domain)
      │
      ▼
[13. KB Search by Domain Tag]
      │
      ▼
[14. AI Response with KB Context]
```

---

## Environment Variables

### Required in `.env.local`:

```bash
# Botpress Cloud Configuration
BOTPRESS_API_TOKEN=bp_pat_xxxxx          # Personal Access Token from Botpress
BOTPRESS_BOT_ID=3809961f-xxxx-xxxx       # Bot ID from Botpress Dashboard
BOTPRESS_CLIENT_ID=f4011114-xxxx-xxxx    # Workspace ID (also called Client ID)

# JWT for authentication (optional if not using JWT auth)
JWT_SECRET=your-secret-key-here

# Screenshot API (for thumbnail capture)
SCREENSHOTAPI_TOKEN=xxxxx

# OpenAI (for thumbnail analysis)
OPENAI_API_KEY=sk-xxxxx
```

### Finding Your Botpress Credentials:

1. **BOTPRESS_API_TOKEN**: Botpress Dashboard → Settings → Personal Access Tokens
2. **BOTPRESS_BOT_ID**: Botpress Dashboard → Your Bot → URL contains the bot ID
3. **BOTPRESS_CLIENT_ID**: Botpress Dashboard → Settings → Workspace ID

---

## Phase 1: Website Scraping

**File:** `pages/api/scrape-website.js`

### What Happens:
1. User submits email and website URL
2. Playwright scrapes the website (multiple pages)
3. OpenAI extracts key snippets for display
4. Full content is prepared for KB creation

### Data Produced:
```javascript
{
  message: "1. Company overview...\n2. Services...",  // Display snippets
  fullContent: "Full scraped text content...",        // For KB
  pages_found: 5,
  method_used: "playwright"
}
```

---

## Phase 2: Knowledge Base Creation

**File:** `pages/api/botpress/kb-create.js`

### Endpoint:
```
POST /api/botpress/kb-create
```

### Request Body:
```javascript
{
  domain: "example.com",           // Sanitized domain name
  fullContent: "Scraped content",  // Full website text
  sessionID: "abc123",             // User session ID
  website: "https://example.com"   // Original URL
}
```

### What Happens:

1. **Sanitize domain** for filename:
   ```javascript
   const sanitizedDomain = domain.replace(/[^a-zA-Z0-9-_.]/g, '-');
   const fileName = `${sanitizedDomain}-${timestamp}.txt`;
   ```

2. **Upload to Botpress** with tags:
   ```javascript
   const file = await bp.uploadFile({
     key: fileName,
     content: fullContent,
     index: true,  // Enable semantic search
     tags: {
       domain: sanitizedDomain,      // ← KEY: Used for filtering
       originalDomain: domain,
       sessionID: sessionID,
       website: website,
       source: 'knowledge-base',
       createdAt: new Date().toISOString()
     }
   });
   ```

3. **Wait for indexing** (polls every 1s, max 30s):
   ```javascript
   // Status progression:
   // upload_pending → indexing_pending → indexing_in_progress → indexing_completed
   ```

4. **Save local backup**:
   ```
   data/kb-files/[domain]-[timestamp]-[fileId].txt
   ```

### Response:
```javascript
{
  success: true,
  ready: true,                    // Can proceed immediately
  fileId: "file_01XXXXX",         // Botpress file ID
  fileName: "example-com-123.txt",
  domain: "example.com",
  indexed: true,
  indexStatus: "indexing_completed"
}
```

### Error Handling:
- Missing fields → 400 error
- Botpress API failure → 500 error with details
- Indexing timeout → Assumes ready after 30s (usually safe)

---

## Phase 3: JWT Token Generation

**File:** `pages/api/botpress/get-auth-token.js`

> **Note:** JWT tokens are generated but currently not used in production. The USERDATA mode bypasses JWT entirely.

### Endpoint:
```
POST /api/botpress/get-auth-token
```

### Request:
```javascript
{
  domain: "example.com",
  sessionID: "abc123"
}
```

### What Happens:
```javascript
const token = jwt.sign({
  userData: {
    domain: domain,
    sessionID: sessionID
  }
}, JWT_SECRET, { expiresIn: '1h' });
```

### Response:
```javascript
{
  success: true,
  authToken: "eyJhbGciOiJIUzI1NiIs...",
  domain: "example.com",
  expiresIn: "1h"
}
```

---

## Phase 4: Webchat Preloading

**File:** `pages/index.js` (useEffect when `isScanning` becomes true)

### Purpose:
Load the Botpress webchat script and initialize it BEFORE the user reaches the chat screen. This makes the transition instant.

### Sequence:

1. **Add hide CSS** (prevents flash of webchat bubble):
   ```javascript
   #bp-web-widget-container, .bpw-widget-btn, [id*="bp-"] {
     opacity: 0 !important;
     visibility: hidden !important;
     position: fixed !important;
     left: -9999px !important;
   }
   ```

2. **Add loading overlay** (user sees "AI Agent will appear soon"):
   ```javascript
   const overlayBox = document.createElement('div');
   overlayBox.id = 'webchat-loading-overlay';
   // 240x240 blue box in bottom-right corner
   ```

3. **Load inject script**:
   ```javascript
   const script = document.createElement('script');
   script.src = 'https://cdn.botpress.cloud/webchat/v2.2/inject.js';
   ```

4. **Wait for `window.botpress`** (poll every 100ms, max 5s)

5. **Clear old localStorage** (force fresh session):
   ```javascript
   // Remove keys starting with 'bp/' or containing 'botpress'
   keysToRemove.forEach(key => localStorage.removeItem(key));
   ```

6. **Get theme from window global**:
   ```javascript
   const theme = window.__BOTPRESS_THEME__ || DEFAULT_THEME;
   ```

7. **Initialize webchat (but DON'T open)**:
   ```javascript
   bp.init({
     botId: '3809961f-xxxx',
     clientId: 'f4011114-xxxx',
     configuration: {
       botName: theme.name,           // e.g., "Luna"
       botAvatar: theme.avatar,       // Dicebear URL
       color: theme.primaryColor,     // e.g., "#2563eb"
       variant: 'solid',
       themeMode: 'light',
       fontFamily: 'inter',
       radius: 1
     }
   });
   ```

8. **Set preload flags**:
   ```javascript
   window.__BOTPRESS_PRELOADED__ = true;
   window.__BOTPRESS_CONVERSATION_READY__ = false;
   ```

### Key Point:
**DO NOT call `bp.open()` during preload!** Opening starts a conversation and triggers the bot greeting BEFORE we can set the user context.

---

## Phase 5: Webchat Initialization (Valhallah)

**File:** `components/Valhallah.js`

### When Component Mounts:

1. **Check for preloaded webchat**:
   ```javascript
   if (window.__BOTPRESS_PRELOADED__ && window.botpress) {
     // FAST PATH - webchat already loaded
   } else {
     // NORMAL PATH - full initialization
   }
   ```

### FAST PATH Sequence (Preloaded):

```
┌──────────────────────────────────────────────────────────────┐
│ FAST PATH - Critical Order of Operations                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USERDATA: Call updateUser() BEFORE open()                │
│     ↓                                                        │
│  2. OPEN: Call bp.open() to start conversation               │
│     ↓                                                        │
│  3. WAIT: Wait for 'conversation' event                      │
│     ↓                                                        │
│  4. SEND: Call bp.sendMessage() with clean greeting          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Step 1: Set User Data (BEFORE opening)

```javascript
if (SETTING_KB === 'USERDATA') {
  // Verify user exists
  const userBefore = await bp.getUser();
  if (!userBefore?.id) throw new Error('User not found');

  // Set user data
  await bp.updateUser({
    data: {
      domain: domain,           // "example.com"
      fileId: kbFileId || '',   // "file_01XXXXX"
      website: website,         // "https://example.com"
      sessionID: sessionID      // "abc123"
    }
  });

  // Wait for sync (500ms)
  await new Promise(r => setTimeout(r, 500));

  // Verify data was persisted
  const userAfter = await bp.getUser();
  if (userAfter?.data?.domain === domain) {
    console.log('✓ VERIFIED: user.data.domain =', domain);
  }
}
```

### Step 2: Open Webchat

```javascript
// Set up conversation listener BEFORE opening
bp.on('conversation', (convId) => {
  window.__BOTPRESS_CONVERSATION_READY__ = true;
  window.__BOTPRESS_CONVERSATION_ID__ = convId;
});

await bp.open();
```

### Step 3: Wait for Conversation

```javascript
// Wait up to 10 seconds for conversation to start
while (!window.__BOTPRESS_CONVERSATION_READY__ && elapsed < 10000) {
  await new Promise(r => setTimeout(r, 200));
}
```

### Step 4: Send Message

```javascript
if (SETTING_KB === 'USERDATA') {
  // Clean greeting - no [CONTEXT:...] tag visible
  const greeting = `Hi! I'd like to learn more about ${domain}.`;
  await bp.sendMessage(greeting);
}
```

---

## Phase 6: Context Passing Methods

**Configuration:** `configuration/debugConfig.js`

```javascript
export const SETTING_KB = 'USERDATA';  // ← Current production setting
```

### Three Available Modes:

| Mode | How It Works | Visibility | Recommended |
|------|--------------|------------|-------------|
| `USERDATA` | `bp.updateUser({ data: {...} })` | Invisible | **Yes** |
| `MESSAGE` | `[CONTEXT:domain=x]` in message | Visible (ugly) | No |
| `EVENT` | `bp.sendEvent({ type: 'setContext' })` | Invisible | Requires Custom Trigger |

### USERDATA Mode (Current Production):

**Frontend (Valhallah.js):**
```javascript
await bp.updateUser({
  data: {
    domain: 'example.com',
    fileId: 'file_01XXXXX'
  }
});
```

**Botpress Studio (Execute Code):**
```javascript
// This is available automatically!
if (user.data?.domain) {
  searchDomain = user.data.domain;
  kbFileId = user.data.fileId;
}
```

### MESSAGE Mode (Legacy):

**Frontend:**
```javascript
const contextTag = `[CONTEXT:domain=${domain},fileId=${kbFileId}]`;
await bp.sendMessage(`${contextTag}\nHi! I'd like to learn more about ${domain}.`);
```

**Botpress Studio:**
```javascript
const contextMatch = messageText.match(/\[CONTEXT:([^\]]+)\]/);
// Parse domain from message
```

**Problem:** User sees the ugly `[CONTEXT:...]` tag in the chat.

### EVENT Mode:

**Frontend:**
```javascript
await bp.sendEvent({
  type: 'setContext',
  payload: { domain, fileId }
});
await bp.sendMessage(`Hi! I'd like to learn more about ${domain}.`);
```

**Botpress Studio:**
Requires a Custom Trigger for `setContext` event type.

---

## Phase 7: Botpress Studio Configuration

### Workflow Structure:

```
┌─────────────────────────────────────────────────────────────┐
│                     BOTPRESS WORKFLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [User Message Received]                                     │
│          │                                                   │
│          ▼                                                   │
│  ┌─────────────────────┐                                    │
│  │   Execute Code      │  ← KB Search logic                 │
│  │   (Dynamic KB)      │                                    │
│  └─────────────────────┘                                    │
│          │                                                   │
│          │ Sets: workflow.kbContext                          │
│          │ Sets: workflow.searchDomain                       │
│          │ Sets: workflow.foundDomainKB                      │
│          ▼                                                   │
│  ┌─────────────────────┐                                    │
│  │   AI Task           │  ← Uses kbContext as knowledge     │
│  │   (Generate Reply)  │                                    │
│  └─────────────────────┘                                    │
│          │                                                   │
│          ▼                                                   │
│  [Send Response]                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Execute Code Block (Full):

See `docs/botpress-execute-code.js` for the complete code.

### Key Logic:

```javascript
// Priority order for finding domain:
// 1. user.data.domain (USERDATA mode) ← PRIMARY
// 2. workflow.userDataResult (Get User Data action)
// 3. [CONTEXT:...] in message (MESSAGE mode)
// 4. conversation.domain (cached from previous messages)
// 5. DEFAULT_DOMAIN fallback

if (user.data?.domain) {
  searchDomain = user.data.domain;
  kbFileId = user.data.fileId || null;
  detectedMode = 'USERDATA';
}
```

### KB Search:

```javascript
// Search by fileId if available (faster)
if (kbFileId) {
  kbResults = await client.searchFiles({
    fileId: kbFileId,
    query: event.preview,
    limit: 10
  });
}

// Fallback: Search by domain tag
else {
  kbResults = await client.searchFiles({
    tags: { domain: searchDomain },
    query: event.preview,
    limit: 10
  });
}
```

### Output Variables:

```javascript
workflow.kbContext = kbContext;      // The actual KB content
workflow.searchDomain = searchDomain; // Which domain was searched
workflow.foundDomainKB = foundDomainKB; // Boolean: was KB found?
```

### AI Task Configuration:

In the AI Task node, reference the KB context:

```
You are a helpful assistant for {{workflow.searchDomain}}.

Use the following knowledge base to answer questions:
{{workflow.kbContext}}

If the knowledge base doesn't contain relevant information, say so politely.
```

---

## Error Handling

### KB Creation Errors:

| Error | Cause | Resolution |
|-------|-------|------------|
| 400: Missing fields | `domain`, `fullContent`, or `sessionID` empty | Ensure all fields sent |
| 500: Configuration missing | `BOTPRESS_API_TOKEN` or `BOTPRESS_BOT_ID` not set | Check `.env.local` |
| 500: Upload failed | Botpress API error | Check token permissions |
| Indexing timeout | File taking >30s to index | Usually safe to proceed |

### Webchat Errors:

| Error | Cause | Resolution |
|-------|-------|------------|
| `window.botpress` undefined | Script failed to load | Check network, CSP |
| "Unexpected state: disconnected" | `sendMessage` before conversation | Wait for `conversation` event |
| User data not persisting | `updateUser` after `open` | Call `updateUser` BEFORE `open` |
| Wrong KB searched | Domain not set | Check console for mode detection |

### Botpress Studio Errors:

| Error | Cause | Resolution |
|-------|-------|------------|
| No passages found | KB not indexed yet | Wait for indexing |
| Wrong domain searched | `user.data` not available | Ensure USERDATA mode active |
| DEFAULT fallback used | No context detected | Check frontend is sending context |

---

## Debugging

### Enable Debug Logging:

**File:** `configuration/debugConfig.js`

```javascript
export const DEBUG_BOTPRESS_REQUESTS = true;

export const DEBUG_OPTIONS = {
  LOG_KB_REQUESTS: true,      // KB creation
  LOG_JWT_REQUESTS: true,     // JWT generation
  LOG_WEBCHAT_INIT: true,     // Webchat initialization
  LOG_SESSION_REQUESTS: true, // Session creation
  LOG_STATUS_POLLING: true,   // Indexing status
  LOG_WEBCHAT_EVENTS: true,   // Webchat events
};
```

### Console Log Markers:

```javascript
// Frontend (Valhallah.js)
[VALHALLAH] --- COMPONENT MOUNTED ---
[VALHALLAH] FAST PATH Step 1: USERDATA MODE
[VALHALLAH] ✓ User exists. ID: xxx
[VALHALLAH] ✓ updateUser() call completed
[VALHALLAH] ✓ VERIFIED: user.data.domain = example.com

// Backend (kb-create.js)
[KB-CREATE] Creating Knowledge Base for domain: example.com
[KB-CREATE] Indexing status: indexing_in_progress (5000ms elapsed)
[KB-CREATE] ✅ Indexing complete! Status: indexing_completed

// Botpress Studio
========================================
KB SEARCH EXECUTE CODE - START
========================================
✅ USERDATA MODE detected - using user.data
Mode detected: USERDATA
Search domain: example.com
Found KB: true
Context length: 15432 chars
```

### Verify User Data in Botpress:

Add this to your Execute Code to debug:

```javascript
console.log('===== USER DATA DEBUG =====');
console.log('user.id:', user.id);
console.log('user.data:', JSON.stringify(user.data, null, 2));
console.log('user.tags:', JSON.stringify(user.tags, null, 2));
```

---

## Troubleshooting

### Problem: Bot responds with generic info, not website-specific

**Diagnosis:**
1. Check browser console for `[VALHALLAH]` logs
2. Look for "Mode detected: USERDATA" or "Mode detected: DEFAULT"
3. If DEFAULT, the domain context wasn't passed

**Solutions:**
- Verify `SETTING_KB = 'USERDATA'` in `debugConfig.js`
- Check that `updateUser()` is called BEFORE `open()`
- Add 500ms delay after `updateUser()` for sync
- Verify user data in Botpress Studio logs

### Problem: "Body exceeded 1mb limit" error

**Cause:** Screenshot base64 too large for thumbnail analysis

**Solution:** Already fixed - `analyze-thumbnail.js` has `sizeLimit: '10mb'`

### Problem: KB not found for domain

**Diagnosis:**
1. Check Botpress Dashboard → Files
2. Look for file with correct domain tag
3. Verify file status is "indexing_completed"

**Solutions:**
- Wait for indexing to complete
- Check `data/kb-files/` for local backup
- Verify domain sanitization matches

### Problem: Webchat appears before transition

**Cause:** CSS hide not applied or removed too early

**Solution:**
- Verify `#botpress-preload-hide` style is added
- Don't remove until `screenState === CHAT_TEASE`

### Problem: "User not found" error

**Cause:** `bp.getUser()` called before `bp.init()`

**Solution:**
- Ensure init() completes before getUser()
- Check for preload flags: `window.__BOTPRESS_PRELOADED__`

---

## Quick Reference: The Happy Path

```
1. User submits form with website URL
2. Screenshot captured → Thumbnail analyzed for theme
3. Website scraped → Full content extracted
4. KB created → File uploaded with domain tag
5. Wait for indexing → Status polling until complete
6. JWT generated (optional) → Token with domain payload
7. Webchat preloaded → Script loaded, init() called (not open)
8. Transition to chat → Hide CSS removed, overlay fades out
9. Valhallah mounts → updateUser() sets domain in user.data
10. Webchat opens → Conversation starts
11. Message sent → Clean greeting to bot
12. Botpress receives → Execute Code reads user.data.domain
13. KB searched → Files filtered by domain tag
14. AI responds → Using website-specific KB content
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `pages/index.js` | Main flow, webchat preload, state management |
| `components/Valhallah.js` | Webchat initialization, updateUser, sendMessage |
| `pages/api/botpress/kb-create.js` | KB file creation with tags |
| `pages/api/botpress/get-auth-token.js` | JWT generation |
| `pages/api/analyze-thumbnail.js` | OpenAI Vision for theme extraction |
| `pages/api/scrape-website.js` | Website content scraping |
| `configuration/debugConfig.js` | Debug flags and SETTING_KB mode |
| `docs/botpress-execute-code.js` | Reference Execute Code for Botpress Studio |

---

*Last updated: November 2025*
