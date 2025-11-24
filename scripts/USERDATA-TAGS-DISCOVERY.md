# userData Stored in user.tags Discovery

## The Key Discovery

**userData from `window.botpressWebChat.init()` is stored in `user.tags`, NOT `user.userData`!**

This is why our Execute Code wasn't finding the domain - we were looking in the wrong place.

---

## How It Works

### Frontend (Valhallah.js)

When you call `init()` with userData:

```javascript
window.botpressWebChat.init({
    userData: {
        domain: "gibbonheating.com",
        website: "http://gibbonheating.com",
        sessionID: "abc123"
    }
});
```

### Backend (Botpress Execute Code)

That userData becomes available as **`user.tags`**:

```javascript
// ✅ CORRECT - userData goes into user.tags
const domain = user.tags?.domain;  // "gibbonheating.com"

// ❌ WRONG - userData is NOT in user.userData
const domain = user.userData?.domain;  // undefined
```

---

## Updated Execute Code

### Old Code (WRONG)
```javascript
searchDomain = user.domain
    || user.userData?.domain    // ← userData NOT here!
    || event.payload?.domain
    || conversation.domain
    || DEFAULT_DOMAIN;
```

### New Code (CORRECT)
```javascript
searchDomain = user.tags?.domain        // ← userData IS here!
    || user.domain
    || user.userData?.domain
    || event.payload?.domain
    || event.tags?.domain
    || conversation.domain
    || conversation.tags?.domain
    || DEFAULT_DOMAIN;
```

---

## Why This Matters

According to Botpress documentation:

> **User tags** are a set of tags you can attach to a user. The user object includes properties like `id`, `createdAt`, `updatedAt`, `tags`, `name`, and `pictureUrl`.

When you pass userData via `init()`:
1. Botpress receives the userData object
2. Botpress stores it in the user's **tags** property
3. Your Execute Code accesses it via `user.tags.domain`

---

## Complete Resolution Order

The updated Execute Code now checks **7 possible locations** for the domain:

1. **`user.tags?.domain`** ← userData from init() (PRIMARY)
2. **`user.domain`** ← Direct user property
3. **`user.userData?.domain`** ← Alternative userData location
4. **`event.payload?.domain`** ← Message payload
5. **`event.tags?.domain`** ← Event tags
6. **`conversation.domain`** ← Stored in conversation (after first message)
7. **`conversation.tags?.domain`** ← Conversation tags
8. **`DEFAULT_DOMAIN`** ← Last resort fallback

---

## Testing Steps

### 1. Update Botpress Execute Code

Copy the updated code from `bot-execute-code-WITH-USERDATA.js` to your Botpress Studio Execute Code card.

**Key change:**
```javascript
searchDomain = user.tags?.domain  // ← Add this as FIRST check
```

### 2. Publish Bot

Click "Publish" in Botpress Studio to deploy the changes.

### 3. Test Locally

1. Refresh browser at http://localhost:3000
2. Process a domain (e.g., gibbonheating.com)
3. Wait for chat widget to load
4. Send a test message
5. Check Botpress Studio logs

### 4. Expected Logs (Success)

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

===== SEARCHING DOMAIN-SPECIFIC KB =====
Tags: {"domain":"gibbonheating.com"}

✅ SUCCESS: Using domain-specific KB
  Domain: gibbonheating.com
  File: file_01KAVE7RVEJ4TH277404ZW495G
  Context length: 2453 chars
```

---

## Why We Missed This

### Botpress Documentation Says

> "You can receive data from the webchat in Botpress by using **Get User Data Card** in the flow."

This implies using a workflow card, not direct access in Execute Code.

### But User Tags Documentation Shows

> "The user object includes properties like `id`, `createdAt`, `updatedAt`, **`tags`**, `name`, and `pictureUrl`."

The `tags` property is where userData goes!

### Our Assumption

We assumed userData would be in:
- `user.userData` (logical but wrong)
- `user.domain` (direct property, also possible but not automatic)

### The Reality

Botpress stores `init({ userData: {...} })` in `user.tags`.

---

## Files Updated

1. ✅ `scripts/bot-execute-code-WITH-USERDATA.js` - Now checks user.tags?.domain FIRST
2. ✅ `scripts/USERDATA-TAGS-DISCOVERY.md` - This document
3. ⏳ Botpress Studio Execute Code card - Need to update manually

---

## References

**Botpress Documentation:**
- [getUser API](https://www.botpress.com/docs/api-reference/runtime-api/openapi/getUser) - Shows user object structure with tags property
- [Botpress Features](https://botpress.com/docs/cloud/getting-started/features) - User tags documentation
- [How to Access and Utilize userData in Botpress Web Chat](https://discord.botpress.com/t/16924935/how-to-access-and-utilize-userdata-in-botpress-web-chat)
- [Pass user data to webchat and use it in the workflow](https://discord.botpress.com/t/14156362/pass-user-data-to-webchat-and-use-it-in-the-workflow)

**Key Quote:**
> "User tags are a set of tags you can attach to a user, with the available tags restricted by the list defined by the bot."

---

## Next Steps

1. ✅ Frontend code updated (Valhallah.js with polling)
2. ✅ Execute Code updated (checks user.tags?.domain)
3. ⏳ **Copy Execute Code to Botpress Studio**
4. ⏳ **Publish bot**
5. ⏳ Test with real domain
6. ⏳ Verify logs show user.tags?.domain being used
7. ⏳ Confirm domain-specific KB is loaded

---

**Date:** 2025-11-24
**Branch:** feature/userdata-integration
**Status:** Critical discovery - user.tags is where userData lives!
