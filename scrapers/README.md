# Web Scraping Service

This service provides web scraping functionality using a two-tier approach:
1. **Scrapy** (primary) - Fast, efficient scraping for multi-page crawling
2. **Playwright** (fallback) - Handles JavaScript-heavy sites and SPAs

## Setup

### 1. Install Dependencies

```bash
cd scrapers
pip install -r requirements.txt
```

### 2. Install Playwright Browsers

```bash
playwright install chromium
```

### 3. Run the Service

```bash
# Development mode
python server.py

# Production mode (with gunicorn)
gunicorn -w 4 -b 0.0.0.0:5001 server:app
```

The service will start on port 5001 by default.

## Environment Variables

- `SCRAPER_PORT` - Port to run the service on (default: 5001)
- `FLASK_ENV` - Set to 'development' for debug mode

## API Endpoints

### POST /scrape

Scrape a website and return extracted content.

**Request:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "1. Item one\n2. Item two\n3. Item three...",
  "method_used": "scrapy",
  "pages_found": 5
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "scraper"
}
```

## How It Works

1. **Scrapy First**: Attempts to scrape using Scrapy (fast, works for most sites)
2. **Playwright Fallback**: If Scrapy finds ≤1 page, switches to Playwright (handles JS)
3. **Format Results**: Converts extracted content to numbered list format

## Testing

Test individual components:

```bash
# Test Scrapy scraper
python scrapy_scraper.py

# Test Playwright scraper
python playwright_scraper.py

# Test orchestrator
python scraper_orchestrator.py https://example.com
```

## Integration with Next.js

The Next.js app calls this service via `/api/scrape-website` endpoint, which proxies requests to this Flask service.
