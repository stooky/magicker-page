# Botpress Integration Analysis

## Executive Summary

After a comprehensive review of the entire Botpress integration, I've identified **why userData is not reaching the bot workflow** and the recommended solution.

### Root Cause
The `init({ userData: {...} })` call in Botpress Webchat v2 does **NOT** automatically populate `user.tags` or `user.data` in the bot workflow. The userData from `init()` is stored in a **different location** that our Execute Code block is not checking.

### The Fix
Based on Botpress documentation and the bot.json workflow, the "Get User Data" action that runs BEFORE our Execute Code should retrieve the userData. However, the action output needs to be captured and used properly.

---

## Data Flow Analysis

### Current Flow
```
1. KB Created (kb-create.js)
   ↓ Returns: fileId, ready=true

2. Valhallah.js loads
   ↓ Calls: bp.init({ userData: { domain, fileId, ... } })

3. User sends message
   ↓ Triggers bot workflow

4. Workflow: "Get User Data" action
   ↓ Uses: {{event.userId}}
   ↓ Output: ??? (not captured!)

5. Workflow: Execute Code
   ↓ Checks: user.data?.domain, user.tags?.domain
   ↓ Result: ALL UNDEFINED → falls back to DEFAULT_DOMAIN
```

### Problem Identified
Looking at the bot.json workflow (lines 419-438):

```json
{
  "id": "ins-796516dd2b",
  "type": "action",
  "category": "Webchat",
  "origin": "integration",
  "label": "Get User Data",
  "integration": {
    "id": "webchat",
    "action": "getUserData"
  },
  "data": {
    "userId": {
      "valueType": "dynamic",
      "dynamicValue": "{{event.userId}}"
    }
  }
}
```

The "Get User Data" action is called but its **output is not stored in a workflow variable**. The action retrieves the userData, but it's discarded because we don't capture it.

---

## API Version Reference

### Webchat Inject Script
- **Version**: `v2.2`
- **URL**: `https://cdn.botpress.cloud/webchat/v2.2/inject.js`
- **Global**: `window.botpress`
- **Note**: We correctly load ONLY the inject script, not the config script

### Botpress Cloud API
- **Version**: `v1`
- **Base URL**: `https://api.botpress.cloud/v1/`
- **Used for**: File uploads, status checks, conversations

### SDK
- **Package**: `@botpress/client`
- **Used in**: `kb-create.js` for file uploads

---

## Files Overview

### Frontend (Webchat Initialization)

#### `components/Valhallah.js`
**Purpose**: Initialize Botpress webchat with userData

**Current Implementation** (lines 124-147):
```javascript
bp.init({
    botId: '3809961f-f802-40a3-aa5a-9eb91c0dedbb',
    clientId: 'f4011114-6902-416b-b164-12a8df8d0f3d',
    configuration: {
        botName: 'Custom Assistant',
        // ... styling
    },
    userData: {
        domain: domain,
        website: website,
        sessionID: sessionID,
        fileId: kbFileId || ''
    }
});
```

**Status**: CORRECT - userData is being passed to init()

---

### Backend (KB Creation)

#### `pages/api/botpress/kb-create.js`
**Purpose**: Upload KB file, wait for indexing, save local copy

**Key Features**:
- Uses Botpress SDK (`@botpress/client`)
- Waits for `indexing_completed` status (no frontend polling)
- Saves local backup to `data/kb-files/`
- Returns `ready: true` when indexing complete

**Expected Console Output**:
```
[KB-CREATE] Creating Knowledge Base for domain: example.com
[KB-CREATE] File name: example-com-1732537200000.txt
[KB-CREATE] Content length: 4521 characters
[KB-CREATE] Upload response: { file: { id: "file_xxx" } }
[KB-CREATE] File created with ID: file_xxx
[KB-CREATE] Waiting for indexing to complete...
[KB-CREATE] Indexing status: indexing_pending (1000ms elapsed)
[KB-CREATE] Indexing status: indexing_in_progress (2000ms elapsed)
[KB-CREATE] Indexing status: indexing_completed (3000ms elapsed)
[KB-CREATE] ✅ Indexing complete! Status: indexing_completed
[KB-CREATE] ✅ Local copy saved: data/kb-files/example-com-1732537200000-file_xxx.txt
```

---

### Bot Workflow (Execute Code)

#### `scripts/bot-execute-code-WITH-USERDATA.js`
**Purpose**: Search KB based on userData domain/fileId

**Domain Resolution Order** (lines 37-44):
```javascript
searchDomain = user.data?.domain        // ← v2 API
    || user.tags?.domain                // ← Legacy
    || user.domain
    || user.userData?.domain
    || event.payload?.domain
    || conversation.domain
    || conversation.tags?.domain
    || DEFAULT_DOMAIN;
```

