# userData Integration Guide

How to pass domain context from Magic Page to Botpress using userData (cleaner than message prefixing).

---

## Overview

**Old Method:** Prefixing messages with `[DOMAIN:example.com]`
- ❌ Messy - domain shows in chat history
- ❌ Requires parsing every message
- ❌ Can be accidentally removed by user

**New Method:** Pass via `userData` in webchat init
- ✅ Clean - invisible to users
- ✅ Accessible in bot via `user.domain` or `user.userData.domain`
- ✅ Persistent across conversation

---

## Implementation Steps

### Step 1: Update Frontend (Valhallah.js)

**Already done!** The component now uses `mergeConfig` to pass userData:

```javascript
window.botpressWebChat.mergeConfig({
    userData: {
        domain: domain,        // e.g., 'jobheating.com'
        website: website,      // e.g., 'https://jobheating.com'
        sessionID: sessionID   // e.g., 'gxqih9'
    }
});
```

**Logs to verify:**
```
========================================
[VALHALLAH] 🎯 INITIALIZING BOTPRESS WEBCHAT
========================================
Domain: jobheating.com
Website: https://jobheating.com
SessionID: gxqih9
✅ userData configured in webchat
========================================
```

---

### Step 2: Update Botpress Execute Code Card

**Use the new script:** `bot-execute-code-WITH-USERDATA.js`

This script:
1. Checks `user.domain` or `user.userData.domain`
2. Falls back to `event.payload.domain` or `conversation.domain`
3. Uses hardcoded domain if testing in Studio
4. Searches KB by domain tag
5. Falls back to default KB if no domain-specific KB found

**Debug output includes:**
```
===== ALL AVAILABLE DATA =====
user: { "domain": "jobheating.com", ... }
event.payload: { ... }
conversation: { "domain": "jobheating.com", ... }

===== DYNAMIC DOMAIN RESOLUTION =====
user.domain: jobheating.com
RESOLVED searchDomain: jobheating.com
```

---

### Step 3: Copy Execute Code to Botpress Studio

1. **Open Botpress Studio:**
   - Go to https://studio.botpress.cloud
   - Open your bot

2. **Find the Execute Code card** in your workflow

3. **Replace with new code:**
   - Copy contents of `bot-execute-code-WITH-USERDATA.js`
   - Paste into Execute Code card
   - **Publish** the bot

4. **Configure for production:**
   ```javascript
   const USE_HARDCODED_DOMAIN = false; // Make sure this is FALSE
   ```

---

## Testing

### Test in Botpress Studio Emulator

**For testing WITHOUT Magic Page app:**

1. Set `USE_HARDCODED_DOMAIN = true`
2. Set `HARDCODED_DOMAIN = 'your-test-domain.com'`
3. Publish bot
4. Test in Emulator - should use hardcoded domain

**Logs will show:**
```
🔧 USING HARDCODED DOMAIN: your-test-domain.com
```

### Test with Magic Page App

**For testing WITH Magic Page app:**

1. Set `USE_HARDCODED_DOMAIN = false`
2. Publish bot
3. Run Magic Page: `http://mp.membies.com:3000`
4. Enter a website (e.g., `https://jobheating.com`)
5. Open browser console
6. Submit and wait for chat
7. Send a message

**Frontend logs (browser console):**
```
[VALHALLAH] 🎯 INITIALIZING BOTPRESS WEBCHAT
Domain: jobheating.com
Website: https://jobheating.com
SessionID: abc123
✅ userData configured in webchat
```

**Backend logs (Botpress Studio):**
```
===== DYNAMIC DOMAIN RESOLUTION =====
user.domain: jobheating.com
RESOLVED searchDomain: jobheating.com

===== SEARCHING DOMAIN-SPECIFIC KB =====
Tags: {"domain":"jobheating.com"}

✅ SUCCESS: Using domain-specific KB
  Domain: jobheating.com
  File: file_01KAVE7RVEJ4TH277404ZW495G
  Context length: 2453 chars
```

---

## Debugging

### If domain is NOT being passed:

**Check browser console for:**
```
✅ userData configured in webchat
```

If you don't see this, `mergeConfig` isn't working. Verify:
- Botpress webchat version supports `mergeConfig`
- Config script loaded before calling `mergeConfig`
- No JavaScript errors

### If domain is not accessible in bot:

