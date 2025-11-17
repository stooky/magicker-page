# Testing Guide - Web Scraping Migration

## ✅ What Was Fixed

### 1. Frontend Processing (CRITICAL FIX)
**Problem:** Only 1 snippet displayed instead of 10
**Cause:** `processZapierResponse` regex wasn't parsing newline-separated lists
**Fix:** Updated to split by `\n` and properly parse numbered items

### 2. File Logging
**Added:** `npm run dev:log` - Auto-logs to timestamped files
**Location:** `logs/dev-server_YYYY-MM-DDTHH-mm-ss.log`

### 3. Removed Zapier Polling
**Removed:** Old useEffect that polled `/api/get-latest-response`
**Result:** No more hanging on "Loading..." screen

## 🚀 How to Test

### Option 1: Start with Logging (Recommended)

```bash
npm run dev:log
```

Then in another terminal:
```powershell
.\view-logs.ps1
```

### Option 2: Use PowerShell Script

```powershell
.\start-dev.ps1
```

This auto-cleans port 3000 and logs to file.

## 🧪 Test Checklist

1. **Start Server**
   ```bash
   npm run dev:log
   ```

2. **Open Browser**
   - Navigate to http://localhost:3000

3. **Submit Form**
   - Email: your@email.com
   - Website: gibbonheating.com (or any HVAC site)

4. **Verify Results**
   - ✅ Screenshot appears (if token valid)
   - ✅ **10 snippets cycle through** (not just 1!)
   - ✅ Snippets are relevant and intelligent
   - ✅ Chatbot loads after scanning

5. **Check Logs**
   ```powershell
   .\view-logs.ps1
   ```

   Should see:
   ```
   Cheerio succeeded! Found X pages
   Attempting OpenAI extraction...
   OpenAI extraction successful! Extracted 10 snippets
   Scraping success!
   ```

## 🐛 Known Issues

### Screenshot Token Issue
**Symptom:** Screenshot shows "Unauthorized"
**Cause:** `SCREENSHOTAPI_TOKEN` in `.env.local` not loading
**Fix:** Restart server completely (Ctrl+C, then start again)

**Verify token is set:**
```powershell
Select-String "SCREENSHOTAPI_TOKEN" .env.local
```

Should show:
```
SCREENSHOTAPI_TOKEN=2S70HBF-RVW4HQV-Q4D6X4W-37H9RYT
```

## 📊 Expected Output

### Console (Browser DevTools)
```
Processed snippets: 10 [Array of 10 items]
```

### Server Logs
```
Scraping website: http://example.com
Cheerio succeeded! Found 20 pages
OpenAI extraction successful! Extracted 10 snippets
POST /api/scrape-website 200 in 14000ms
```

### Frontend Display
- Screenshot of website
- 10 snippets cycling every 3-5 seconds
- Each snippet should be relevant and informative

## 🔧 Troubleshooting

### Only 1 Snippet Shows
**Status:** ✅ FIXED in latest commit
**What it was:** Regex parsing issue
**How to verify fix:** Check browser console for `Processed snippets: 10`

### Hangs on "Loading..."
**Status:** ✅ FIXED - Removed Zapier polling
**Verify:** Should transition to scanning screen within 15 seconds

### No Logs Created
**Old way:** `.\start-dev.ps1` (PowerShell Tee-Object)
**New way:** `npm run dev:log` (Always works)

### Screenshot "Unauthorized"
**Quick fix:**
1. Stop server (Ctrl+C)
2. Verify `.env.local` has real token
3. Restart: `npm run dev:log`

## 🎯 Success Criteria

✅ Scraping completes in 10-20 seconds
✅ All 10 snippets display and cycle
✅ Snippets are contextually relevant (not generic)
✅ Logs show "OpenAI extraction successful! Extracted 10 snippets"
✅ Screenshot displays (if token valid)
✅ Chat interface loads after scanning

## 📝 Log Analysis

**Good scraping:**
```
Attempting Cheerio scrape...
Cheerio succeeded! Found 20 pages
Attempting OpenAI extraction...
Sending 8500 characters to OpenAI...
OpenAI extraction successful. Response length: 1400
Extracted 10 snippets
```

**Bad scraping (fell back to Playwright):**
```
Cheerio found 1 page(s). Falling back to Playwright...
Playwright scraping succeeded!
OpenAI extraction successful!
```

## 🔄 Restart Checklist

If things aren't working:

1. **Kill all servers**
   ```powershell
   .\kill-dev-servers.ps1
   ```

2. **Verify environment**
   ```powershell
   Get-Content .env.local | Select-String "OPENAI_API_KEY"
   Get-Content .env.local | Select-String "SCREENSHOTAPI_TOKEN"
   ```

3. **Start fresh**
   ```bash
   npm run dev:log
   ```

4. **Watch logs**
   ```powershell
   .\view-logs.ps1
   ```

5. **Test in browser**
   - http://localhost:3000
