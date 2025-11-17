# ⚠️ DEPRECATED - Python Scraper Service

This directory contains the **deprecated** Python-based scraper service.

## Why Deprecated?

The Python scraper service has been replaced with **pure Node.js** implementation in `/lib/scrapers/`.

**New approach:**
- ✅ Everything runs in Next.js (no separate service)
- ✅ Simpler deployment (one stack, no Python required)
- ✅ Faster (no HTTP calls between services)
- ✅ Easier to maintain

## Migration

The old Python service is **no longer needed**.

**Old way:**
```
Next.js → HTTP → Python Flask Service → Scrapy/Playwright
```

**New way:**
```
Next.js → Node.js Cheerio/Playwright (same process)
```

## Can I Delete This?

**Yes!** This entire `/scrapers/` directory can be safely deleted.

The new scraping code is in:
- `/lib/scrapers/cheerio-scraper.js`
- `/lib/scrapers/playwright-scraper.js`
- `/lib/scrapers/openai-extractor.js`
- `/lib/scrapers/scraper-orchestrator.js`

## Do I Need Python?

**No!** Python is no longer required for web scraping. Everything runs in Node.js now.

## What About setup-windows.ps1?

It's been updated to install Playwright browsers via npm instead of Python.

---

**This directory will be removed in a future cleanup.**
