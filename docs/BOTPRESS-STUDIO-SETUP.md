# Botpress Studio Setup Guide

**Complete configuration for Magic Page AI Agent**

---

## Table of Contents

1. [Workflow Variables](#1-workflow-variables)
2. [Get User Data Action Configuration](#2-get-user-data-action-configuration)
3. [Execute Code Card](#3-execute-code-card)
4. [AI Task Instructions](#4-ai-task-instructions-autonomous-node)
5. [Complete Workflow Diagram](#5-complete-workflow-diagram)
6. [Testing & Debugging](#6-testing--debugging)

---

## 1. Workflow Variables

These are the variables your workflow uses to pass data between nodes.

### How to Create Variables in Botpress Studio

1. Open your bot in Botpress Studio
2. Click **Variables** in the left sidebar
3. Click **+ Add Variable**
4. Create each variable below

### Required Variables

| Variable Name | Type | Description | Set By | Used By |
|--------------|------|-------------|--------|---------|
| `userDataResult` | Object | **CRITICAL** - Output from "Get User Data" action | Get User Data action | Execute Code |
| `kbContext` | String | Knowledge Base passages (context for AI) | Execute Code | AI Task |
| `searchDomain` | String | Domain being searched (e.g., "trusthomecomfort.com") | Execute Code | AI Task, Text cards |
| `foundDomainKB` | Boolean | Whether domain-specific KB was found | Execute Code | Conditional logic |

### ⚠️ CRITICAL: Create `userDataResult` Variable

This is the **most important variable** - it stores the userData passed from the webchat `init()` call.

1. Go to **Variables** panel
2. Click **+ Add Variable**
3. Name: `userDataResult`
4. Type: **Object**
5. Scope: **Workflow**
6. Click Save

### Variable Details

#### `kbContext` (String)

**Purpose:** Contains the relevant passages from the Knowledge Base to answer the user's question.

**Example Value:**
```
Gibbon Heating offers comprehensive HVAC services including furnace repair, air conditioning installation, duct cleaning, and 24/7 emergency service. We specialize in both residential and commercial heating and cooling solutions.

Our licensed technicians provide expert furnace maintenance, heat pump installation, and air quality assessments. All services come with a satisfaction guarantee.
```

**Set in Execute Code (line 204):**
```javascript
workflow.kbContext = kbContext;
```

**Used in AI Task:**
```
{{workflow.kbContext}}
```

---

#### `searchDomain` (String)

**Purpose:** The domain currently being searched for context.

**Example Value:**
```
gibbonheating.com
```

**Set in Execute Code (line 205):**
```javascript
workflow.searchDomain = searchDomain;
```

**Used in AI Task:**
```
You are a helpful assistant for {{workflow.searchDomain}}.
```

---

#### `foundDomainKB` (Boolean)

**Purpose:** Flag indicating whether a domain-specific KB was found (vs. default fallback).

**Possible Values:**
- `true` - Found domain-specific KB
- `false` - Using default KB or no KB found

**Set in Execute Code (line 206):**
```javascript
workflow.foundDomainKB = foundDomainKB;
```

**Used in Conditional Logic:**
```javascript
if (workflow.foundDomainKB) {
    // Use domain-specific response
} else {
    // Use generic fallback
}
```

---

## 2. Get User Data Action Configuration

**This is the CRITICAL step that retrieves userData from the webchat init() call.**

The `bp.init({ userData: {...} })` call passes data to Botpress, but it does NOT automatically appear in `user.data` or `user.tags`. You must use the "Get User Data" action to retrieve it and store it in a workflow variable.

### Step-by-Step Configuration

#### Step 1: Add "Get User Data" Action to Workflow

1. Open your workflow in Botpress Studio
2. In the **Start** node (or first node that handles messages), click **+** to add a card
3. Search for **"Get User Data"** (it's under Webchat integration)
4. Add it **BEFORE** your Execute Code card

#### Step 2: Configure the Action

Click on the "Get User Data" card and configure:

| Field | Value |
|-------|-------|
| User ID | `{{event.userId}}` |

#### Step 3: ⚠️ CRITICAL - Store Output in Variable

This is where most setups fail!

1. Click on the "Get User Data" card
2. Look for **"Store result in variable"** or **"Output"** section
3. Select: `userDataResult`

**If you don't see an output option:**
- Click the **gear icon** or **settings** on the card
- Look for "Save to variable" or "Output variable"
- Select `userDataResult` from the dropdown

#### Step 4: Verify Configuration

Your "Get User Data" card should show:
```
Get User Data
├─ User ID: {{event.userId}}
└─ Output → userDataResult
```

### What the Action Returns

The "Get User Data" action returns the userData that was passed to `bp.init()`:

```json
{
  "domain": "trusthomecomfort.com",
  "website": "https://trusthomecomfort.com",
  "sessionID": "abc123",
  "fileId": "file_01KAXYZ..."
}
```

This will be stored in `workflow.userDataResult` and can be accessed in Execute Code as:
```javascript
const actionResult = workflow.userDataResult || {};
const domain = actionResult.domain;
const fileId = actionResult.fileId;
```

### Troubleshooting "Get User Data"

**Problem: `workflow.userDataResult` is undefined**

Check:
1. ✅ Is the "Get User Data" action **BEFORE** Execute Code in the workflow?
2. ✅ Is the output configured to store in `userDataResult`?
3. ✅ Does the `userDataResult` variable exist (type: Object)?
4. ✅ Did you click **Publish** after making changes?

**Problem: userDataResult is empty `{}`**

Check:
1. ✅ Is `bp.init()` being called with `userData`? (Check browser console)
2. ✅ Is the webchat fully loaded before the first message?
3. ✅ Check the Browser console logs for: `CALLING init() WITH userData`

---

## 3. Execute Code Card

This is the JavaScript code that searches your Knowledge Base and extracts relevant context.

### Where to Place This

1. Open your workflow in Botpress Studio
2. Add an **Execute Code** card
3. Place it **AFTER** the "Get User Data" action (which stores output in `userDataResult`)
4. Place it **BEFORE** your AI Task node
5. Name it: "KB Search - Dynamic Domain"

### The Complete Execute Code

Copy and paste this **ENTIRE** code into your Execute Code card:

```javascript
// ========================================
// BOTPRESS EXECUTE CODE - Dynamic KB Search with userData
// ========================================
// UPDATED: Now checks workflow.userDataResult from "Get User Data" action FIRST
// This is the output variable you configured in Botpress Studio
//
// Resolution order:
// 1. workflow.userDataResult (from "Get User Data" action output)
// 2. user.data (v2 API)
// 3. user.tags (legacy/init userData)
// 4. event/conversation fallbacks
// 5. DEFAULT_DOMAIN

// ===== CONFIGURATION =====
const USE_HARDCODED_DOMAIN = false; // Set to TRUE for testing in Botpress Studio
const HARDCODED_DOMAIN = 'flashfurnacerepair.com'; // Only used if above is TRUE
const DEFAULT_DOMAIN = 'default.com'; // Fallback if no domain found
// =========================

console.log('');
console.log('========================================');
console.log('🔍 KB SEARCH EXECUTE CODE - START');
console.log('========================================');
console.log('');

// ===== DEBUG: LOG ALL AVAILABLE DATA =====
console.log('===== ALL AVAILABLE DATA =====');
console.log('workflow.userDataResult:', JSON.stringify(workflow.userDataResult, null, 2));
console.log('user:', JSON.stringify(user, null, 2));
console.log('event.payload:', JSON.stringify(event.payload, null, 2));
console.log('conversation:', JSON.stringify(conversation, null, 2));
console.log('');

// ===== EXTRACT userData FROM "Get User Data" ACTION =====
// The "Get User Data" action stores its output in workflow.userDataResult
// The userData from init() is typically in: userDataResult.userData or userDataResult directly
const actionResult = workflow.userDataResult || {};
const userDataFromAction = actionResult.userData || actionResult.data || actionResult || {};

console.log('===== USER DATA FROM ACTION =====');
console.log('actionResult:', JSON.stringify(actionResult, null, 2));
console.log('userDataFromAction:', JSON.stringify(userDataFromAction, null, 2));
console.log('');

// ===== DETERMINE SEARCH DOMAIN =====
let searchDomain;
let kbFileId;

if (USE_HARDCODED_DOMAIN) {
    // Testing mode: use hardcoded domain
    searchDomain = HARDCODED_DOMAIN;
    kbFileId = null;
    console.log('🔧 USING HARDCODED DOMAIN:', searchDomain);
} else {
    // Production mode: Check multiple sources in priority order
    // Priority 1: "Get User Data" action result (workflow variable)
    // Priority 2: user.data (v2 API)
    // Priority 3: user.tags (legacy init userData)
    // Priority 4: Various fallbacks

    searchDomain = userDataFromAction.domain       // ← From "Get User Data" action
        || user.data?.domain                        // ← v2 API: updateUser({ data: {...} })
        || user.tags?.domain                        // ← Legacy: init({ userData: {...} })
        || user.domain                              // ← Direct property (if set)
        || user.userData?.domain                    // ← Nested userData (alternative)
        || event.payload?.domain                    // ← Event payload
        || event.payload?.metadata?.domain          // ← Event metadata
        || conversation.domain                      // ← Stored in conversation
        || conversation.tags?.domain                // ← Conversation tags
        || DEFAULT_DOMAIN;                          // ← Last resort

    // Get fileId with same priority order
    kbFileId = userDataFromAction.fileId           // ← From "Get User Data" action
        || user.data?.fileId                        // ← v2 API
        || user.tags?.fileId                        // ← Legacy
        || user.kbFileId                            // ← Direct property
        || user.userData?.fileId                    // ← Nested
        || event.payload?.fileId                    // ← Event payload
        || event.payload?.metadata?.fileId          // ← Event metadata
        || null;

    console.log('===== DOMAIN RESOLUTION =====');
    console.log('Source checks:');
    console.log('  1. userDataFromAction.domain:', userDataFromAction.domain);
    console.log('  2. user.data?.domain:', user.data?.domain);
    console.log('  3. user.tags?.domain:', user.tags?.domain);
    console.log('  4. user.domain:', user.domain);
    console.log('  5. event.payload?.domain:', event.payload?.domain);
    console.log('  6. conversation.domain:', conversation.domain);
    console.log('');
    console.log('✅ RESOLVED searchDomain:', searchDomain);
    console.log('✅ RESOLVED kbFileId:', kbFileId);
    console.log('');
}

// ===== SEARCH KB (OPTIMIZED PATH) =====
let kbResults;

if (kbFileId) {
    // FAST PATH: Use specific file ID directly (no search needed!)
    console.log('===== USING SPECIFIC KB FILE (OPTIMIZED) =====');
    console.log('File ID:', kbFileId);
    console.log('Query:', event.preview);
    console.log('');

    try {
        // Search only this specific file
        kbResults = await client.searchFiles({
            fileId: kbFileId,  // Direct file lookup - faster!
            query: event.preview,
            limit: 10
        });
    } catch (error) {
        console.error('❌ Error searching specific file:', error);
        console.log('Falling back to domain tag search');
        kbResults = null;  // Will trigger fallback below
    }
}

// FALLBACK PATH: Search by domain tag if no fileId or fileId search failed
if (!kbFileId || !kbResults) {
    console.log('===== SEARCHING KB BY DOMAIN TAG =====');
    console.log('Tags:', JSON.stringify({ domain: searchDomain }, null, 2));
    console.log('Query:', event.preview);
    console.log('');

    try {
        kbResults = await client.searchFiles({
            tags: {
                domain: searchDomain
            },
            query: event.preview,
            limit: 10
        });
    } catch (error) {
        console.error('❌ Error searching domain-specific KB by tag:', error);
        kbResults = { passages: [] };
    }
}

// Log search results (regardless of which path was used)
console.log('📊 Search results:');
console.log('  Total passages found:', kbResults?.passages?.length || 0);

if (kbResults?.passages && kbResults.passages.length > 0) {
    console.log('  Passages details:');
    kbResults.passages.forEach((passage, index) => {
        console.log(`    [${index}] fileId: ${passage.fileId}, score: ${passage.score}, length: ${passage.content?.length || 0} chars`);
    });
}
console.log('');

// ===== PROCESS RESULTS =====
let kbContext = '';
let foundDomainKB = false;

if (kbResults.passages && kbResults.passages.length > 0) {
    console.log('===== PROCESSING RESULTS =====');

    // Get unique file IDs
    const uniqueFileIds = [...new Set(kbResults.passages.map(p => p.fileId))];
    console.log('Files found:', uniqueFileIds.length);
    console.log('File IDs:', uniqueFileIds);
    console.log('');

    if (kbFileId) {
        // If specific fileId was passed, filter to only that file
        console.log('🎯 Filtering to specific file:', kbFileId);
        const filteredPassages = kbResults.passages.filter(p => p.fileId === kbFileId);

        if (filteredPassages.length > 0) {
            kbContext = filteredPassages.map(p => p.content).join('\n\n');
            foundDomainKB = true;
            console.log('✅ Found', filteredPassages.length, 'passages in file:', kbFileId);
        } else {
            console.log('⚠️ No passages found in specified file:', kbFileId);
            console.log('Falling back to all passages from domain');
            kbContext = kbResults.passages.map(p => p.content).join('\n\n');
            foundDomainKB = true;
        }
    } else {
        // Use first file only to avoid mixing different domains
        const firstFileId = uniqueFileIds[0];
        const firstFilePassages = kbResults.passages.filter(p => p.fileId === firstFileId);
        kbContext = firstFilePassages.map(p => p.content).join('\n\n');
        foundDomainKB = true;

        console.log('🎯 Using FIRST file only:', firstFileId);
        console.log('   Passages from this file:', firstFilePassages.length);

        if (uniqueFileIds.length > 1) {
            console.log('⚠️ Multiple files found for this domain, using first one only');
            console.log('   Other files ignored:', uniqueFileIds.slice(1));
        }
    }

    console.log('✅ SUCCESS: Using domain-specific KB');
    console.log('  Domain:', searchDomain);
    console.log('  File:', kbFileId || uniqueFileIds[0]);
    console.log('  Context length:', kbContext.length, 'chars');
    console.log('');
} else {
    console.log('⚠️ NO PASSAGES found for domain:', searchDomain);
    console.log('');
}

// ===== FALLBACK TO DEFAULT KB =====
if (!foundDomainKB) {
    console.log('===== SEARCHING DEFAULT KB =====');
    console.log('Tags:', JSON.stringify({ source: 'knowledge-base' }, null, 2));
    console.log('');

    try {
        const defaultKbResults = await client.searchFiles({
            tags: {
                source: 'knowledge-base'
            },
            query: event.preview,
            limit: 5
        });

        if (defaultKbResults.passages && defaultKbResults.passages.length > 0) {
            kbContext = defaultKbResults.passages.map(p => p.content).join('\n\n');
            console.log('✅ SUCCESS: Using default KB');
            console.log('  Passages found:', defaultKbResults.passages.length);
            console.log('  Context length:', kbContext.length, 'chars');
            console.log('');
        } else {
            console.log('⚠️ NO PASSAGES found in default KB either');
            console.log('');
        }
    } catch (error) {
        console.error('❌ Error searching default KB:', error);
    }
}

// ===== SET WORKFLOW VARIABLES =====
workflow.kbContext = kbContext;
workflow.searchDomain = searchDomain;
workflow.foundDomainKB = foundDomainKB;

// Store domain in conversation for future messages
if (searchDomain && searchDomain !== DEFAULT_DOMAIN) {
    conversation.domain = searchDomain;
    console.log('💾 Stored domain in conversation:', searchDomain);
}

console.log('');
console.log('========================================');
console.log('✅ KB SEARCH COMPLETE');
console.log('========================================');
console.log('Summary:');
console.log('  Found KB:', !!kbContext);
console.log('  Search method:', foundDomainKB ? 'domain-specific' : 'default');
console.log('  Domain used:', searchDomain);
console.log('  File ID used:', kbFileId || '(searched by tag)');
console.log('  Context length:', kbContext.length, 'chars');
console.log('========================================');
console.log('');
```

### Testing Configuration (Studio Emulator)

When testing in Botpress Studio Emulator (without Magic Page app):

1. Change line 8: `const USE_HARDCODED_DOMAIN = true;`
2. Change line 9: `const HARDCODED_DOMAIN = 'your-test-domain.com';`
3. Publish bot
4. Test in Emulator

**Logs will show:**
```
🔧 USING HARDCODED DOMAIN: your-test-domain.com
```

### Production Configuration (With Magic Page)

When deploying to production (with Magic Page app):

1. Change line 8: `const USE_HARDCODED_DOMAIN = false;`
2. Publish bot
3. Domain will come from `user.tags.domain` (passed via `init()`)

**Logs will show:**
```
===== DYNAMIC DOMAIN RESOLUTION =====
user.tags?.domain: gibbonheating.com
RESOLVED searchDomain: gibbonheating.com
```

---

## 4. AI Task Instructions (Autonomous Node)

This is the prompt/instructions for your AI Task node (LLM node) that generates responses.

### Where to Configure This

1. Open your workflow in Botpress Studio
2. Add an **AI Task** card (or **Agent** card)
3. Place it **AFTER** your Execute Code card
4. Name it: "Generate Response"

### AI Task Configuration

#### Agent / Task Settings

- **Model:** GPT-4 (recommended) or Claude Sonnet 3.5
- **Temperature:** 0.7 (balanced creativity and consistency)
- **Max Tokens:** 500-1000 (adjust based on desired response length)

#### Instructions / System Prompt

Copy and paste this into the **Instructions** field:

```
You are a helpful AI assistant representing {{workflow.searchDomain}}.

Your role is to answer questions about this business using ONLY the information provided in the Knowledge Base context below.

## Knowledge Base Context

{{workflow.kbContext}}

## Instructions

1. **Answer based on context ONLY:** Only use information from the Knowledge Base context above. Do not make up or infer information that is not explicitly stated.

2. **Be helpful and conversational:** Provide clear, friendly, professional responses that sound natural.

3. **Be concise:** Keep responses focused and to the point. Avoid unnecessary elaboration.

4. **Handle missing information gracefully:** If the context doesn't contain the answer, politely say something like:
   - "I don't have that specific information available right now."
   - "That's not covered in the information I have access to."
   - "I'd recommend contacting {{workflow.searchDomain}} directly for that information."

5. **No hallucinations:** Never invent services, prices, hours, locations, or other details that aren't in the context.

6. **Stay on topic:** Keep responses relevant to the business and its services.

7. **Be positive and professional:** Represent the business in a positive light.

## User Question

{{event.preview}}

## Your Response

Provide a helpful, accurate answer based solely on the Knowledge Base context above.
```

### Alternative: Shorter Instructions (Minimal Version)

If you prefer a simpler prompt:

```
You are a helpful assistant for {{workflow.searchDomain}}.

Use the following context to answer the user's question accurately and concisely:

{{workflow.kbContext}}

Rules:
- Only use information from the context above
- If the context doesn't contain the answer, say you don't have that information
- Be friendly and professional
- Keep responses focused and concise

User Question: {{event.preview}}
```

---

## 5. Complete Workflow Diagram

Here's how your complete workflow should be structured:

```
┌─────────────────────────────────────────────────────────────┐
│                        START NODE                            │
│                 (Triggered on message)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│             GET USER DATA ACTION                             │
│            (Webchat Integration)                             │
│                                                              │
│  • User ID: {{event.userId}}                                │
│  • Output → userDataResult ⚠️ CRITICAL                      │
│                                                              │
│  Retrieves userData from bp.init() call                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              EXECUTE CODE CARD                               │
│         "KB Search - Dynamic Domain"                         │
│                                                              │
│  • Reads domain from workflow.userDataResult FIRST          │
│  • Falls back to user.data, user.tags, etc.                 │
│  • Searches Knowledge Base by fileId or domain tag          │
│  • Sets workflow variables:                                 │
│    - workflow.kbContext (KB passages)                       │
│    - workflow.searchDomain (domain name)                    │
│    - workflow.foundDomainKB (true/false)                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   AI TASK CARD                               │
│              "Generate Response"                             │
│                                                              │
│  Instructions:                                               │
│  "You are a helpful assistant for {{workflow.searchDomain}}"│
│  "Use this context: {{workflow.kbContext}}"                 │
│  "Answer: {{event.preview}}"                                │
│                                                              │
│  Model: GPT-4 or Claude Sonnet 3.5                          │
│  Temperature: 0.7                                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   TEXT CARD                                  │
│              "Send AI Response"                              │
│                                                              │
│  Message: {{turn.Agent.output}}                             │
│  (or whatever variable your AI Task outputs to)             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
                   [END]
```

### Optional: Add Conditional Logic

If you want to handle cases where no KB is found:

```
┌─────────────────────────────────────────────────────────────┐
│              EXECUTE CODE CARD                               │
│         "KB Search - Dynamic Domain"                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              IF/ELSE CARD                                    │
│   Condition: workflow.foundDomainKB === true                │
└───────┬─────────────────────────────────────┬───────────────┘
        │ TRUE                                 │ FALSE
        ▼                                      ▼
┌───────────────────┐              ┌─────────────────────────┐
│   AI TASK         │              │    TEXT CARD            │
│   (with KB)       │              │  "Sorry, no info"       │
└───────────────────┘              └─────────────────────────┘
```

---

## 6. Testing & Debugging

### Testing in Botpress Studio Emulator

**Step 1: Enable Hardcoded Domain**
```javascript
const USE_HARDCODED_DOMAIN = true;
const HARDCODED_DOMAIN = 'flashfurnacerepair.com';
```

**Step 2: Publish Bot**
Click **Publish** in Botpress Studio

**Step 3: Open Emulator**
Click **Test** or **Emulator** icon

**Step 4: Send Test Message**
```
What services do you offer?
```

**Step 5: Check Logs**
Click **Logs** tab, look for:
```
🔧 USING HARDCODED DOMAIN: flashfurnacerepair.com
===== SEARCHING DOMAIN-SPECIFIC KB BY TAG =====
Tags: {"domain":"flashfurnacerepair.com"}
✅ SUCCESS: Using domain-specific KB
```

### Testing with Magic Page App

**Step 1: Disable Hardcoded Domain**
```javascript
const USE_HARDCODED_DOMAIN = false;
```

**Step 2: Publish Bot**
Click **Publish**

**Step 3: Run Magic Page**
```
http://localhost:3000
or
http://mp.membies.com:3000
```

**Step 4: Process Domain**
Enter website: `https://gibbonheating.com`

**Step 5: Send Message in Chat**
Type: "What services do you offer?"

**Step 6: Check Botpress Studio Logs**
Go to Botpress Studio → Logs tab, look for:
```
===== DYNAMIC DOMAIN RESOLUTION =====
user.tags?.domain: gibbonheating.com
RESOLVED searchDomain: gibbonheating.com

===== USING SPECIFIC KB FILE (OPTIMIZED) =====
File ID: file_01KAVE7RVEJ4TH277404ZW495G

✅ SUCCESS: Using domain-specific KB
  Domain: gibbonheating.com
  File: file_01KAVE7RVEJ4TH277404ZW495G
  Context length: 2453 chars
```

### Common Issues & Solutions

#### Issue 1: "user.data?.domain: undefined" or "user.tags?.domain: undefined"

**Problem:** Domain not being passed from frontend

**Solution:**
1. Check browser console for: `✅ User data set via updateUser()`
2. Verify `webchat:initialized` event fires BEFORE `updateUser()` is called
3. Check that the listener is attached BEFORE config script loads
4. For v2 API, data is in `user.data`, not `user.tags`

#### Issue 2: "NO PASSAGES found for domain"

**Problem:** KB not indexed or wrong domain tag

**Solution:**
1. Check KB file exists: `node scripts/kb-manager.js list`
2. Verify domain tag matches (sanitized, no www)
3. Check indexing completed (not `indexing_pending`)

#### Issue 3: "foundDomainKB: false"

**Problem:** No domain-specific KB found, using default

**Solution:**
1. Verify KB was created: Check Magic Page logs
2. Check domain sanitization matches
3. Upload KB manually if needed: `node scripts/kb-manager.js push ...`

#### Issue 4: AI response is generic (not domain-specific)

**Problem:** KB context is empty or not being used

**Solution:**
1. Check Execute Code logs show `Context length: XXX chars`
2. Verify AI Task uses `{{workflow.kbContext}}` in instructions
3. Check AI Task is after Execute Code in workflow

---

## Summary Checklist

### ✅ Variables Created
- [ ] `userDataResult` (Object) - **CRITICAL for userData**
- [ ] `kbContext` (String)
- [ ] `searchDomain` (String)
- [ ] `foundDomainKB` (Boolean)

### ✅ Get User Data Action
- [ ] Added "Get User Data" action to workflow
- [ ] User ID set to `{{event.userId}}`
- [ ] **Output stored in `userDataResult`** - CRITICAL!
- [ ] Placed BEFORE Execute Code card

### ✅ Execute Code Card
- [ ] Pasted complete code (with `workflow.userDataResult` check)
- [ ] Set `USE_HARDCODED_DOMAIN = false` for production
- [ ] Placed AFTER "Get User Data" action
- [ ] Placed BEFORE AI Task node

### ✅ AI Task Card
- [ ] Added instructions with `{{workflow.kbContext}}`
- [ ] Set model to GPT-4 or Claude Sonnet 3.5
- [ ] Set temperature to 0.7
- [ ] Placed AFTER Execute Code node

### ✅ Testing
- [ ] Tested in Studio Emulator (hardcoded domain)
- [ ] Tested with Magic Page app (dynamic domain)
- [ ] Verified logs show `workflow.userDataResult` populated
- [ ] Verified logs show correct domain resolution
- [ ] Verified KB context is being found
- [ ] Verified AI responses are domain-specific

### ✅ Published
- [ ] Clicked **Publish** in Botpress Studio
- [ ] Changes are live

---

**You're all set!** Your bot should now dynamically search domain-specific Knowledge Bases based on the userData passed from your Magic Page application.
