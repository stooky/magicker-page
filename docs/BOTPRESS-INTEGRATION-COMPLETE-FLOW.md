# Botpress Integration - Complete Flow Documentation

**Date:** 2025-11-24
**Purpose:** Painfully thorough explanation of how we integrate Botpress Cloud webchat into our Magic Page application, including all API calls, data flow, and intended outcomes.

---

## Table of Contents

1. [High-Level Overview](#high-level-overview)
2. [The Complete User Journey](#the-complete-user-journey)
3. [Step-by-Step Technical Flow](#step-by-step-technical-flow)
4. [API Calls - Request/Response Details](#api-calls---requestresponse-details)
5. [Botpress Webchat Loading](#botpress-webchat-loading)
6. [userData Transmission](#userdata-transmission)
7. [Knowledge Base Flow](#knowledge-base-flow)
8. [Expected Outcomes](#expected-outcomes)
9. [Error Cases and Fallbacks](#error-cases-and-fallbacks)

---

## High-Level Overview

### What We're Doing

We're creating a **personalized AI chatbot experience** for each website that users submit to Magic Page. The bot:

1. **Knows about the specific website** submitted (via domain-specific Knowledge Base)
2. **Can answer questions** about that website's content
3. **Uses the website's scraped content** as its knowledge source
4. **Authenticates the user** via JWT so the bot knows which domain context to use

### Key Technologies

- **Botpress Cloud** - AI chatbot platform (hosted service)
- **Botpress SDK (`@botpress/client`)** - Node.js client for Botpress API
- **Botpress Webchat v3.4** - Browser widget that renders the chat UI
- **JWT (JSON Web Tokens)** - Authentication tokens for secure bot access
- **PostgreSQL Database** - Stores visitor sessions and domain mappings

### Architecture Diagram

```
User Browser                Magic Page Backend              Botpress Cloud
     |                              |                              |
     |---(1) Submit website-------->|                              |
     |                              |---(2) Scrape website         |
     |                              |---(3) Create KB------------->|
     |                              |<---(4) KB File ID------------|
     |                              |                              |
     |                              |---(5) Generate JWT---------->|
     |                              |<---(6) Auth Token------------|
     |                              |                              |
     |<---(7) Render Valhallah------|                              |
     |                              |                              |
     |---(8) Load webchat scripts--------------------------------->|
     |<---(9) Webchat HTML/JS--------------------------------------|
     |                              |                              |
     |---(10) init({ userData })---------------------------------->|
     |                              |                              |
     |---(11) Send chat message----------------------------------->|
     |                              |<---(12) Execute Code---------|
     |                              |              (searches KB)   |
     |<---(13) Bot response----------------------------------------|
```

---

## The Complete User Journey

### Scenario: User submits "https://gibbonheating.com"

**User Actions:**
1. Opens http://localhost:3000 (or http://mp.membies.com:3000)
2. Enters email: "user@example.com"
3. Enters website: "https://gibbonheating.com"
4. Clicks Submit

**What Happens Behind the Scenes:**
1. ✅ **Domain Check** - Check if gibbonheating.com already processed
2. ✅ **Screenshot Capture** - Take screenshot of website for visual feedback
3. ✅ **Website Scraping** - Extract content from gibbonheating.com
4. ✅ **Knowledge Base Creation** - Upload scraped content to Botpress
5. ✅ **JWT Generation** - Create authentication token with domain context
6. ✅ **Database Storage** - Save session, email, domain to PostgreSQL
7. ✅ **Webchat Loading** - Load Botpress webchat scripts
8. ✅ **userData Initialization** - Pass domain to bot via `init()`
9. ✅ **User Interaction** - User chats with bot about gibbonheating.com
10. ✅ **Bot Responses** - Bot answers using gibbonheating.com Knowledge Base

---

## Step-by-Step Technical Flow

### Step 1: User Submits Form

**File:** `pages/index.js`
**Function:** `handleSubmit(email, website)`
**Line:** 248-472

```javascript
const handleSubmit = async (email, website) => {
    // Validation
    if (!email || !website || !email.includes('@') || !website.startsWith('http')) {
        alert("Please enter a valid email and website URL.");
        return;
    }

    setFormVisible(false);
    setIsLoading(true);

    // ... proceed to domain check
}
```

**What happens:**
- Form validation (email format, URL format)
- UI state changes: Hide form, show loading screen
- Generate or retrieve `sessionID` from localStorage

**Session ID Example:**
```
sessionID: "gxqih9"  // Random 6-character string
```

---

### Step 2: Domain Check (Returning Visitor Detection)

**File:** `pages/index.js`
**Line:** 269-330

**API Call:**
```http
GET /api/dbCheckDomain?website=https://gibbonheating.com
```

**Response (if domain exists):**
```json
{
  "exists": true,
  "data": {
    "sessionid": "gxqih9",
    "email": "user@example.com",
    "website": "https://gibbonheating.com",
    "companyname": "Gibbon Heating",
    "mylistingurl": "{\"domain\":\"gibbonheating.com\",\"sessionID\":\"gxqih9\"}",
    "screenshoturl": "https://example.com/screenshots/gibbonheating.png",
    "created_at": "2025-11-24T10:30:00Z"
  }
}
```

**Response (if domain is new):**
```json
{
  "exists": false
}
```

**If Domain Exists (Returning Visitor):**
1. Load existing screenshot
2. Extract domain from website URL
3. Generate new JWT token (line 306-322)
4. Skip to Valhallah component (skip scraping, KB creation)
5. User sees: "Hey, we already made that one!"

**If Domain is New:**
- Continue to Step 3 (screenshot capture)

---

### Step 3: Screenshot Capture

**File:** `pages/index.js`
**Line:** 339-347

**API Call:**
```http
GET /api/get-screenshot?url=https://gibbonheating.com&sessionID=gxqih9
```

**Backend Process:**
- Uses Playwright browser automation
- Navigates to gibbonheating.com
- Captures full-page screenshot
- Saves to public/screenshots/ directory
- Returns URL to screenshot

**Response:**
```json
{
  "screenshotUrl": "/screenshots/gxqih9-gibbonheating.com.png"
}
```

**State Update:**
```javascript
setScreenshotUrl(screenshotData.screenshotUrl);
// screenshotUrl: "/screenshots/gxqih9-gibbonheating.com.png"
```

---

### Step 4: Database Visitor Insert

**File:** `pages/index.js`
**Line:** 350-363

**API Call:**
```http
POST /api/dbInsertVisitor
Content-Type: application/json

{
  "sessionID": "gxqih9",
  "email": "user@example.com",
  "website": "https://gibbonheating.com",
  "companyName": "Unknown Company",
  "myListingUrl": "EMPTY",
  "screenshotUrl": "TEMP_URL"
}
```

**Database Table:** `visitors`

**SQL Executed:**
```sql
INSERT INTO visitors (
    sessionid,
    email,
    website,
    companyname,
    mylistingurl,
    screenshoturl,
    created_at
) VALUES (
    'gxqih9',
    'user@example.com',
    'https://gibbonheating.com',
    'Unknown Company',
    'EMPTY',
    'TEMP_URL',
    NOW()
);
```

**Response:**
```json
{
  "success": true,
  "message": "Visitor inserted successfully"
}
```

**Note:** This is **non-critical** - if it fails, we continue anyway.

---

### Step 5: Website Scraping

**File:** `pages/index.js`
**Line:** 365-386

**API Call:**
```http
POST /api/scrape-website
Content-Type: application/json

{
  "url": "https://gibbonheating.com"
}
```

**Backend Process:**
1. **Playwright Scraper** (primary method)
   - Browser automation
   - Navigates to website
   - Waits for content to load
   - Extracts text from all pages
   - Follows internal links

2. **Cheerio Scraper** (fallback method)
   - HTML parsing
   - Extracts visible text
   - Faster but less accurate

3. **OpenAI GPT-4** (snippet extraction)
   - Takes scraped content
   - Extracts 5-10 key snippets
   - Returns formatted numbered list

**Response:**
```json
{
  "status": "success",
  "message": "1. Gibbon Heating provides 24/7 emergency furnace repair\n2. Serving the Minneapolis area since 1985\n3. Licensed HVAC technicians\n4. Free estimates on new installations\n5. Same-day service available",
  "fullContent": "Gibbon Heating - Your Trusted HVAC Partner\n\nWelcome to Gibbon Heating...\n\n[Full scraped content - could be 50,000+ characters]",
  "method_used": "playwright",
  "pages_found": 12
}
```

**Processing:**
```javascript
// Extract numbered snippets for display
const processedItems = processZapierResponse(scrapeData.message);
// processedItems: [
//   "Gibbon Heating provides 24/7 emergency furnace repair",
//   "Serving the Minneapolis area since 1985",
//   "Licensed HVAC technicians",
//   "Free estimates on new installations",
//   "Same-day service available"
// ]

setMessageItems(processedItems);  // For ScanningComponent display
```

**UI State:**
- Loading screen transitions to Scanning screen
- Snippets appear one by one
- Screenshot shown as background

---

### Step 6: Knowledge Base Creation

**File:** `pages/index.js`
**Line:** 388-421

**Domain Extraction:**
```javascript
const extractDomain = (url) => {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch (e) {
        return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    }
};
const domain = extractDomain(website);
// domain: "gibbonheating.com"
```

**API Call:**
```http
POST /api/botpress/kb-create
Content-Type: application/json

{
  "domain": "gibbonheating.com",
  "fullContent": "[50,000+ characters of scraped content]",
  "sessionID": "gxqih9",
  "website": "https://gibbonheating.com"
}
```

**Backend Process** (`pages/api/botpress/kb-create.js`):

```javascript
// Line 42-45: Initialize Botpress Client
const bp = new Client({
    token: process.env.BOTPRESS_API_TOKEN,
    botId: process.env.BOTPRESS_BOT_ID
});
```

**Environment Variables:**
```env
BOTPRESS_API_TOKEN=bp_pat_xxx...  # Personal Access Token
BOTPRESS_BOT_ID=2c1a5ed5-xxx...   # Bot ID from Botpress Cloud
```

**Botpress SDK Call:**
```javascript
// Line 56-68: Upload file to Botpress
const file = await bp.uploadFile({
    key: "gibbonheating.com-1732444800000.txt",
    content: "[Full scraped content]",
    index: true,  // Enable semantic search indexing
    tags: {
        domain: "gibbonheating.com",
        originalDomain: "gibbonheating.com",
        sessionID: "gxqih9",
        website: "https://gibbonheating.com",
        source: "knowledge-base",
        createdAt: "2025-11-24T15:30:00.000Z"
    }
});
```

**HTTP Request to Botpress Cloud:**
```http
POST https://api.botpress.cloud/v1/bots/2c1a5ed5-xxx/files
Authorization: Bearer bp_pat_xxx...
Content-Type: application/json

{
  "key": "gibbonheating.com-1732444800000.txt",
  "content": "[Full content here]",
  "index": true,
  "tags": {
    "domain": "gibbonheating.com",
    "originalDomain": "gibbonheating.com",
    "sessionID": "gxqih9",
    "website": "https://gibbonheating.com",
    "source": "knowledge-base",
    "createdAt": "2025-11-24T15:30:00.000Z"
  }
}
```

**Botpress Cloud Response:**
```json
{
  "file": {
    "id": "file_01KAVE7RVEJ4TH277404ZW495G",
    "key": "gibbonheating.com-1732444800000.txt",
    "botId": "2c1a5ed5-xxx",
    "workspaceId": "workspace_xxx",
    "tags": {
      "domain": "gibbonheating.com",
      "originalDomain": "gibbonheating.com",
      "sessionID": "gxqih9",
      "website": "https://gibbonheating.com",
      "source": "knowledge-base",
      "createdAt": "2025-11-24T15:30:00.000Z"
    },
    "indexed": false,  // Indexing in progress
    "createdAt": "2025-11-24T15:30:00.000Z",
    "updatedAt": "2025-11-24T15:30:00.000Z"
  }
}
```

**Our API Response:**
```json
{
  "success": true,
  "fileId": "file_01KAVE7RVEJ4TH277404ZW495G",
  "fileName": "gibbonheating.com-1732444800000.txt",
  "domain": "gibbonheating.com",
  "indexed": true,
  "message": "Knowledge Base created successfully"
}
```

**State Update:**
```javascript
setKbFileId(kbData.fileId);
// kbFileId: "file_01KAVE7RVEJ4TH277404ZW495G"

// Start polling for KB ready status
startKBPolling(kbData.fileId);
```

---

### Step 7: Knowledge Base Status Polling

**File:** `pages/index.js`
**Function:** `startKBPolling(fileId)`
**Line:** 217-244

**Why Polling?**
- Botpress needs time to **index** the content (vector embeddings)
- Indexing can take 5-30 seconds depending on content size
- We poll every 2 seconds to check if indexing is complete

**Polling API Call (every 2 seconds):**
```http
GET /api/botpress/kb-status?fileId=file_01KAVE7RVEJ4TH277404ZW495G
```

**Backend Process:**
```javascript
// pages/api/botpress/kb-status.js
const bp = new Client({ token, botId });
const file = await bp.getFile({ id: fileId });

return {
  success: true,
  ready: file.indexed === true,  // Is indexing complete?
  fileId: fileId,
  indexed: file.indexed
};
```

**Polling Responses:**

**While Indexing:**
```json
{
  "success": true,
  "ready": false,
  "fileId": "file_01KAVE7RVEJ4TH277404ZW495G",
  "indexed": false
}
```

**After Indexing Complete:**
```json
{
  "success": true,
  "ready": true,
  "fileId": "file_01KAVE7RVEJ4TH277404ZW495G",
  "indexed": true
}
```

**When Ready:**
```javascript
if (statusData.success && statusData.ready) {
    console.log('✓ Knowledge Base is READY!');
    setKbReady(true);  // Triggers transition to chat
    clearInterval(pollInterval);
}
```

**Timeout Safety:**
- Stops polling after 60 seconds
- Assumes ready if timeout reached (prevents infinite waiting)

---

### Step 8: JWT Authentication Token Generation

**File:** `pages/index.js`
**Line:** 423-444

**Why JWT?**
- Botpress webchat needs to authenticate users
- JWT carries **domain context** in its payload
- Bot can read domain from JWT without exposing secrets

**API Call:**
```http
POST /api/botpress/get-auth-token
Content-Type: application/json

{
  "domain": "gibbonheating.com",
  "sessionID": "gxqih9"
}
```

**Backend Process** (`pages/api/botpress/get-auth-token.js`):

```javascript
// Line 39-48: Generate JWT
const token = jwt.sign(
    {
        userData: {
            domain: "gibbonheating.com",
            sessionID: "gxqih9"
        }
    },
    process.env.JWT_SECRET,  // Secret key for signing
    { expiresIn: '1h' }      // Token valid for 1 hour
);
```

**Environment Variable:**
```env
JWT_SECRET=your-super-secret-key-here  # Must match Botpress config
```

**JWT Payload (decoded):**
```json
{
  "userData": {
    "domain": "gibbonheating.com",
    "sessionID": "gxqih9"
  },
  "iat": 1732444800,  // Issued at timestamp
  "exp": 1732448400   // Expires at timestamp (1 hour later)
}
```

**JWT Token (encoded):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyRGF0YSI6eyJkb21haW4iOiJnaWJib25oZWF0aW5nLmNvbSIsInNlc3Npb25JRCI6Imd4cWloOSJ9LCJpYXQiOjE3MzI0NDQ4MDAsImV4cCI6MTczMjQ0ODQwMH0.signature-here
```

**API Response:**
```json
{
  "success": true,
  "authToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "domain": "gibbonheating.com",
  "expiresIn": "1h"
}
```

**State Updates:**
```javascript
setAuthToken(tokenData.authToken);
setDomain("gibbonheating.com");
setIsReturning(false);
setBotpressStatus(BOTPRESS_STATUS.CREATED);
```

**Status Progression:**
```
NOT_STARTED → CREATING → CREATED → READY
                          ^         ^
                          |         |
                    JWT created     KB ready + 2 snippets shown
```

---

### Step 9: Database Update with Domain Info

**File:** `pages/index.js`
**Line:** 447-456

**API Call:**
```http
POST /api/dbUpdateVisitor
Content-Type: application/json

{
  "sessionID": "gxqih9",
  "myListingUrl": "{\"domain\":\"gibbonheating.com\",\"sessionID\":\"gxqih9\"}"
}
```

**SQL Executed:**
```sql
UPDATE visitors
SET mylistingurl = '{"domain":"gibbonheating.com","sessionID":"gxqih9"}'
WHERE sessionid = 'gxqih9';
```

**Purpose:**
- Store domain mapping for returning visitors
- Next time user submits gibbonheating.com, we skip scraping
- **Non-critical** - if it fails, chat still works

---

### Step 10: Transition to Chat Screen (Valhallah)

**File:** `pages/index.js`
**Line:** 195-201

**Transition Logic:**
```javascript
useEffect(() => {
    if (kbReady && snippetsShownCount >= 2 && botpressStatus === BOTPRESS_STATUS.CREATED) {
        console.log('✓ READY TO TRANSITION');
        setBotpressStatus(BOTPRESS_STATUS.READY);
    }
}, [kbReady, snippetsShownCount, botpressStatus]);
```

**Conditions Required:**
1. ✅ Knowledge Base indexed (`kbReady === true`)
2. ✅ At least 2 snippets shown (`snippetsShownCount >= 2`)
3. ✅ JWT token created (`botpressStatus === CREATED`)

**When All Met:**
- `setBotpressStatus(BOTPRESS_STATUS.READY)`
- Screen state changes to `SCREEN_STATES.CHAT_TEASE`
- Valhallah component renders

**Valhallah Props:**
```javascript
<Valhallah
    authToken="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    domain="gibbonheating.com"
    isReturning={false}
    screenshotUrl="/screenshots/gxqih9-gibbonheating.com.png"
    sessionID="gxqih9"
    website="https://gibbonheating.com"
/>
```

---

## Botpress Webchat Loading

### Step 11: Load Botpress Scripts

**File:** `components/Valhallah.js`
**Line:** 44-152

**Script Loading Sequence:**

#### 11a. Check for Existing Scripts
```javascript
const existingInjectScript = document.querySelector('script[src*="webchat/v3.4/inject.js"]');
const existingConfigScript = document.querySelector('script[src*="files.bpcontent.cloud"]');

if (existingInjectScript && existingConfigScript) {
    console.log('[VALHALLAH] Botpress scripts already loaded');
    // Skip loading, use existing
}
```

#### 11b. Load Inject Script (Core Webchat Engine)
```javascript
const injectScript = document.createElement('script');
injectScript.src = 'https://cdn.botpress.cloud/webchat/v3.4/inject.js';
document.body.appendChild(injectScript);
```

**What this loads:**
- Botpress webchat core JavaScript
- Chat UI rendering engine
- Message handling system
- Creates `window.botpressWebChat` object

**HTTP Request:**
```http
GET https://cdn.botpress.cloud/webchat/v3.4/inject.js
```

**Response:** JavaScript file (~500KB minified)

#### 11c. Load Config Script (Bot-Specific Configuration)
```javascript
const configScript = document.createElement('script');
configScript.src = 'https://files.bpcontent.cloud/2025/08/29/02/20250829022146-W5NQM7TZ.js';
configScript.defer = true;
document.body.appendChild(configScript);
```

**What this loads:**
- Bot-specific configuration
- Bot ID, workspace ID
- Styling configuration
- Avatar, colors, welcome message

**HTTP Request:**
```http
GET https://files.bpcontent.cloud/2025/08/29/02/20250829022146-W5NQM7TZ.js
```

**Response:** JavaScript configuration file

**Example Config (simplified):**
```javascript
window.botpressWebChat.init({
  botId: "2c1a5ed5-xxx",
  hostUrl: "https://cdn.botpress.cloud/webchat",
  messagingUrl: "https://messaging.botpress.cloud",
  clientId: "client-xxx",
  botName: "Magic Page AI",
  avatarUrl: "https://...",
  stylesheet: "https://...",
  frontendVersion: "v3.4",
  // ... more config
});
```

---

### Step 12: Wait for Webchat Initialization

**File:** `components/Valhallah.js`
**Line:** 111-170

**Problem:**
- Config script calls `init()` automatically
- But `window.botpressWebChat` object takes time to initialize
- We need to wait before we can call our own `init()` with userData

**Solution: Polling**
```javascript
let attempts = 0;
const maxAttempts = 20; // Try for 10 seconds (20 * 500ms)

const pollForWebchat = setInterval(() => {
    attempts++;
    console.log(`[VALHALLAH] Polling attempt ${attempts}/${maxAttempts}`);

    if (window.botpressWebChat && typeof window.botpressWebChat.init === 'function') {
        clearInterval(pollForWebchat);
        // SUCCESS - webchat is ready
        initializeWithUserData();
    } else if (attempts >= maxAttempts) {
        clearInterval(pollForWebchat);
        console.error('[VALHALLAH] Webchat init timeout');
    }
}, 500); // Check every 500ms
```

**Console Output (typical):**
```
[VALHALLAH] Polling attempt 1/20 - window.botpressWebChat exists: false
[VALHALLAH] Polling attempt 2/20 - window.botpressWebChat exists: false
[VALHALLAH] Polling attempt 3/20 - window.botpressWebChat exists: false
[VALHALLAH] Polling attempt 4/20 - window.botpressWebChat exists: true
========================================
[VALHALLAH] 🎯 INITIALIZING BOTPRESS WEBCHAT WITH USERDATA
========================================
```

**Timing:**
- Usually ready after 1-2 seconds (2-4 polling attempts)
- Maximum wait: 10 seconds (20 attempts)

---

## userData Transmission

### Step 13: Initialize Webchat, Then Call updateUser()

**File:** `components/Valhallah.js`
**Line:** 161-245

**UPDATED APPROACH (Nov 2025):**

Based on Discord guidance from Botpress team (shen), the correct method is:
1. Call `init()` WITHOUT userData
2. Listen for `webchat:initialized` event
3. Call `updateUser()` with the data AFTER initialization

**The Critical Sequence:**
```javascript
// Step 1: Listen for initialized event BEFORE calling init()
window.botpress.on('webchat:initialized', async () => {
    console.log('Webchat initialized, now calling updateUser()...');

    // Step 3: Call updateUser() with our data
    await window.botpress.updateUser({
        data: {
            domain: "gibbonheating.com",
            website: "https://gibbonheating.com",
            sessionID: "gxqih9",
            fileId: "file_01KAVE7RVEJ4TH277404ZW495G"
        }
    });

    // Verify the data was set
    const user = await window.botpress.getUser();
    console.log('User data:', user);
});

// Step 2: Call init() WITHOUT userData
window.botpress.init({
    botId: "3809961f-f802-40a3-aa5a-9eb91c0dedbb",
    clientId: "f4011114-6902-416b-b164-12a8df8d0f3d",
    configuration: {
        botName: "Custom Assistant",
        // ... styling only, NO userData here!
    }
});
```

**What Happens:**

1. **Browser calls `init()`** - Webchat initializes with bot config only

2. **`webchat:initialized` event fires** - Signal that webchat is ready

3. **Browser calls `updateUser()`** → Botpress Cloud:
```http
POST https://messaging.botpress.cloud/v1/webchat/users/update
Content-Type: application/json
Authorization: Bearer [client token]

{
  "data": {
    "domain": "gibbonheating.com",
    "website": "https://gibbonheating.com",
    "sessionID": "gxqih9",
    "fileId": "file_01KAVE7RVEJ4TH277404ZW495G"
  }
}
```

4. **Botpress Cloud Processes:**
   - Updates user record
   - **Stores data in `user.data`** (accessed as `user.data.domain` in Execute Code)
   - Returns updated user object

5. **Browser calls `getUser()` to verify:**
```json
{
  "id": "web_user_12345xyz",
  "data": {
    "domain": "gibbonheating.com",
    "website": "https://gibbonheating.com",
    "sessionID": "gxqih9",
    "fileId": "file_01KAVE7RVEJ4TH277404ZW495G"
  },
  "createdAt": "2025-11-24T15:30:05Z"
}
```

**CRITICAL DISCOVERY (Updated):**
- ✅ Use `updateUser()` AFTER `webchat:initialized` event
- ✅ Data goes into **`user.data`** when using `updateUser()`
- ✅ Accessible in Execute Code as `user.data.domain`
- ✅ Can be updated during conversation (unlike init())
- ❌ DO NOT put userData in init() - it doesn't work reliably

**Console Logs:**
```
[VALHALLAH] 📢 webchat:initialized event fired!
[VALHALLAH] 🎯 NOW calling updateUser() with data...
[VALHALLAH] ✅ updateUser() SUCCESS!
[VALHALLAH] 🔍 getUser() result: { id: "...", data: { domain: "gibbonheating.com", ... } }
```

---

### Step 14: User Sends First Message

**User Action:** Types "What services do you offer?" and hits Enter

**Browser → Botpress Cloud:**
```http
POST https://messaging.botpress.cloud/v1/webchat/messages
Content-Type: application/json
Authorization: Bearer [client token]

{
  "conversationId": "conv_67890abc",
  "userId": "web_user_12345xyz",
  "type": "text",
  "payload": {
    "text": "What services do you offer?"
  }
}
```

**Botpress Cloud Processing:**

1. **Receives Message Event**
```javascript
// In Botpress Studio workflow
event = {
  type: "text",
  preview: "What services do you offer?",
  payload: {
    text: "What services do you offer?"
  },
  userId: "web_user_12345xyz",
  conversationId: "conv_67890abc"
}
```

2. **Workflow Executes**
   - Triggers "Start" node
   - Flows to "Execute Code" card
   - Runs our custom KB search code

---

## Knowledge Base Flow

### Step 15: Execute Code Card Runs

**File:** `scripts/bot-execute-code-WITH-USERDATA.js` (in Botpress Studio)
**Line:** 1-192

**Available Objects in Execute Code:**

```javascript
// user object
user = {
  id: "web_user_12345xyz",
  tags: {
    domain: "gibbonheating.com",      // ← userData from init()!
    website: "https://gibbonheating.com",
    sessionID: "gxqih9"
  },
  createdAt: "2025-11-24T15:30:05Z"
}

// event object
event = {
  type: "text",
  preview: "What services do you offer?",
  payload: {
    text: "What services do you offer?"
  },
  userId: "web_user_12345xyz",
  conversationId: "conv_67890abc"
}

// conversation object
conversation = {
  id: "conv_67890abc",
  tags: {},  // Empty initially
  createdAt: "2025-11-24T15:30:05Z"
}

// client object (Botpress SDK)
client = {
  searchFiles: [Function],
  getFile: [Function],
  listFiles: [Function],
  // ... more methods
}

// workflow object (output variables)
workflow = {
  // We'll set these
}
```

---

### Step 16: Domain Resolution

**Code:**
```javascript
// Line 36-54 in Execute Code
searchDomain = user.tags?.domain        // ✅ "gibbonheating.com"
    || user.domain                      // undefined
    || user.userData?.domain            // undefined
    || event.payload?.domain            // undefined
    || event.tags?.domain               // undefined
    || conversation.domain              // undefined
    || conversation.tags?.domain        // undefined
    || DEFAULT_DOMAIN;                  // "default.com"

// Result: searchDomain = "gibbonheating.com"
```

**Console Output:**
```
===== DYNAMIC DOMAIN RESOLUTION =====
user.tags?.domain: gibbonheating.com  ← Found it!
user.domain: undefined
user.userData?.domain: undefined
event.payload?.domain: undefined
event.tags?.domain: undefined
conversation.domain: undefined
conversation.tags?.domain: undefined
RESOLVED searchDomain: gibbonheating.com
```

---

### Step 17: Search Knowledge Base

**Code:**
```javascript
// Line 62-84 in Execute Code
const kbResults = await client.searchFiles({
    tags: {
        domain: "gibbonheating.com"
    },
    query: "What services do you offer?",
    limit: 10
});
```

**Botpress SDK → Botpress Cloud:**
```http
POST https://api.botpress.cloud/v1/bots/2c1a5ed5-xxx/files/search
Authorization: Bearer bp_pat_xxx...
Content-Type: application/json

{
  "tags": {
    "domain": "gibbonheating.com"
  },
  "query": "What services do you offer?",
  "limit": 10
}
```

**How Botpress Searches:**

1. **Tag Filtering:**
   - Finds all files with `tags.domain = "gibbonheating.com"`
   - In our case: `file_01KAVE7RVEJ4TH277404ZW495G`

2. **Semantic Search:**
   - Converts query to vector embedding
   - Compares with indexed content vectors
   - Returns most relevant passages

3. **Scoring:**
   - Each passage gets relevance score (0.0 to 1.0)
   - Higher score = more relevant

**Botpress Cloud Response:**
```json
{
  "passages": [
    {
      "fileId": "file_01KAVE7RVEJ4TH277404ZW495G",
      "content": "Gibbon Heating offers comprehensive HVAC services including furnace repair, air conditioning installation, duct cleaning, and 24/7 emergency service. We specialize in both residential and commercial heating and cooling solutions.",
      "score": 0.89,
      "position": {
        "start": 2450,
        "end": 2687
      }
    },
    {
      "fileId": "file_01KAVE7RVEJ4TH277404ZW495G",
      "content": "Our licensed technicians provide expert furnace maintenance, heat pump installation, and air quality assessments. All services come with a satisfaction guarantee.",
      "score": 0.76,
      "position": {
        "start": 5230,
        "end": 5398
      }
    }
    // ... up to 10 passages
  ]
}
```

**Console Output:**
```
===== SEARCHING DOMAIN-SPECIFIC KB =====
Tags: {"domain":"gibbonheating.com"}
Query: What services do you offer?

📊 Search results:
  Total passages found: 8
  Passages details:
    [0] fileId: file_01KAVE7RVEJ4TH277404ZW495G, score: 0.89, length: 237 chars
    [1] fileId: file_01KAVE7RVEJ4TH277404ZW495G, score: 0.76, length: 168 chars
    [2] fileId: file_01KAVE7RVEJ4TH277404ZW495G, score: 0.68, length: 192 chars
    ...
```

---

### Step 18: Process Results and Build Context

**Code:**
```javascript
// Line 90-138 in Execute Code
if (kbResults.passages && kbResults.passages.length > 0) {
    // Get unique file IDs
    const uniqueFileIds = [...new Set(kbResults.passages.map(p => p.fileId))];
    // uniqueFileIds: ["file_01KAVE7RVEJ4TH277404ZW495G"]

    // Use first file only (in case multiple files for same domain)
    const firstFileId = uniqueFileIds[0];
    const firstFilePassages = kbResults.passages.filter(p => p.fileId === firstFileId);

    // Combine passages into context
    kbContext = firstFilePassages.map(p => p.content).join('\n\n');
    foundDomainKB = true;
}
```

**Resulting `kbContext` (sent to AI):**
```
Gibbon Heating offers comprehensive HVAC services including furnace repair, air conditioning installation, duct cleaning, and 24/7 emergency service. We specialize in both residential and commercial heating and cooling solutions.

Our licensed technicians provide expert furnace maintenance, heat pump installation, and air quality assessments. All services come with a satisfaction guarantee.

[... more relevant passages ...]
```

**Console Output:**
```
✅ SUCCESS: Using domain-specific KB
  Domain: gibbonheating.com
  File: file_01KAVE7RVEJ4TH277404ZW495G
  Context length: 2453 chars
```

---

### Step 19: Store Domain in Conversation

**Code:**
```javascript
// Line 176-179 in Execute Code
workflow.kbContext = kbContext;
workflow.searchDomain = "gibbonheating.com";
workflow.foundDomainKB = true;

// Store domain in conversation for future messages
if (searchDomain && searchDomain !== DEFAULT_DOMAIN) {
    conversation.domain = "gibbonheating.com";
    console.log('💾 Stored domain in conversation');
}
```

**Why Store in Conversation?**
- Future messages in same conversation can use `conversation.domain`
- Fallback if `user.tags` somehow becomes unavailable
- Persistence across entire chat session

**Final Summary:**
```
========================================
✅ KB SEARCH COMPLETE
========================================
Summary:
  Found KB: true
  Search method: domain-specific
  Domain used: gibbonheating.com
  Context length: 2453 chars
========================================
```

---

### Step 20: AI Response Generation

**Workflow Continues:**
1. Execute Code card sets `workflow.kbContext`
2. Next node: "AI Task" card (LLM node)

**AI Task Configuration:**
```
Instructions:
You are a helpful assistant for {{workflow.searchDomain}}.
Use the following context to answer the user's question:

{{workflow.kbContext}}

Only answer based on the provided context. If the context doesn't contain
the answer, say you don't have that information.

User Question: {{event.preview}}
```

**Sent to OpenAI/Claude:**
```http
POST https://api.openai.com/v1/chat/completions
Authorization: Bearer sk-xxx...
Content-Type: application/json

{
  "model": "gpt-4",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant for gibbonheating.com. Use the following context to answer the user's question:\n\nGibbon Heating offers comprehensive HVAC services including furnace repair, air conditioning installation, duct cleaning, and 24/7 emergency service. We specialize in both residential and commercial heating and cooling solutions.\n\nOur licensed technicians provide expert furnace maintenance, heat pump installation, and air quality assessments. All services come with a satisfaction guarantee.\n\nOnly answer based on the provided context. If the context doesn't contain the answer, say you don't have that information."
    },
    {
      "role": "user",
      "content": "What services do you offer?"
    }
  ],
  "temperature": 0.7
}
```

**OpenAI Response:**
```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Based on the information available, Gibbon Heating offers a comprehensive range of HVAC services including:\n\n• Furnace repair and maintenance\n• Air conditioning installation\n• Duct cleaning\n• Heat pump installation\n• Air quality assessments\n• 24/7 emergency service\n\nWe serve both residential and commercial customers, and all services come with a satisfaction guarantee. Our technicians are licensed professionals dedicated to providing quality heating and cooling solutions."
      }
    }
  ]
}
```

---

### Step 21: Send Response to User

**Botpress Cloud → Browser:**
```http
POST https://messaging.botpress.cloud/v1/webchat/messages
(via WebSocket or HTTP streaming)

{
  "conversationId": "conv_67890abc",
  "type": "text",
  "payload": {
    "text": "Based on the information available, Gibbon Heating offers a comprehensive range of HVAC services including:\n\n• Furnace repair and maintenance\n• Air conditioning installation\n• Duct cleaning\n• Heat pump installation\n• Air quality assessments\n• 24/7 emergency service\n\nWe serve both residential and commercial customers, and all services come with a satisfaction guarantee. Our technicians are licensed professionals dedicated to providing quality heating and cooling solutions."
  },
  "userId": "bot",
  "timestamp": "2025-11-24T15:30:12Z"
}
```

**Browser Renders:**
- Message appears in chat widget
- User sees bot response with domain-specific information
- Response is based on scraped gibbonheating.com content!

---

## Expected Outcomes

### Success Criteria

✅ **User receives personalized chatbot** that knows about their website
✅ **Bot answers questions** using scraped website content
✅ **Domain-specific Knowledge Base** is searched for each query
✅ **No mixing of domains** - gibbonheating.com KB ≠ flashfurnacerepair.com KB
✅ **Returning visitors** skip scraping, go straight to chat
✅ **JWT authentication** secures bot access
✅ **userData transmission** via `init()` stores domain in `user.tags`
✅ **Conversation persistence** stores domain for multi-turn conversations

### Performance Metrics

- **Screenshot:** 2-5 seconds
- **Scraping:** 10-30 seconds (depends on website size)
- **KB Creation:** 1-2 seconds (upload)
- **KB Indexing:** 5-30 seconds (background)
- **JWT Generation:** <100ms
- **Webchat Load:** 1-3 seconds
- **First Message Response:** 2-5 seconds (includes KB search + LLM)
- **Subsequent Messages:** 1-3 seconds

### User Experience

**Timeline from user perspective:**

```
00:00 - User submits form
00:02 - Loading screen appears
00:05 - Scanning screen with screenshot
00:07 - First snippet appears
00:12 - Second snippet appears
00:15 - KB indexed, transition to chat
00:16 - Chat widget fully loaded
00:18 - User sends first message
00:22 - Bot responds with domain-specific answer ✨
```

**Total time to chat:** ~15-20 seconds

---

## Error Cases and Fallbacks

### Error Case 1: Website Unreachable

**Scenario:** Website is down or blocks scrapers

**Fallback:**
```javascript
// Scraper returns minimal content
{
  "status": "partial",
  "message": "Could not fully scrape website",
  "fullContent": "Website title and limited content",
  "method_used": "cheerio"
}
```

**Result:**
- KB created with limited content
- Bot has minimal knowledge
- User still gets chat widget

---

### Error Case 2: KB Creation Fails

**Scenario:** Botpress API error or quota exceeded

**Fallback:**
```javascript
if (!kbData.success) {
    console.error('Failed to create KB, continuing anyway');
    setKbReady(true);  // Allow transition to chat
}
```

**Result:**
- Chat still loads
- Bot uses default KB (if configured)
- Or bot has no context (graceful degradation)

---

### Error Case 3: JWT Generation Fails

**Scenario:** JWT_SECRET missing or invalid

**Result:**
```javascript
setBotpressStatus(BOTPRESS_STATUS.ERROR);
alert('Failed to create AI authentication. Please try again or contact support.');
return;  // Stop flow
```

**No chat loads** - this is critical for security

---

### Error Case 4: userData Not in user.tags

**Scenario:** Botpress changes API, userData not stored

**Fallback in Execute Code:**
```javascript
searchDomain = user.tags?.domain        // Primary
    || user.domain                      // Fallback 1
    || user.userData?.domain            // Fallback 2
    || event.payload?.domain            // Fallback 3
    || conversation.domain              // Fallback 4 (from previous message)
    || DEFAULT_DOMAIN;                  // Last resort
```

**Result:**
- First message might use default KB
- Second message uses `conversation.domain` (stored from first message)
- User gets degraded but functional experience

---

### Error Case 5: Webchat Scripts Don't Load

**Scenario:** CDN down, firewall blocks, etc.

**Timeout:**
```javascript
if (attempts >= maxAttempts) {
    console.error('window.botpressWebChat.init not available after 10 seconds');
}
```

**Result:**
- User sees chat widget placeholder
- No functional chat (visible error to user)
- User should refresh or contact support

---

## Summary

### Data Flow Chain

```
User Input
  → Domain Check (DB)
  → Screenshot Capture
  → Website Scraping
  → Knowledge Base Upload (Botpress Cloud)
  → KB Indexing (background, ~10s)
  → JWT Generation
  → Webchat Load (CDN)
  → init({ userData: { domain } })
  → userData stored in user.tags
  → User sends message
  → Execute Code reads user.tags.domain
  → Search KB by domain tag
  → Return relevant passages
  → LLM generates response with context
  → User sees domain-specific answer ✨
```

### Key Files Reference

| File | Purpose | Key Functions |
|------|---------|---------------|
| `pages/index.js` | Main flow orchestration | `handleSubmit()`, KB polling |
| `components/Valhallah.js` | Webchat loading & init | Script loading, `init()` call |
| `pages/api/botpress/kb-create.js` | KB creation | `bp.uploadFile()` |
| `pages/api/botpress/get-auth-token.js` | JWT generation | `jwt.sign()` |
| `pages/api/botpress/kb-status.js` | KB polling | `bp.getFile()` |
| `scripts/bot-execute-code-WITH-USERDATA.js` | Bot logic (in Studio) | Domain resolution, KB search |

### Critical Environment Variables

```env
BOTPRESS_API_TOKEN=bp_pat_xxx...          # Botpress Personal Access Token
BOTPRESS_BOT_ID=2c1a5ed5-xxx...           # Bot ID from Botpress Cloud
JWT_SECRET=your-super-secret-key          # JWT signing key
DB_USER=postgres                           # PostgreSQL username
DB_HOST=localhost                          # PostgreSQL host
DB_PASSWORD=botpress_password              # PostgreSQL password
DB=mp                                      # Database name
DB_PORT=5433                               # PostgreSQL port
```

### The userData Discovery (UPDATED Nov 2025)

**MOST IMPORTANT FINDING:**

Based on Discord guidance from Botpress team (shen), the CORRECT approach is:

```javascript
// Frontend - DON'T use userData in init()!
window.botpress.init({
    botId: "...",
    clientId: "...",
    configuration: { /* styling only */ }
    // NO userData here!
});

// Instead, use updateUser() AFTER webchat:initialized
window.botpress.on('webchat:initialized', async () => {
    await window.botpress.updateUser({
        data: {
            domain: "gibbonheating.com",
            fileId: "file_01KAVE7...",
            // ... other data
        }
    });
});

// Backend (Execute Code) - Check user.data FIRST
const domain = user.data?.domain        // ← PRIMARY: From updateUser()
    || user.tags?.domain                // ← FALLBACK: Legacy init()
    || DEFAULT_DOMAIN;
```

**Key Points:**
- ❌ `userData` in `init()` doesn't work reliably
- ✅ `updateUser({ data: {...} })` after `webchat:initialized` works!
- ✅ Data accessible as `user.data.domain` in Execute Code
- ✅ Can verify with `getUser()` after calling `updateUser()`

This was discovered through Discord conversation with Botpress team member shen.

---

**End of Documentation**

This flow enables **personalized AI chatbots** that know about specific websites, using Botpress Cloud as the bot platform and our custom scraping + KB creation pipeline.