**Current Logs Show**:
```
===== DYNAMIC DOMAIN RESOLUTION =====
user.data?.domain: undefined
user.tags?.domain: undefined
user.domain: undefined
user.userData?.domain: undefined
event.payload?.domain: undefined
conversation.domain: undefined
RESOLVED searchDomain: jobheating.com (DEFAULT_DOMAIN)
```

---

## The Solution

### Option 1: Store userData action output in workflow variable (RECOMMENDED)

In Botpress Studio, modify the "Get User Data" action to store its output:

1. Open the Main workflow
2. Click on the "magic-page2" node
3. Find the "Get User Data" action
4. Set its output to store in a workflow variable (e.g., `userDataResult`)
5. In Execute Code, access: `workflow.userDataResult.userData.domain`

### Option 2: Use event.state.user (if available)

After "Get User Data" runs, the user data might be available in `event.state.user`:

```javascript
const domain = event.state?.user?.data?.domain
    || event.state?.user?.tags?.domain
    || user.data?.domain
    || user.tags?.domain
    || DEFAULT_DOMAIN;
```

### Option 3: Pass data in first message (Alternative approach)

Instead of relying on userData, include the domain in the user's first message payload:

```javascript
// In Valhallah.js, after init():
bp.sendEvent({
    type: 'proactive',
    payload: {
        type: 'text',
        text: 'Hello',
        metadata: {
            domain: domain,
            fileId: kbFileId
        }
    }
});
```

Then in Execute Code:
```javascript
const domain = event.payload?.metadata?.domain || DEFAULT_DOMAIN;
```

---

## Recommended Implementation

### Step 1: Update bot.json workflow in Botpress Studio

Add output variable to "Get User Data" action:
```json
{
  "id": "ins-796516dd2b",
  "type": "action",
  "category": "Webchat",
  "origin": "integration",
  "label": "Get User Data",
  "integration": {
    "id": "webchat",
    "action": "getUserData"
  },
  "data": {
    "userId": {
      "valueType": "dynamic",
      "dynamicValue": "{{event.userId}}"
    }
  },
  "output": {
    "variableName": "userDataResult"
  }
}
```

### Step 2: Add workflow variable

Add to Main workflow variables:
```json
{
  "id": "var-userdata",
  "name": "userDataResult",
  "type": "object",
  "scope": "workflow"
}
```

### Step 3: Update Execute Code

```javascript
// Get userData from the "Get User Data" action result
// The action stores output in workflow.userDataResult
const actionResult = workflow.userDataResult || {};
const userDataFromAction = actionResult.userData || actionResult.data || actionResult || {};

searchDomain = userDataFromAction.domain       // ← From "Get User Data" action
    || user.data?.domain                        // ← v2 API
    || user.tags?.domain                        // ← Legacy
    || DEFAULT_DOMAIN;

kbFileId = userDataFromAction.fileId           // ← From "Get User Data" action
    || user.data?.fileId                        // ← v2 API
    || user.tags?.fileId                        // ← Legacy
    || null;
```

See `docs/BOTPRESS-STUDIO-SETUP.md` for the complete Execute Code script.

---

## Testing Checklist

1. [ ] Upload new KB for test domain
2. [ ] Verify local backup created in `data/kb-files/`
3. [ ] Check server logs for "Indexing complete" message
4. [ ] Open webchat and check browser console for `init() called with userData`
5. [ ] Send a test message
6. [ ] Check Botpress Studio logs for domain resolution
7. [ ] Verify KB search finds correct file

---

## Console Output Reference

### Expected Valhallah.js Console Output (Browser)
```
========================================
[VALHALLAH] COMPONENT MOUNTED
========================================
Props received:
  authToken: eyJhbGciOiJIUzI1Ni...
  domain: example.com
  website: https://example.com
  sessionID: abc123
  kbFileId: file_01KAXJ991...
  isReturning: false
  hasScreenshot: true
========================================

[VALHALLAH] Webchat loading useEffect triggered { domain: 'example.com', sessionID: 'abc123', website: 'https://example.com', kbFileId: 'file_01KAXJ991...' }
[VALHALLAH] Loading Botpress webchat (manual init with userData)
[VALHALLAH] ✅ Inject script loaded
[VALHALLAH] ✅ window.botpress available
[VALHALLAH] Available methods: ['init', 'open', 'close', 'toggle', 'sendEvent', ...]

========================================
[VALHALLAH] 🎯 CALLING init() WITH userData
========================================
  domain: example.com
  website: https://example.com
  sessionID: abc123
  fileId: file_01KAXJ991...
========================================

[VALHALLAH] ✅ init() called successfully with userData!
[VALHALLAH] 📢 webchat:ready event fired
```

