# userData API Fix - Using init() Instead of mergeConfig()

## Problem

When testing userData integration locally, we got this error:
```
[VALHALLAH] ❌ window.botpressWebChat.mergeConfig not available
```

The domain was not being passed to Botpress, causing the bot to use the backup default domain instead of the specific domain we just processed (e.g., gibbonheating.com).

---

## Root Cause

**We were using the WRONG API!**

According to Botpress documentation, **`mergeConfig()` cannot be used to pass userData**.

### What We Tried (WRONG)
```javascript
// ❌ THIS DOES NOT WORK FOR USERDATA
window.botpressWebChat.mergeConfig({
    userData: {
        domain: domain,
        website: website,
        sessionID: sessionID
    }
});
```

### What We Should Use (CORRECT)
```javascript
// ✅ THIS IS THE CORRECT WAY
window.botpressWebChat.init({
    userData: {
        domain: domain,
        website: website,
        sessionID: sessionID
    }
});
```

---

## Botpress userData API Rules

Based on official Botpress documentation:

1. **Use `init()` NOT `mergeConfig()` for userData**
   - `mergeConfig()` is for other configuration options
   - `init()` is specifically for passing userData

2. **Can only call `init()` with userData ONCE**
   - You cannot call it multiple times
   - You cannot update userData after initialization
   - Plan your userData carefully before calling init()

3. **userData must be a flat object with string values**
   - No nested objects allowed
   - All values must be strings
   - Example: `{ domain: "example.com", sessionID: "abc123" }`

4. **Accessing userData in Botpress**
   - In Execute Code: `user.domain` or `user.userData?.domain`
   - In workflows: Use "Get User Data" card with `{{event.userId}}`

---

## Fix Applied

### File: components/Valhallah.js

**Changed from:**
```javascript
if (window.botpressWebChat && typeof window.botpressWebChat.mergeConfig === 'function') {
    window.botpressWebChat.mergeConfig({
        userData: { ... }
    });
}
```

**Changed to:**
```javascript
if (window.botpressWebChat && typeof window.botpressWebChat.init === 'function') {
    window.botpressWebChat.init({
        userData: {
            domain: domain,
            website: website,
            sessionID: sessionID
        }
    });
}
```

### Added Debug Logging

To help diagnose similar issues in the future:
```javascript
console.log('window.botpressWebChat exists:', !!window.botpressWebChat);
console.log('Available methods:', window.botpressWebChat ? Object.keys(window.botpressWebChat) : 'N/A');
console.log('typeof init:', typeof window.botpressWebChat?.init);
```

This shows us exactly what methods are available on the webchat object.

---

## Testing

### Expected Console Output (Success)

When testing locally at http://localhost:3000:

```
========================================
[VALHALLAH] 🔍 DEBUGGING BOTPRESS WEBCHAT API
========================================
window.botpressWebChat exists: true
Available methods: ['init', 'sendEvent', 'onEvent', ...]
typeof init: function
========================================

========================================
[VALHALLAH] 🎯 INITIALIZING BOTPRESS WEBCHAT WITH USERDATA
========================================
Domain: gibbonheating.com
Website: https://gibbonheating.com
SessionID: abc123
✅ userData configured in webchat via init()
========================================
```

### Expected Botpress Studio Logs (Success)

When bot processes a message:

```
===== DYNAMIC DOMAIN RESOLUTION =====
user.domain: gibbonheating.com
RESOLVED searchDomain: gibbonheating.com

===== SEARCHING DOMAIN-SPECIFIC KB =====
Tags: {"domain":"gibbonheating.com"}

✅ SUCCESS: Using domain-specific KB
  Domain: gibbonheating.com
  File: file_01KAVE7RVEJ4TH277404ZW495G
  Context length: 2453 chars
```

---

## Files Updated

1. ✅ `components/Valhallah.js` - Changed `mergeConfig()` to `init()`
2. ✅ `scripts/README-USERDATA-INTEGRATION.md` - Updated documentation
3. ✅ `scripts/USERDATA-API-FIX.md` - This diagnostic document

---

## References

**Botpress Documentation:**
- [Controlling Webchat Using JS](https://botpress.com/docs/developers/webchat/controlling-webchat-using-js)
- [Webchat Documentation](https://botpress.com/docs/cloud/channels/webchat)

**Key Quotes from Documentation:**
> "The mergeConfig doesn't allow you to pass user data."

> "To send information, you must submit a flat (without nested objects) object to the userData property."

> "You can use the init function with the userData only once. You can't init the webchat again with new data nor using mergeConfig."

---

## Next Steps

1. ✅ Fix applied to Valhallah.js
2. ✅ Documentation updated
3. ⏳ Test locally - verify domain is passed correctly
4. ⏳ Verify in browser console logs
5. ⏳ Send test message and check Botpress Studio logs
6. ⏳ Confirm domain-specific KB is being used
7. ⏳ Commit changes if working
8. ⏳ Deploy to Ubuntu server

---

**Date:** 2025-11-24
**Branch:** feature/userdata-integration
**Status:** Fix applied, ready for testing
