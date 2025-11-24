# Botpress Execute Code - Toggle Mode Guide

## Overview

The Execute Code now has a **toggle mode** that lets you switch between:
1. **Hardcoded domain** (for testing in Botpress Studio emulator)
2. **Dynamic domain** (for production use from Magic Page app)

## File Location

`scripts/bot-execute-code-WITH-TOGGLE.js`

## Configuration

At the top of the Execute Code, you'll find:

```javascript
// ========== CONFIGURATION ==========
const USE_HARDCODED_DOMAIN = true; // Set to FALSE for production
const HARDCODED_DOMAIN = 'flashfurnacerepair.com'; // Domain to use when testing
// ===================================
```

## Mode 1: Hardcoded Domain (Testing)

**Use this when:**
- Testing in Botpress Studio emulator
- You don't have the Magic Page app running
- You want to quickly test a specific domain's KB

**Setup:**
1. Set `USE_HARDCODED_DOMAIN = true`
2. Set `HARDCODED_DOMAIN = 'flashfurnacerepair.com'` (or whatever domain you want)
3. Save and Publish in Botpress Studio
4. Test in the Emulator

**What happens:**
- Bot will ALWAYS search for the hardcoded domain's KB
- Ignores any domain passed from messages
- Perfect for testing specific KB content

## Mode 2: Dynamic Domain (Production)

**Use this when:**
- Running from the Magic Page app
- You want domain to be extracted from user messages
- Production deployment

**Setup:**
1. Set `USE_HARDCODED_DOMAIN = false`
2. Save and Publish in Botpress Studio
3. Run Magic Page flow with any domain

**What happens:**
- Bot extracts domain from `[DOMAIN:...]` prefix in first message
- Stores domain in conversation state
- Uses stored domain for all subsequent messages
- Falls back to default KB if no domain found

## Debug Logging

Both modes include extensive logging:

### Browser Console (Magic Page)
```
========================================
[VALHALLAH] COMPONENT MOUNTED
========================================
Props received:
  domain: flashfurnacerepair.com
  website: http://flashfurnacerepair.com
  sessionID: abc123
...

========================================
[VALHALLAH] 🎯 INTERCEPTING FIRST MESSAGE
========================================
Original text: What services do you offer?
Domain to inject: flashfurnacerepair.com
Modified text: [DOMAIN:flashfurnacerepair.com] What services do you offer?
✅ Sending modified event to Botpress
========================================
```

### Botpress Logs (Studio)
```
========================================
🔍 KB SEARCH EXECUTE CODE - START
========================================

===== CONFIGURATION =====
USE_HARDCODED_DOMAIN: true
HARDCODED_DOMAIN: flashfurnacerepair.com

===== FULL EVENT OBJECT =====
event.preview: [DOMAIN:flashfurnacerepair.com] What services do you offer?
...

===== SEARCHING DOMAIN-SPECIFIC KB =====
Tags: {"domain":"flashfurnacerepair.com"}
Query: What services do you offer?

📊 Search results:
  Total passages found: 5
  Passages details:
    [0] fileId: file_abc123, score: 0.85, length: 423 chars
    [1] fileId: file_abc123, score: 0.72, length: 312 chars
    ...

🎯 Using FIRST file only: file_abc123
✅ SUCCESS: Using domain-specific KB
  Domain: flashfurnacerepair.com
  File: file_abc123
  Context length: 735 chars

========================================
✅ KB SEARCH COMPLETE
========================================
Summary:
  Found KB: true
  Search method: domain-specific
  Domain used: flashfurnacerepair.com
  File used: file_abc123
  Context length: 735 chars
========================================
```

## Testing Checklist

### Test 1: Hardcoded Mode (Emulator)
- [ ] Set `USE_HARDCODED_DOMAIN = true`
- [ ] Set `HARDCODED_DOMAIN = 'flashfurnacerepair.com'`
- [ ] Publish bot
- [ ] Open Emulator in Botpress Studio
- [ ] Send message: "What services do you offer?"
- [ ] Check Logs for: `🔧 USING HARDCODED DOMAIN: flashfurnacerepair.com`
- [ ] Check Logs for: `✅ SUCCESS: Using domain-specific KB`
- [ ] Verify response uses flashfurnacerepair.com KB content

### Test 2: Dynamic Mode (Magic Page App)
- [ ] Set `USE_HARDCODED_DOMAIN = false`
- [ ] Publish bot
- [ ] Run Magic Page: `http://localhost:3000`
- [ ] Enter: `https://www.flashfurnacerepair.com/`
- [ ] Wait for Valhallah screen to load
- [ ] Check browser console for: `Domain to inject: flashfurnacerepair.com`
- [ ] Send first message in chat
- [ ] Check browser console for: `Modified text: [DOMAIN:...]`
- [ ] Check Botpress Logs for: `✅ EXTRACTED and STORED domain`
- [ ] Verify response uses domain-specific KB

### Test 3: Fallback to Default
- [ ] Set `USE_HARDCODED_DOMAIN = true`
- [ ] Set `HARDCODED_DOMAIN = 'nonexistent-domain.com'`
- [ ] Publish bot
- [ ] Test in Emulator
- [ ] Check Logs for: `⚠️ NO PASSAGES found for domain`
- [ ] Check Logs for: `===== SEARCHING DEFAULT KB =====`
- [ ] Check Logs for: `✅ SUCCESS: Using default KB`
- [ ] Verify response uses default KB content

## Troubleshooting

### Issue: Bot always uses default KB in hardcoded mode

**Check:**
- Is `USE_HARDCODED_DOMAIN = true`?
- Does the KB file exist for that domain?
- Run `node scripts/kb-manager.js list` to verify KB exists

**Fix:**
- Upload KB file: `node scripts/kb-manager.js push flashfurnacerepair-kb.txt domain=flashfurnacerepair.com,source=knowledge-base`

### Issue: Domain not being extracted from message

**Check browser console:**
- Do you see `🎯 INTERCEPTING FIRST MESSAGE`?
- Does modified text show `[DOMAIN:...]` prefix?

**Check Botpress logs:**
- Do you see the `[DOMAIN:...]` in `event.preview`?
- Is the regex matching correctly?

**Fix:**
- Verify sendEvent interception is working
- Check that first message flag is resetting properly

### Issue: Multiple KB files for same domain

**Symptom:**
- Logs show multiple fileIds for same domain
- But code uses only first file (correct behavior)

**Fix:**
- Clean up duplicate files:
```bash
node scripts/kb-manager.js list
# Identify duplicates
# Delete old ones (keep most recent)
```

## Production Deployment Checklist

Before deploying to production:
- [ ] Set `USE_HARDCODED_DOMAIN = false`
- [ ] Remove or minimize console.log statements (optional)
- [ ] Test with multiple domains
- [ ] Verify default KB fallback works
- [ ] Test conversation persistence (domain stays stored)
- [ ] Clean up any duplicate KB files

## Summary

| Mode | Use Case | Setting | Domain Source |
|------|----------|---------|---------------|
| Hardcoded | Testing, Emulator | `true` | Variable in code |
| Dynamic | Production, App | `false` | Message prefix |

Both modes include:
- ✅ Extensive debug logging
- ✅ First file only (prevents duplicate mixing)
- ✅ Fallback to default KB
- ✅ Conversation state persistence
