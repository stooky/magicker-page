# Botpress KB Integration Testing

## Quick Start

Run the test script to verify your Botpress Knowledge Base integration:

```bash
node scripts/test-botpress-kb.js
```

## What It Tests

1. **✅ Upload KB File** - Uploads test content with tags (sessionID, domain, website)
2. **✅ Create Session** - Creates a conversation with matching tags
3. **✅ Ask Questions** - Sends messages to verify bot uses ONLY the uploaded KB
4. **✅ Verify Isolation** - Confirms bot doesn't answer questions outside the KB

## Expected Output

```
🧪 BOTPRESS KNOWLEDGE BASE INTEGRATION TEST
============================================================

📤 TEST 1: Upload KB File with Tags
============================================================
✅ File uploaded successfully
   File ID: file_ABC123
   Tags: { sessionID: 'test-123', domain: 'test-product.com', website: 'https://test-product.com' }

🔐 TEST 2: Create Session with Matching Tags
============================================================
✅ Session created successfully
   Conversation ID: conv_XYZ789

💬 TEST 3: Ask "What is the product name?"
============================================================
✅ Bot responded:
   Answer: The product name is AlphaHammer 9000.
   ✅ Contains expected answer: AlphaHammer 9000

💬 TEST 3: Ask "What is the price?"
============================================================
✅ Bot responded:
   Answer: The price is $299.99.
   ✅ Contains expected answer: $299.99

🚫 TEST 4: Ask Question NOT in KB
============================================================
✅ Bot responded:
   Answer: I do not have that information.

📊 TEST SUMMARY
============================================================
Test 1 (Upload KB): ✅ PASS
Test 2 (Create Session): ✅ PASS
Test 3a (Answer from KB): ✅ PASS
Test 3b (Price from KB): ✅ PASS
Test 4 (Question not in KB): ✅ PASS

✅ ALL TESTS PASSED!
```

## Troubleshooting

### ❌ Test 3 Fails (Bot doesn't answer from KB)

**Symptom:** Bot says "I do not have that information" even for questions in the KB.

**Possible Causes:**
1. **Tag mismatch** - The bot searches for different tag names than what the file uses
2. **Indexing delay** - KB file not indexed yet (increase wait time in script)
3. **Bot workflow not configured** - Execute Code card not set up correctly

**Solution - Check Tag Alignment:**

Your bot searches for files with:
```javascript
// In bot workflow
const domain = event.tags?.website;
const res = await client.searchFiles({
  tags: { sessionID, domain },  // Searches for tag "domain"
});
```

But your KB file might be tagged with:
```javascript
// In kb-create.js
tags: {
  domain: "sanitized-domain",  // Different value!
  website: "https://example.com"
}
```

**Fix:** Update bot workflow to search by `website` instead:
```javascript
const sessionID = event.tags?.sessionID;
const website = event.tags?.website;

const res = await client.searchFiles({
  tags: { sessionID, website },  // Match file tags
  limit: 10
});
```

### ❌ Test 1 Fails (File upload error)

**Possible Causes:**
- Missing/invalid `BOTPRESS_API_TOKEN`
- Missing/invalid `BOTPRESS_CLIENT_ID` (workspace ID)
- Missing/invalid `BOTPRESS_BOT_ID`

**Solution:** Check `.env.local` has all required variables:
```env
BOTPRESS_API_TOKEN=bp_pat_...
BOTPRESS_CLIENT_ID=ws_...
BOTPRESS_BOT_ID=bot_...
```

### ❌ Test 2 Fails (Session creation error)

**Possible Causes:**
- Bot not published
- Invalid workspace/bot ID
- API endpoint changed

**Solution:**
1. Publish your bot in Botpress Studio
2. Verify bot ID matches the published bot
3. Check Botpress Cloud status

## Advanced: Customizing the Test

Edit `scripts/test-botpress-kb.js` to:

### Test Different Content

```javascript
const TEST_CONTENT = `
Your custom KB content here
`;
```

### Test Different Questions

```javascript
await test3_sendMessage(
  conversationId,
  'Your custom question?',
  'Expected answer snippet'
);
```

### Adjust Timing

```javascript
// Increase wait time if indexing takes longer
await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds
```

## Integration with Your Workflow

Once tests pass, you can verify your full application:

1. ✅ Test script passes → Bot configuration is correct
2. Run `npm run dev` → Start your Next.js app
3. Submit a form at `http://localhost:3000`
4. Watch the KB creation and session flow
5. Test the chatbot widget on the final page

## Monitoring in Botpress Studio

While tests run, you can monitor in real-time:

1. Go to https://studio.botpress.cloud
2. Navigate to your bot → **Logs**
3. Watch for Execute Code card output
4. Verify `event.tags` values
5. Check `workflow.kbContext` content

## Next Steps After Tests Pass

1. **Commit the bot export** to track workflow changes
2. **Update documentation** with working configuration
3. **Deploy to production** with confidence
4. **Monitor real user sessions** in Botpress Analytics

## Cleanup

The test script creates test conversations and KB files. To clean up:

1. Go to Botpress Cloud → Files
2. Delete files starting with `test-kb-`
3. Conversations auto-expire after inactivity timeout

---

**Need Help?**
- Check Botpress Logs for detailed error messages
- Review `bot.json` workflow configuration
- Verify tag names match between file upload, session creation, and bot search
