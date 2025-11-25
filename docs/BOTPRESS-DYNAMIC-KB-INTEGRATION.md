# Botpress Dynamic Knowledge Base Integration

## Overview

This document describes how to dynamically create Knowledge Base (KB) files in Botpress Cloud and configure the webchat to use that specific KB for conversations. This enables per-user or per-domain customized AI assistants.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Botpress Cloud Setup](#botpress-cloud-setup)
3. [Creating Knowledge Base Files via API](#creating-knowledge-base-files-via-api)
4. [Passing Context to Webchat](#passing-context-to-webchat)
5. [Workflow Configuration](#workflow-configuration)
6. [Execute Code for KB Search](#execute-code-for-kb-search)
7. [Alternative: Direct API Approach](#alternative-direct-api-approach)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR APPLICATION                          │
├─────────────────────────────────────────────────────────────────┤
│  1. Scrape website content                                       │
│  2. Upload KB file to Botpress (with domain tag)                │
│  3. Wait for indexing to complete                                │
│  4. Initialize webchat with userData (domain, fileId)           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BOTPRESS CLOUD                              │
├─────────────────────────────────────────────────────────────────┤
│  Files API:                                                      │
│    - Stores KB files with tags (domain, source, etc.)           │
│    - Indexes content for semantic search                         │
│                                                                  │
│  Webchat:                                                        │
│    - Receives userData via updateUser()                          │
│    - Triggers workflow on each message                           │
│                                                                  │
│  Workflow:                                                       │
│    - Get User Data action retrieves userData                     │
│    - Execute Code searches KB by domain/fileId                   │
│    - Autonomous node uses KB context for responses               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Botpress Cloud Setup

### Required Credentials

```
BOTPRESS_TOKEN=bp_pat_xxxx           # Personal Access Token
BOTPRESS_WORKSPACE_ID=wkspace_xxxx   # Workspace ID
BOTPRESS_BOT_ID=xxxxxxxx-xxxx-xxxx   # Bot ID (UUID format)
BOTPRESS_CLIENT_ID=xxxxxxxx-xxxx     # Client ID (for webchat)
```

### Where to Find These

1. **BOTPRESS_TOKEN**: Botpress Dashboard → Personal Access Tokens
2. **BOTPRESS_WORKSPACE_ID**: URL when viewing workspace, or API response
3. **BOTPRESS_BOT_ID**: Botpress Studio → Bot Settings → Bot ID
4. **BOTPRESS_CLIENT_ID**: Botpress Studio → Webchat Integration → Client ID

---

## Creating Knowledge Base Files via API

### Endpoint

```
POST https://api.botpress.cloud/v1/files
```

### Authentication Headers

```javascript
{
  "Authorization": "Bearer {BOTPRESS_TOKEN}",
  "x-workspace-id": "{BOTPRESS_WORKSPACE_ID}",
  "x-bot-id": "{BOTPRESS_BOT_ID}",
  "Content-Type": "application/json"
}
```

### Using the Botpress SDK

```javascript
import { Client } from '@botpress/client';

const client = new Client({
  token: process.env.BOTPRESS_TOKEN,
  workspaceId: process.env.BOTPRESS_WORKSPACE_ID,
  botId: process.env.BOTPRESS_BOT_ID
});

// Upload file with tags
const result = await client.uploadFile({
  key: `${domain}-${Date.now()}.txt`,
  content: kbContent,  // String content
  index: true,         // Enable semantic indexing
  tags: {
    domain: domain,              // Primary lookup tag
    source: 'knowledge-base',    // Category tag
    website: websiteUrl,
    sessionID: sessionId,
    createdAt: new Date().toISOString()
  }
});

const fileId = result.file.id;  // e.g., "file_01KAY582T8J423AKKXEE58XC3Q"
```

### Response Structure

```javascript
{
  "file": {
    "id": "file_01KAY582T8J423AKKXEE58XC3Q",
    "botId": "3809961f-f802-40a3-aa5a-9eb91c0dedbb",
    "key": "example.com-1764096215437.txt",
    "size": 1937,
    "contentType": "text/plain; charset=utf-8",
    "tags": {
      "domain": "example.com",
      "source": "knowledge-base"
    },
    "index": true,
    "status": "upload_pending"  // Will change to "indexing_completed"
  }
}
```

### Waiting for Indexing

Files must be indexed before they can be searched. Poll the status:

```javascript
async function waitForIndexing(fileId, maxAttempts = 30) {
  const endpoint = `https://api.botpress.cloud/v1/files/${fileId}`;

  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${BOTPRESS_TOKEN}`,
        'x-workspace-id': WORKSPACE_ID,
        'x-bot-id': BOT_ID
      }
    });

    const data = await response.json();

    if (data.file.status === 'indexing_completed') {
      return true;
    }

    await new Promise(r => setTimeout(r, 1000));  // Wait 1 second
  }

  return false;
}
```

### Indexing Statuses

| Status | Meaning |
|--------|---------|
| `upload_pending` | File uploaded, waiting for processing |
| `indexing_pending` | Indexing queued |
| `indexing_in_progress` | Currently indexing |
| `indexing_completed` | Ready for search |
| `indexing_failed` | Error during indexing |

---

## Passing Context to Webchat

### Method 1: updateUser() (Recommended)

After initializing the webchat, call `updateUser()` to set custom data:

```javascript
// Load inject script
const script = document.createElement('script');
script.src = 'https://cdn.botpress.cloud/webchat/v2.2/inject.js';
document.body.appendChild(script);

script.onload = () => {
  const bp = window.botpress;

  // Initialize webchat
  bp.init({
    botId: 'your-bot-id',
    clientId: 'your-client-id',
    configuration: {
      botName: 'Assistant',
      color: '#3276EA'
    }
  });

  // Listen for ready event, then set user data
  bp.on('webchat:ready', async () => {
    await bp.updateUser({
      data: {
        domain: 'example.com',
        website: 'https://example.com',
        sessionID: 'abc123',
        fileId: 'file_01KAY582T8J423AKKXEE58XC3Q'
      }
    });
  });
};
```

### Method 2: Conversation Tags (via API)

Create conversation with tags server-side:

```javascript
POST https://api.botpress.cloud/v1/chat/conversations
{
  "channel": "webchat",
  "tags": {
    "domain": "example.com",
    "fileId": "file_01KAY582T8J423AKKXEE58XC3Q"
  }
}
```

### Where Data is Accessible in Workflows

| Source | Access Pattern | Notes |
|--------|---------------|-------|
| `updateUser({ data: {...} })` | `user.data.domain` | Requires "Get User Data" action first |
| Conversation tags | `conversation.tags.domain` | Set via API |
| Event payload | `event.payload.domain` | Custom message payload |

---

## Workflow Configuration

### Recommended Workflow Structure

```
┌─────────┐    ┌─────────────────┐    ┌─────────────┐    ┌─────┐
│  Start  │───▶│  Standard Node  │───▶│ Autonomous  │───▶│ End │
└─────────┘    │                 │    │    Node     │    └─────┘
               │ • Get User Data │    │             │
               │ • Execute Code  │    │ Uses:       │
               │   (KB Search)   │    │ {{workflow. │
               └─────────────────┘    │ kbContext}} │
                                      └─────────────┘
```

### Standard Node Cards

1. **Get User Data** (Webchat action)
   - Retrieves user data set via `updateUser()`
   - Output variable: `workflow.userDataResult`

2. **Execute Code** (Custom JavaScript)
   - Searches KB using domain/fileId
   - Sets `workflow.kbContext` for Autonomous node

### Autonomous Node Configuration

In the Instructions field:

```
You are a helpful AI assistant representing {{workflow.searchDomain}}.

Use the following knowledge base content to answer questions:

{{workflow.kbContext}}

If the information isn't in the knowledge base, say you don't have that specific information.
```

---

## Execute Code for KB Search

### Complete Execute Code Implementation

```javascript
// ========================================
// DYNAMIC KB SEARCH - Execute Code
// ========================================

const DEFAULT_DOMAIN = 'fallback.com';

console.log('KB SEARCH - START');

// ===== EXTRACT USER DATA =====
// Priority order for finding domain:
// 1. workflow.userDataResult (from "Get User Data" action)
// 2. user.data (v2 API - updateUser)
// 3. user.tags (legacy)
// 4. conversation context
// 5. DEFAULT_DOMAIN

const actionResult = workflow.userDataResult || {};
const userDataFromAction = actionResult.userData || actionResult.data || actionResult || {};

let searchDomain = userDataFromAction.domain
    || user.data?.domain
    || user.tags?.domain
    || conversation.domain
    || DEFAULT_DOMAIN;

let kbFileId = userDataFromAction.fileId
    || user.data?.fileId
    || user.tags?.fileId
    || null;

console.log('Resolved domain:', searchDomain);
console.log('Resolved fileId:', kbFileId);

// ===== SEARCH KB =====
let kbResults;

if (kbFileId) {
    // FAST PATH: Search specific file by ID
    console.log('Searching by fileId:', kbFileId);
    try {
        kbResults = await client.searchFiles({
            fileId: kbFileId,
            query: event.preview,
            limit: 10
        });
    } catch (error) {
        console.error('File search failed:', error);
        kbResults = null;
    }
}

// FALLBACK: Search by domain tag
if (!kbFileId || !kbResults?.passages?.length) {
    console.log('Searching by domain tag:', searchDomain);
    try {
        kbResults = await client.searchFiles({
            tags: { domain: searchDomain },
            query: event.preview,
            limit: 10
        });
    } catch (error) {
        console.error('Tag search failed:', error);
        kbResults = { passages: [] };
    }
}

// ===== PROCESS RESULTS =====
let kbContext = '';
let foundDomainKB = false;

if (kbResults?.passages?.length > 0) {
    // Use first file's passages only (avoid mixing domains)
    const uniqueFileIds = [...new Set(kbResults.passages.map(p => p.fileId))];
    const firstFileId = uniqueFileIds[0];
    const passages = kbResults.passages.filter(p => p.fileId === firstFileId);

    kbContext = passages.map(p => p.content).join('\n\n');
    foundDomainKB = true;

    console.log('Found passages:', passages.length);
    console.log('Context length:', kbContext.length);
}

// ===== SET WORKFLOW VARIABLES =====
workflow.kbContext = kbContext;
workflow.searchDomain = searchDomain;
workflow.foundDomainKB = foundDomainKB;

// Store in conversation for subsequent messages
if (searchDomain !== DEFAULT_DOMAIN) {
    conversation.domain = searchDomain;
}

console.log('KB SEARCH - COMPLETE');
console.log('Found KB:', foundDomainKB);
console.log('Domain:', searchDomain);
```

### Required Workflow Variables

Create these in Botpress Studio (Variables panel):

| Variable | Type | Description |
|----------|------|-------------|
| `userDataResult` | Object | Output from "Get User Data" action |
| `kbContext` | String | Extracted KB content for Autonomous |
| `searchDomain` | String | Resolved domain name |
| `foundDomainKB` | Boolean | Whether domain-specific KB was found |

---

## Alternative: Direct API Approach

Instead of using the webchat widget, you can interact with Botpress entirely via API:

### Create User

```javascript
POST https://api.botpress.cloud/v1/chat/users
Headers: {
  "Authorization": "Bearer {token}",
  "x-bot-id": "{botId}"
}
Body: {
  "tags": {
    "domain": "example.com",
    "fileId": "file_xxx"
  }
}
```

### Create Conversation

```javascript
POST https://api.botpress.cloud/v1/chat/conversations
Body: {
  "channel": "messaging",
  "tags": {
    "domain": "example.com"
  }
}
```

### Send Message with Custom Payload

```javascript
POST https://api.botpress.cloud/v1/chat/messages
Body: {
  "conversationId": "conv_xxx",
  "userId": "user_xxx",
  "type": "text",
  "payload": {
    "type": "text",
    "text": "Hello!",
    "kbContext": "...full KB content here..."
  }
}
```

### Access in Workflow

```javascript
// In Execute Code:
const kbContext = event.payload.kbContext;
const domain = conversation.tags.domain;
```

### Benefits of API Approach

- No browser/client timing issues
- Full server-side control
- Can pass large context directly
- No dependency on webchat widget
- Easier testing and automation

---

## Troubleshooting

### Issue: userData Not Available in Workflow

**Symptoms**: Execute Code logs show `user: {}` or `userDataFromAction: {}`

**Causes & Solutions**:

1. **"Get User Data" action missing**: Add the Webchat "Get User Data" action before Execute Code in your workflow
2. **Timing issue**: `updateUser()` called before webchat fully ready - ensure you wait for `webchat:ready` event
3. **Wrong conversation**: User has stale conversation - clear localStorage or create new conversation

### Issue: KB Search Returns No Results

**Symptoms**: `kbResults.passages` is empty

**Causes & Solutions**:

1. **Indexing not complete**: Wait for `status: "indexing_completed"` before using
2. **Wrong domain tag**: Verify the tag used in upload matches the search tag exactly
3. **File not indexed**: Check `index: true` was set during upload

### Issue: Webchat Uses Stale Context

**Symptoms**: Bot responds with old domain's information

**Causes & Solutions**:

1. **Conversation reuse**: Botpress reuses conversations by default. Options:
   - Clear browser localStorage
   - Use API to create new conversation
   - The `newConversation` method is NOT available in inject.js v2.2
2. **Cached user data**: User data persists across sessions

### Issue: Execute Code Not Running

**Symptoms**: No console.log output in Botpress logs

**Causes & Solutions**:

1. **Workflow not connected**: Ensure all nodes are connected with transition lines
2. **Bot not published**: Changes require publishing to take effect
3. **Workflow not triggered**: Check that Start node connects to your Standard Node

### Debugging Tips

1. **Enable debug logging** in Execute Code:
   ```javascript
   console.log('workflow.userDataResult:', JSON.stringify(workflow.userDataResult, null, 2));
   console.log('user:', JSON.stringify(user, null, 2));
   console.log('event.payload:', JSON.stringify(event.payload, null, 2));
   console.log('conversation:', JSON.stringify(conversation, null, 2));
   ```

2. **Check Botpress Cloud Logs**: Dashboard → Your Bot → Logs

3. **Test in Studio Emulator**: Shows console.log output directly (but won't have webchat userData)

---

## API Reference Quick Links

- [Files API - Upload](https://botpress.com/docs/api-reference/files-api)
- [Runtime API - createConversation](https://www.botpress.com/docs/api-reference/runtime-api/openapi/createConversation)
- [Runtime API - createMessage](https://www.botpress.com/docs/api-reference/runtime-api/openapi/createMessage)
- [Webchat JavaScript API](https://botpress.com/docs/developers/webchat/controlling-webchat-using-js)
- [Messaging API Integration](https://www.botpress.com/integrations/messaging)

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-25 | 1.0 | Initial documentation |
