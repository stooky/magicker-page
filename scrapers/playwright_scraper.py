"""
Playwright-based web scraper
Handles JavaScript-heavy websites and single-page applications
"""
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
from bs4 import BeautifulSoup
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def scrape_with_playwright(url, timeout=30000):
    """
    Scrape a website using Playwright (handles JavaScript)

    Args:
        url: Website URL to scrape
        timeout: Maximum time to wait for page load (milliseconds)

    Returns:
        dict: {
            'success': bool,
            'pages_found': int,
            'items': list of extracted content,
            'error': str (if failed)
        }
    """
    try:
        with sync_playwright() as p:
            # Launch browser in headless mode
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            page = context.new_page()

            logger.info(f"Navigating to {url} with Playwright...")

            # Navigate to the page
            try:
                page.goto(url, wait_until='networkidle', timeout=timeout)
            except PlaywrightTimeout:
                logger.warning("Page load timeout, continuing with partial content...")
                page.wait_for_timeout(5000)  # Wait 5 more seconds

            # Wait for dynamic content to load
            page.wait_for_timeout(2000)

            # Scroll to load lazy-loaded content
            for _ in range(3):
                page.evaluate('window.scrollBy(0, window.innerHeight)')
                page.wait_for_timeout(500)

            # Get page content
            content = page.content()
            page_title = page.title()

            # Extract links for potential multi-page crawl
            links = []
            try:
                link_elements = page.query_selector_all('a[href]')
                for element in link_elements[:20]:
                    href = element.get_attribute('href')
                    if href and href.startswith(('http', '/')):
                        links.append(href)
            except Exception as e:
                logger.warning(f"Error extracting links: {e}")

            browser.close()

            # Parse with BeautifulSoup
            soup = BeautifulSoup(content, 'lxml')

            # Remove non-content elements
            for element in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'noscript']):
                element.decompose()

            # Extract content
            page_data = {
                'url': url,
                'title': page_title,
                'headings': [],
                'paragraphs': [],
                'lists': [],
                'links': links
            }

            # Extract headings
            for heading_tag in ['h1', 'h2', 'h3', 'h4']:
                headings = soup.find_all(heading_tag)
                for h in headings:
                    text = h.get_text(strip=True)
                    if text and len(text) > 3 and len(text) < 200:
                        page_data['headings'].append(text)

            # Extract paragraphs
            paragraphs = soup.find_all('p')
            for p in paragraphs:
                text = p.get_text(strip=True)
                if text and len(text) > 20 and len(text) < 500:
                    page_data['paragraphs'].append(text)

            # Extract list items
            for ul in soup.find_all(['ul', 'ol']):
                list_items = ul.find_all('li', recursive=False)
                for li in list_items[:10]:
                    text = li.get_text(strip=True)
                    if text and len(text) > 5 and len(text) < 300:
                        page_data['lists'].append(text)

            return {
                'success': True,
                'pages_found': 1,  # Playwright typically scrapes single page
                'items': [page_data],
                'error': None
            }

    except Exception as e:
        logger.error(f"Playwright scraping error: {str(e)}")
        return {
            'success': False,
            'pages_found': 0,
            'items': [],
            'error': str(e)
        }


def format_playwright_results(results):
    """
    Format Playwright results into numbered list format expected by frontend

    Args:
        results: Playwright scraping results

    Returns:
        str: Numbered list of extracted items
    """
    items = []

    for page in results['items']:
        # Add page title
        if page['title']:
            items.append(f"Website: {page['title']}")

        # Add headings (prioritize important ones)
        unique_headings = []
        for heading in page['headings']:
            if heading not in unique_headings:
                unique_headings.append(heading)

        for heading in unique_headings[:5]:
            items.append(heading)

        # Add list items (these are usually key features/services)
        for list_item in page['lists'][:8]:
            if list_item not in items:
                items.append(list_item)

        # Add paragraphs if we don't have enough items
        if len(items) < 8:
            for para in page['paragraphs'][:5]:
                short_para = para[:150] + '...' if len(para) > 150 else para
                if short_para not in items:
                    items.append(short_para)

    # Create numbered list (limit to 10 items)
    numbered_items = [f"{i+1}. {item}" for i, item in enumerate(items[:10])]
    return '\n'.join(numbered_items) if numbered_items else "1. Website content extracted successfully"


if __name__ == '__main__':
    # Test the scraper
    test_url = 'https://example.com'
    print(f"Testing Playwright scraper on {test_url}...")
    results = scrape_with_playwright(test_url)
    print(f"Success: {results['success']}")
    print(f"Pages found: {results['pages_found']}")
    print(f"Items extracted: {len(results['items'])}")
    if results['success']:
        formatted = format_playwright_results(results)
        print("\nFormatted output:")
        print(formatted)