### Expected Bot Workflow Console Output (Botpress Studio Logs)
```
========================================
🔍 KB SEARCH EXECUTE CODE - START
========================================

===== ALL AVAILABLE DATA =====
user: { "id": "user_xxx", "tags": { "domain": "example.com", "fileId": "file_01KAXJ991..." } }
event.payload: { "text": "What services do you offer?" }
conversation: { "id": "conv_xxx" }

===== DYNAMIC DOMAIN RESOLUTION =====
user.tags?.domain: example.com
RESOLVED searchDomain: example.com

KB File ID (if passed): file_01KAXJ991...

===== USING SPECIFIC KB FILE (OPTIMIZED) =====
File ID: file_01KAXJ991...
Query: What services do you offer?

📊 Search results:
  Total passages found: 5

✅ SUCCESS: Using domain-specific KB
  Domain: example.com
  File: file_01KAXJ991...
  Context length: 2341 chars

========================================
✅ KB SEARCH COMPLETE
========================================
```

---

## Debug Logging

To troubleshoot the integration, enable verbose request logging in `configuration/debugConfig.js`:

```javascript
export const DEBUG_BOTPRESS_REQUESTS = true;

export const DEBUG_OPTIONS = {
    LOG_KB_REQUESTS: true,      // KB file uploads
    LOG_JWT_REQUESTS: true,     // JWT token generation
    LOG_WEBCHAT_INIT: true,     // bp.init() calls
    LOG_SESSION_REQUESTS: true, // Conversation creation
    LOG_STATUS_POLLING: true,   // KB indexing status
    LOG_WEBCHAT_EVENTS: true,   // Webchat events
};
```

### Request Flow (Chronological)

When debug logging is enabled, you'll see numbered entries showing the exact sequence:

```
[1] KB-CREATE      → Upload file to Botpress
[2] KB-STATUS      → Check indexing status (indexing_pending)
[3] KB-STATUS      → Check indexing status (indexing_in_progress)
[4] KB-STATUS      → Check indexing status (indexing_completed)
[5] KB-CREATE      → File upload response
[6] JWT            → Generate authentication token
[7] JWT            → Token generated (with decoded payload)
[8] WEBCHAT        → bp.init() with full config
[9] WEBCHAT EVENT  → webchat:ready
[10] WEBCHAT EVENT → message (user sends first message)
```

### Log Format

**Server-side (Node.js):**
```
╔══════════════════════════════════════════════════════════════
║ [1] BOTPRESS REQUEST - KB-CREATE
║ Time: 2025-11-25T14:30:00.000Z
║ Action: Upload file to Botpress
╠══════════════════════════════════════════════════════════════
║ Payload:
║   {
║     "endpoint": "Botpress SDK bp.uploadFile()",
║     "botId": "3809961f-...",
║     "payload": {
║       "key": "example-com-1732537200000.txt",
║       "content": "[4521 characters - truncated]",
║       "index": true,
║       "tags": { "domain": "example-com", ... }
║     }
║   }
╚══════════════════════════════════════════════════════════════
```

**Browser console (colored):**
```
╔══════════════════════════════════════════════════════════════
║ [8] WEBCHAT REQUEST - bp.init()
║ Time: 2025-11-25T14:30:05.000Z
╠══════════════════════════════════════════════════════════════
║ Payload:
{
  botId: "3809961f-f802-40a3-aa5a-9eb91c0dedbb",
  clientId: "f4011114-6902-416b-b164-12a8df8d0f3d",
  configuration: { botName: "Custom Assistant", ... },
  userData: {
    domain: "example.com",
    website: "https://example.com",
    sessionID: "abc123",
    fileId: "file_01KAXJ991..."
  }
}
╚══════════════════════════════════════════════════════════════
```

### Files with Debug Logging

| File | What's Logged |
|------|---------------|
| `pages/api/botpress/kb-create.js` | File upload payload, indexing status checks, responses |
| `pages/api/botpress/get-auth-token.js` | JWT payload, decoded token |
| `pages/api/botpress/create-session.js` | Conversation creation request/response |
| `components/Valhallah.js` | bp.init() config, webchat events |

---

## Next Steps

1. **Enable debug logging** - Set `DEBUG_BOTPRESS_REQUESTS = true`
2. **Test in Botpress Studio** - Check if "Get User Data" action output can be captured
3. **Update workflow** - Add output variable storage
4. **Update Execute Code** - Check workflow variable first
5. **Re-deploy bot** - Publish changes
6. **Test end-to-end** - Verify domain/fileId reaches KB search