**Check Botpress Studio logs for:**
```
===== ALL AVAILABLE DATA =====
user: { ... }
```

Look for `domain` field. It should be in:
- `user.domain`
- `user.userData.domain`
- `conversation.domain` (after first message)

If not found anywhere, the userData isn't being sent to Botpress Cloud.

---

## Configuration Options

### In Frontend (Valhallah.js)

**What's passed:**
```javascript
userData: {
    domain: domain,        // Sanitized domain (e.g., 'jobheating.com')
    website: website,      // Full URL (e.g., 'https://jobheating.com')
    sessionID: sessionID   // Session ID (e.g., 'gxqih9')
}
```

**You can add more:**
```javascript
userData: {
    domain: domain,
    website: website,
    sessionID: sessionID,
    fileId: kbFileId,      // If you want to pass specific KB file ID
    companyName: name,     // If you collect company name
    email: email           // If you collect email
}
```

### In Execute Code (bot-execute-code-WITH-USERDATA.js)

**Domain resolution order:**
1. `user.domain` - Direct property
2. `user.userData.domain` - Nested in userData object
3. `event.payload.domain` - From message payload
4. `conversation.domain` - Stored from previous message
5. `DEFAULT_DOMAIN` - Fallback

**Optional file ID:**
```javascript
const kbFileId = user.kbFileId || user.userData?.fileId || null;
```

If provided, bot will use ONLY that file instead of searching by domain.

---

## Migration from Old Method

### Remove Message Prefixing

**Old code (in Valhallah.js):**
```javascript
// DON'T USE THIS ANYMORE
const modifiedEvent = {
    ...event,
    payload: {
        ...event.payload,
        text: `[DOMAIN:${domain}] ${event.payload.text}`
    }
};
```

**New code (already updated):**
```javascript
// USE THIS INSTEAD
window.botpressWebChat.mergeConfig({
    userData: {
        domain: domain,
        website: website,
        sessionID: sessionID
    }
});
```

### Update Execute Code

**Old code (in bot):**
```javascript
// Extract domain from message prefix
const domainMatch = event.preview.match(/\[DOMAIN:([^\]]+)\]/);
const domain = domainMatch ? domainMatch[1] : 'default.com';
```

**New code:**
```javascript
// Get domain from userData
const searchDomain = user.domain || user.userData?.domain || 'default.com';
```

---

## Benefits

✅ **Cleaner:** Domain not visible in chat
✅ **Persistent:** Available for entire conversation
✅ **Flexible:** Can pass any data, not just domain
✅ **Debuggable:** Clear logs showing what's available
✅ **Maintainable:** No message parsing needed

---

## Next Steps

1. ✅ Frontend updated (Valhallah.js)
2. ✅ Execute Code created (bot-execute-code-WITH-USERDATA.js)
3. ⏳ Copy Execute Code to Botpress Studio
4. ⏳ Publish bot
5. ⏳ Test with Magic Page app
6. ⏳ Verify logs show domain resolution working

---

## Troubleshooting

### "user.domain is undefined"

**Check:**
- Is `mergeConfig` being called? (Check browser console)
- Is webchat version compatible?
- Is config script loaded before mergeConfig?

**Fix:**
```javascript
// Add more debug logging
console.log('window.botpressWebChat:', window.botpressWebChat);
console.log('typeof mergeConfig:', typeof window.botpressWebChat?.mergeConfig);
```

### "KB not found for domain"

**Check:**
- Does KB file exist for that domain?
- Run: `node scripts/kb-manager.js list`
- Is domain tag correct? Should be sanitized (no https://, no www)

**Fix:**
- Upload KB: `node scripts/kb-manager.js push filename.txt domain=example.com`
- Or check domain sanitization in frontend

### "Multiple files found, using first one"

**This is normal** if you uploaded KB multiple times for same domain.

**To clean up:**
```bash
node scripts/kb-manager.js list
# Find duplicate fileIds
# Delete old ones, keep most recent
```

---

## Files Changed

- ✅ `components/Valhallah.js` - Updated to use mergeConfig
- ✅ `scripts/bot-execute-code-WITH-USERDATA.js` - New Execute Code
- ✅ `scripts/README-USERDATA-INTEGRATION.md` - This guide

---

**Ready to implement!** Copy the Execute Code to Botpress Studio and test.
