# Node.js Web Scrapers

Pure Node.js scraping implementation - no separate services required!

## Overview

This replaces the Zapier workflow with integrated Node.js scraping:

1. **Cheerio Scraper** (Fast) - Node.js equivalent of Scrapy for multi-page crawling
2. **Playwright Scraper** (Fallback) - Handles JavaScript-heavy sites
3. **OpenAI Extractor** - Intelligently extracts meaningful snippets
4. **Orchestrator** - Manages the scraping flow

## Architecture

```
User submits URL
      ↓
Next.js API: /api/scrape-website
      ↓
Orchestrator tries:
  1. Cheerio (fast, multi-page)
     ↓ (if ≤1 page found)
  2. Playwright (JS-heavy sites)
     ↓
  3. OpenAI (extract snippets)
      ↓
Return numbered list to frontend
```

## Usage

### From API Route

```javascript
import { scrapeWebsite } from '../../lib/scrapers/scraper-orchestrator.js';

const result = await scrapeWebsite('https://example.com');
// {
//   status: 'success',
//   message: '1. Item one\n2. Item two\n...',
//   method_used: 'cheerio + openai',
//   pages_found: 5
// }
```

### Direct Usage

```javascript
// Use Cheerio directly
import { scrapeWithCheerio } from './cheerio-scraper.js';
const results = await scrapeWithCheerio('https://example.com');

// Use Playwright directly
import { scrapeWithPlaywright } from './playwright-scraper.js';
const results = await scrapeWithPlaywright('https://example.com');

// Use OpenAI extractor
import { extractMeaningfulSnippets } from './openai-extractor.js';
const snippets = await extractMeaningfulSnippets(scrapedItems, url);
```

## Configuration

Set in `.env.local`:

```bash
# Required for intelligent extraction
OPENAI_API_KEY=sk-your-key-here

# Optional - defaults to gpt-4o-mini
OPENAI_MODEL=gpt-4o-mini

# Optional - set to false to disable OpenAI
USE_OPENAI_EXTRACTION=true
```

## Features

### Cheerio Scraper
- Multi-page crawling (up to 20 pages, depth 2)
- Extracts: titles, headings, paragraphs, lists, links
- Fast and lightweight
- Works for static content

### Playwright Scraper
- Handles JavaScript rendering
- Scrolls to load lazy content
- Waits for dynamic content
- Extracts same data as Cheerio

### OpenAI Extractor
- Analyzes all scraped content
- Extracts 10 most interesting points
- Focuses on business value propositions
- Returns formatted numbered list

## Cost

- **Cheerio**: Free (no external calls)
- **Playwright**: Free (runs locally)
- **OpenAI**: ~$0.0001 per scrape with gpt-4o-mini

Total: **~$0.0001 per website** (vs $0.01+ with Zapier)

## Requirements

1. Node.js packages (already installed):
   - `cheerio` - HTML parsing
   - `playwright` - Browser automation
   - `openai` - AI extraction
   - `axios` - HTTP requests

2. Playwright browsers:
   ```bash
   npx playwright install chromium
   ```

3. OpenAI API key in `.env.local`

## Advantages Over Python Service

✅ **No separate service** - runs in Next.js
✅ **Simpler deployment** - one stack
✅ **Faster** - no HTTP overhead
✅ **Better error handling** - integrated
✅ **Easier debugging** - same language
✅ **Auto-scales** - with Next.js

## Files

- `cheerio-scraper.js` - Fast multi-page crawling
- `playwright-scraper.js` - JS-heavy site support
- `openai-extractor.js` - Intelligent snippet extraction
- `scraper-orchestrator.js` - Manages scraping flow
- `README.md` - This file

## Troubleshooting

### Playwright errors

Install browsers:
```bash
npx playwright install chromium --with-deps
```

### OpenAI errors

Check:
1. `OPENAI_API_KEY` is set in `.env.local`
2. API key has credits
3. Model is valid (gpt-4o-mini, gpt-4, etc.)

If OpenAI fails, scraper falls back to basic extraction.

### Timeout errors

Increase timeouts in options:
```javascript
await scrapeWithCheerio(url, { timeout: 30000 });
await scrapeWithPlaywright(url, { timeout: 60000 });
```

## Example Output

```
1. Leading provider of heating and cooling solutions
2. 24/7 emergency HVAC services available
3. Over 20 years of experience serving residential and commercial clients
4. Free estimates on all new installations
5. Energy-efficient system upgrades and replacements
6. Licensed and insured HVAC technicians
7. Maintenance plans to keep your system running smoothly
8. Same-day service available for urgent repairs
9. Financing options available for major installations
10. Serving the greater metropolitan area
```
