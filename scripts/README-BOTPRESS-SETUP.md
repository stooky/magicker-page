# Botpress Bot Setup Guide

This guide explains how to configure your Botpress bot to use domain-specific Knowledge Base files based on the official Botpress best practices.

## Overview

The Magic Page system passes the user's domain (e.g., `gibbonheating.com`) to the Botpress bot using `userData`. The bot then searches only that domain's KB file when answering questions.

## How It Works

```
User visits Magic Page → Valhallah component loads → Webchat initializes
                                    ↓
                      userData passed: { domain, website, sessionID }
                                    ↓
                         User asks: "What services do you offer?"
                                    ↓
                    Bot Execute Code reads: event.user.domain
                                    ↓
              Searches KB with tags: { domain: "gibbonheating.com" }
                                    ↓
                    Returns only first matching file's content
                                    ↓
                         AI generates domain-specific response
```

## Frontend Setup (Already Complete)

The `components/Valhallah.js` file:
1. Intercepts `window.botpressWebChat.mergeConfig()`
2. Adds userData with domain, website, and sessionID
3. Config script initializes webchat with this userData

## Bot Workflow Setup (You Need to Configure)

### Step 1: Add Execute Code Card for KB Search

In your Botpress Studio workflow:

1. **Add an "Execute Code" card** BEFORE your AI Task
2. **Name it**: "KB Search with Domain"
3. **Copy and paste** the code from `scripts/bot-execute-code-kb-search.js`

This code will:
- Read `event.user.domain` (passed via userData)
- Search KB files tagged with that domain
- Use ONLY the first matching file (most relevant)
- Fall back to default KB if no domain-specific KB exists

### Step 2: Configure Workflow Variables

The Execute Code sets these workflow variables:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `workflow.kbContext` | The KB content to use as context | "Gibbon Heating offers..." |
| `workflow.kbFound` | Whether any KB was found | `true` or `false` |
| `workflow.kbFile` | The file ID that was used | `file_abc123` |
| `workflow.searchDomain` | The domain that was searched | `gibbonheating.com` |

### Step 3: Update Your AI Task

In your "AI Task" or "Generate Answer" card:

1. **Add KB context to the prompt**:
```
You are a helpful assistant for {{workflow.searchDomain}}.

Use the following knowledge base information to answer the user's question:

{{workflow.kbContext}}

User question: {{event.preview}}

Instructions:
- Answer based on the knowledge base above
- Be helpful and conversational
- If the KB doesn't contain the answer, say so politely
```

2. **Optional: Add a condition** before the AI Task:
   - If `workflow.kbFound === false` → Send a message like "I don't have specific information about that yet."
   - If `workflow.kbFound === true` → Continue to AI Task with context

### Step 4: Optional - Add Debug Logging Card

For testing, add a "Send Message" card after KB Search (only visible during testing):

**Message**:
```
Debug Info:
- Domain: {{workflow.searchDomain}}
- Found KB: {{workflow.kbFound}}
- File used: {{workflow.kbFile}}
- Context length: {{workflow.kbContext.length}}
```

Remove this card in production.

## Accessing userData in Your Bot

According to Botpress documentation, userData is available in multiple ways:

### Method 1: Directly in Execute Code (Recommended)
```javascript
const domain = event.user?.domain || '';
const website = event.user?.website || '';
const sessionID = event.user?.sessionID || '';
```

### Method 2: In Variable Expressions
Use in any text field or condition:
```
{{event.user.domain}}
{{event.user.website}}
{{event.user.sessionID}}
```

### Method 3: Using "Get User Data" Card (Not Needed)
You can use a "Get User Data" card with `{{event.userId}}` but it's not necessary since userData is already available in `event.user`.

## Testing the Bot

### Test 1: Verify userData is Received

1. Open your Magic Page with a domain (e.g., `http://localhost:3000?domain=gibbonheating.com`)
2. Open browser console
3. Look for log: `[VALHALLAH] Config with userData: {...}`
4. Open Botpress Logs
5. Send a test message
6. Look for log: `Domain from userData: gibbonheating.com`

### Test 2: Verify Domain-Specific KB is Used

1. Upload a KB file for `gibbonheating.com` using kb-manager:
```bash
node scripts/kb-manager.js push gibbonheating-kb.txt domain=gibbonheating.com,source=knowledge-base
```

2. Ask a question that's specific to that KB
3. Check Botpress logs:
   - Should see: `✅ Using domain-specific KB for: gibbonheating.com`
   - Should see: `Using only file: [fileId]`

4. Verify the response uses information from that domain's KB

### Test 3: Verify Fallback to Default KB

1. Use a domain that has NO KB file
2. Ask a general question
3. Check Botpress logs:
   - Should see: `⚠️ No passages found for domain: [domain]`
   - Should see: `Searching default KB...`
   - Should see: `✅ Using default KB`

## Troubleshooting

### Issue: "No domain in userData"

**Cause**: userData not being passed to bot

**Fix**:
1. Check browser console for `[VALHALLAH] Config with userData`
2. Verify `mergeConfig` was intercepted
3. Check that domain prop is passed to Valhallah component

### Issue: "No passages found for domain"

**Cause**: No KB file exists for that domain

**Fix**:
1. Check that KB file was uploaded with correct tag:
```bash
node scripts/kb-manager.js list
```
2. Verify the tag matches: `domain=gibbonheating.com` (exact match)
3. Make sure file was uploaded with `index: true`

### Issue: Bot uses wrong domain's KB

**Cause**: Multiple files for same domain, or wrong domain in userData

**Fix**:
1. The code now uses ONLY the first file for a domain
2. Clean up duplicate files:
```bash
node scripts/kb-manager.js list
# Then delete duplicates
```
3. Verify correct domain in browser console logs

### Issue: "event.user is undefined"

**Cause**: Botpress webchat version incompatibility or userData not supported

**Fix**:
1. Verify you're using Botpress Cloud (not self-hosted)
2. Check that webchat v3.4 or later is being used
3. Try alternative: Access via conversation state instead of user data

## Production Checklist

- [ ] Remove debug logging from Execute Code
- [ ] Remove debug message cards from workflow
- [ ] Test with multiple domains
- [ ] Verify fallback to default KB works
- [ ] Upload default KB file with `source=default` tag
- [ ] Set up KB file cleanup process
- [ ] Monitor Botpress logs for errors
- [ ] Test that only first file per domain is used

## References

- [Botpress Webchat Documentation](https://botpress.com/docs/webchat/)
- [Botpress File Search API](https://botpress.com/docs/api-reference/)
- [Magic Page KB Manager](./README-KB-MANAGER.md)

## Summary

**What was implemented:**
1. ✅ Frontend passes domain via userData (Botpress best practice)
2. ✅ Bot reads domain from `event.user.domain`
3. ✅ KB search filters by domain tag
4. ✅ Only first matching file is used (prevents duplicates)
5. ✅ Falls back to default KB if no domain KB exists

**What you need to do:**
1. Copy Execute Code from `scripts/bot-execute-code-kb-search.js` into Botpress Studio
2. Update AI Task to use `workflow.kbContext` variable
3. Test with your domains
4. Clean up any duplicate KB files
