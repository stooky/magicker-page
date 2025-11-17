# Web Scraper Setup Guide

This guide explains how to set up and run the new Scrapy + Playwright + OpenAI scraping system that replaces the Zapier workflow.

## Overview

The scraping system uses a three-tier approach:

1. **Scrapy** (Primary) - Fast, efficient multi-page crawling
2. **Playwright** (Fallback) - Handles JavaScript-heavy sites when Scrapy finds ≤1 page
3. **OpenAI** (Enhancement) - Intelligently extracts the most meaningful snippets

## Setup Instructions

### 1. Install Python Dependencies

Navigate to the scrapers directory and install required packages:

```bash
cd scrapers
pip install -r requirements.txt
```

### 2. Install Playwright Browsers

Playwright requires browser binaries to be installed:

```bash
playwright install chromium
```

### 3. Configure Environment Variables

Update your `.env.local` file with the following variables:

```bash
# Scraper Service URL (default: http://localhost:5001)
SCRAPER_SERVICE_URL=http://localhost:5001

# OpenAI API Key (required for intelligent snippet extraction)
OPENAI_API_KEY=sk-your-openai-api-key-here

# OpenAI Model (gpt-4o-mini recommended for cost efficiency)
OPENAI_MODEL=gpt-4o-mini

# Enable/Disable OpenAI extraction
USE_OPENAI_EXTRACTION=true
```

**Note:** The `OPENAI_API_KEY` should be set in **both**:
- `.env.local` (for documentation)
- As an environment variable when running the scraper service

### 4. Start the Scraper Service

Run the Flask server that hosts the scraping endpoints:

```bash
# Development mode
cd scrapers
python server.py

# Or with environment variable
OPENAI_API_KEY=your-key-here python server.py
```

The service will start on port 5001 by default.

For production, use Gunicorn:

```bash
cd scrapers
OPENAI_API_KEY=your-key-here gunicorn -w 4 -b 0.0.0.0:5001 server:app
```

### 5. Start the Next.js Application

In a separate terminal:

```bash
npm run dev
```

## How It Works

### Scraping Flow

1. User submits a website URL
2. Next.js API route `/api/scrape-website` receives the request
3. Request is forwarded to Python scraper service at `http://localhost:5001/scrape`
4. Scraping orchestration:
   - **Try Scrapy first** (fast, works for most sites)
   - If Scrapy finds ≤1 page → **Use Playwright** (handles JavaScript)
   - Scraped content sent to **OpenAI** for intelligent extraction
5. OpenAI analyzes content and extracts 10 most meaningful snippets
6. Results returned as numbered list (same format as Zapier)
7. Frontend displays results in ScanningComponent

### OpenAI Extraction

The OpenAI layer analyzes scraped content and extracts:
- Key services/products
- Unique value propositions
- Compelling business information
- Actionable points for potential customers

This replaces the manual content selection that was done in the Zapier workflow.

## API Endpoints

### Scraper Service (Python/Flask)

**POST** `http://localhost:5001/scrape`

Request:
```json
{
  "url": "https://example.com"
}
```

Response:
```json
{
  "status": "success",
  "message": "1. First snippet\n2. Second snippet\n...",
  "method_used": "scrapy + openai",
  "pages_found": 5
}
```

**GET** `http://localhost:5001/health`

Health check endpoint.

### Next.js API

**POST** `/api/scrape-website`

Request:
```json
{
  "url": "https://example.com"
}
```

Response:
```json
{
  "status": "success",
  "message": "1. First snippet\n2. Second snippet\n...",
  "method_used": "scrapy + openai",
  "pages_found": 5
}
```

## Testing

### Test Individual Components

```bash
# Test Scrapy scraper
cd scrapers
python scrapy_scraper.py

# Test Playwright scraper
python playwright_scraper.py

# Test OpenAI extractor
OPENAI_API_KEY=your-key python openai_extractor.py

# Test full orchestration
OPENAI_API_KEY=your-key python scraper_orchestrator.py https://example.com
```

### Test via API

```bash
# Health check
curl http://localhost:5001/health

# Scrape a website
curl -X POST http://localhost:5001/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

## Troubleshooting

### Scraper service not starting

- Ensure all dependencies are installed: `pip install -r requirements.txt`
- Check Python version (3.8+ required)
- Verify port 5001 is not in use

### OpenAI errors

- Verify `OPENAI_API_KEY` is set correctly
- Check API key has sufficient credits
- Ensure you're using a supported model (gpt-4o-mini, gpt-4, etc.)
- If OpenAI fails, the system falls back to basic extraction

### Playwright errors

- Run `playwright install chromium` to install browsers
- Check system requirements for Playwright
- Ensure sufficient disk space

### Module not found errors

- Activate your virtual environment if using one
- Install missing packages: `pip install <package-name>`

## Cost Optimization

### OpenAI Costs

- Using `gpt-4o-mini` (recommended): ~$0.0001 per scrape
- Using `gpt-4`: ~$0.01 per scrape

To reduce costs:
1. Use `gpt-4o-mini` model (set in `OPENAI_MODEL`)
2. Disable OpenAI: Set `USE_OPENAI_EXTRACTION=false`
3. The system will fall back to basic extraction without AI

## Deployment

### Docker Deployment (Recommended)

Create a `Dockerfile` in the `scrapers/` directory:

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
RUN playwright install chromium --with-deps

COPY . .

ENV SCRAPER_PORT=5001
EXPOSE 5001

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5001", "server:app"]
```

Build and run:

```bash
docker build -t scraper-service ./scrapers
docker run -p 5001:5001 -e OPENAI_API_KEY=your-key scraper-service
```

### Production Considerations

1. Use environment variables for all sensitive data
2. Run scraper service on a separate server/container
3. Implement rate limiting on the scraper endpoints
4. Add monitoring and logging
5. Consider using Redis for caching scraped results
6. Set up proper error alerting

## Migration from Zapier

The old Zapier endpoints are still in the codebase but no longer used:

- `/api/zapier-proxy` - No longer called
- `/api/zapier-callback` - Not needed (direct response now)
- `/api/get-latest-response` - Polling no longer needed
- `/api/clear-response` - Not needed

These can be safely removed after confirming the new system works.

## Support

For issues or questions:
1. Check the logs from the scraper service
2. Test individual components (Scrapy, Playwright, OpenAI)
3. Verify environment variables are set correctly
4. Review the README.md in the `scrapers/` directory
