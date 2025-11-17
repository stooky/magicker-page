"""
Scraper Orchestrator
Tries Scrapy first, falls back to Playwright if needed
Uses OpenAI to extract meaningful snippets
"""
import logging
import os
from scrapy_scraper import scrape_with_scrapy, format_scrapy_results
from playwright_scraper import scrape_with_playwright, format_playwright_results
from openai_extractor import extract_meaningful_snippets, format_snippets_as_numbered_list

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def scrape_website(url):
    """
    Orchestrate web scraping: Try Scrapy first, fallback to Playwright

    Strategy:
    1. Try Scrapy first (faster, works for most sites)
    2. If Scrapy finds <= 1 page, use Playwright (handles JS-heavy sites)

    Args:
        url: Website URL to scrape

    Returns:
        dict: {
            'status': 'success' | 'error',
            'message': str (numbered list of items),
            'method_used': 'scrapy' | 'playwright',
            'pages_found': int,
            'error_details': str (if error)
        }
    """
    logger.info(f"Starting scrape orchestration for: {url}")

    # Step 1: Try Scrapy first
    logger.info("Attempting Scrapy scrape...")
    scrapy_results = scrape_with_scrapy(url, timeout=20)

    # Check if Scrapy was successful and found enough pages
    if scrapy_results['success'] and scrapy_results['pages_found'] > 1:
        logger.info(f"Scrapy succeeded! Found {scrapy_results['pages_found']} pages")

        # Try OpenAI extraction for intelligent snippet selection
        use_openai = os.environ.get('USE_OPENAI_EXTRACTION', 'true').lower() == 'true'

        if use_openai:
            logger.info("Attempting OpenAI extraction...")
            openai_result = extract_meaningful_snippets(scrapy_results['items'], url)

            if openai_result['success'] and openai_result['snippets']:
                logger.info(f"OpenAI extraction successful! Extracted {len(openai_result['snippets'])} snippets")
                formatted_message = format_snippets_as_numbered_list(openai_result['snippets'])
            else:
                logger.warning(f"OpenAI extraction failed: {openai_result['error']}, using fallback")
                formatted_message = format_scrapy_results(scrapy_results)
        else:
            formatted_message = format_scrapy_results(scrapy_results)

        return {
            'status': 'success',
            'message': formatted_message,
            'method_used': 'scrapy' + (' + openai' if use_openai else ''),
            'pages_found': scrapy_results['pages_found'],
            'error_details': None
        }

    # Step 2: Fallback to Playwright
    logger.info(f"Scrapy found {scrapy_results['pages_found']} page(s). Falling back to Playwright...")
    playwright_results = scrape_with_playwright(url, timeout=30000)

    if playwright_results['success']:
        logger.info("Playwright scraping succeeded!")

        # Try OpenAI extraction for intelligent snippet selection
        use_openai = os.environ.get('USE_OPENAI_EXTRACTION', 'true').lower() == 'true'

        if use_openai:
            logger.info("Attempting OpenAI extraction...")
            openai_result = extract_meaningful_snippets(playwright_results['items'], url)

            if openai_result['success'] and openai_result['snippets']:
                logger.info(f"OpenAI extraction successful! Extracted {len(openai_result['snippets'])} snippets")
                formatted_message = format_snippets_as_numbered_list(openai_result['snippets'])
            else:
                logger.warning(f"OpenAI extraction failed: {openai_result['error']}, using fallback")
                formatted_message = format_playwright_results(playwright_results)
        else:
            formatted_message = format_playwright_results(playwright_results)

        return {
            'status': 'success',
            'message': formatted_message,
            'method_used': 'playwright' + (' + openai' if use_openai else ''),
            'pages_found': playwright_results['pages_found'],
            'error_details': None
        }

    # Step 3: Both methods failed
    logger.error("Both Scrapy and Playwright failed")
    error_message = f"Scrapy error: {scrapy_results['error']}. Playwright error: {playwright_results['error']}"

    return {
        'status': 'error',
        'message': '1. Failed to scrape website content\n2. Please check if the URL is accessible',
        'method_used': None,
        'pages_found': 0,
        'error_details': error_message
    }


if __name__ == '__main__':
    # Test the orchestrator
    import sys

    test_url = sys.argv[1] if len(sys.argv) > 1 else 'https://example.com'
    print(f"\n{'='*60}")
    print(f"Testing Scraper Orchestrator on: {test_url}")
    print(f"{'='*60}\n")

    result = scrape_website(test_url)

    print(f"\nStatus: {result['status']}")
    print(f"Method Used: {result['method_used']}")
    print(f"Pages Found: {result['pages_found']}")
    print(f"\nFormatted Message:\n{result['message']}")

    if result['error_details']:
        print(f"\nError Details: {result['error_details']}")
