"""
Scrapy-based web scraper
Extracts meaningful content from websites including text, links, and headings
"""
import scrapy
from scrapy.crawler import CrawlerProcess
from scrapy.http import TextResponse
from bs4 import BeautifulSoup
import logging
from urllib.parse import urljoin, urlparse
import multiprocessing
from queue import Queue, Empty
import time

# Disable scrapy logging noise
logging.getLogger('scrapy').setLevel(logging.WARNING)


class ContentSpider(scrapy.Spider):
    name = 'content_spider'
    custom_settings = {
        'USER_AGENT': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'ROBOTSTXT_OBEY': True,
        'CONCURRENT_REQUESTS': 8,
        'DOWNLOAD_TIMEOUT': 15,
        'DEPTH_LIMIT': 2,  # Only go 2 levels deep
        'CLOSESPIDER_PAGECOUNT': 20,  # Maximum 20 pages
        'HTTPCACHE_ENABLED': False,
        'REDIRECT_ENABLED': True,
        'COOKIES_ENABLED': False,
        'DOWNLOAD_DELAY': 0.5,  # Be polite
    }

    def __init__(self, start_url, results_queue, *args, **kwargs):
        super(ContentSpider, self).__init__(*args, **kwargs)
        self.start_urls = [start_url]
        self.allowed_domains = [urlparse(start_url).netloc]
        self.results_queue = results_queue
        self.scraped_items = []
        self.pages_scraped = 0

    def parse(self, response):
        """Parse each page and extract meaningful content"""
        self.pages_scraped += 1

        # Extract text content
        soup = BeautifulSoup(response.text, 'lxml')

        # Remove script, style, and other non-content elements
        for element in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
            element.decompose()

        # Extract key information
        page_data = {
            'url': response.url,
            'title': soup.find('title').get_text(strip=True) if soup.find('title') else '',
            'headings': [],
            'paragraphs': [],
            'links': []
        }

        # Get all headings
        for heading_tag in ['h1', 'h2', 'h3']:
            headings = soup.find_all(heading_tag)
            for h in headings[:5]:  # Limit to 5 per type
                text = h.get_text(strip=True)
                if text and len(text) > 3:
                    page_data['headings'].append(text)

        # Get meaningful paragraphs
        paragraphs = soup.find_all('p')
        for p in paragraphs[:10]:  # Limit to 10 paragraphs
            text = p.get_text(strip=True)
            if text and len(text) > 20:  # Only substantial paragraphs
                page_data['paragraphs'].append(text)

        # Get internal links for crawling
        for link in response.css('a::attr(href)').getall()[:10]:
            absolute_url = urljoin(response.url, link)
            if urlparse(absolute_url).netloc in self.allowed_domains:
                page_data['links'].append(absolute_url)
                yield scrapy.Request(absolute_url, callback=self.parse, dont_filter=False)

        self.scraped_items.append(page_data)

    def closed(self, reason):
        """Called when spider finishes - put results in queue"""
        self.results_queue.put({
            'items': self.scraped_items,
            'pages_scraped': self.pages_scraped
        })


def run_spider(start_url, results_queue):
    """Run spider in a separate process"""
    process = CrawlerProcess()
    process.crawl(ContentSpider, start_url=start_url, results_queue=results_queue)
    process.start()


def scrape_with_scrapy(url, timeout=30):
    """
    Scrape a website using Scrapy

    Args:
        url: Website URL to scrape
        timeout: Maximum time to wait for scraping (seconds)

    Returns:
        dict: {
            'success': bool,
            'pages_found': int,
            'items': list of extracted content,
            'error': str (if failed)
        }
    """
    # Create a queue for results
    manager = multiprocessing.Manager()
    results_queue = manager.Queue()

    # Run spider in separate process to avoid reactor issues
    spider_process = multiprocessing.Process(
        target=run_spider,
        args=(url, results_queue)
    )

    spider_process.start()
    spider_process.join(timeout=timeout)

    if spider_process.is_alive():
        spider_process.terminate()
        spider_process.join()
        return {
            'success': False,
            'pages_found': 0,
            'items': [],
            'error': 'Scraping timeout exceeded'
        }

    # Get results from queue
    try:
        results = results_queue.get(timeout=1)
        return {
            'success': True,
            'pages_found': results['pages_scraped'],
            'items': results['items'],
            'error': None
        }
    except Empty:
        return {
            'success': False,
            'pages_found': 0,
            'items': [],
            'error': 'No results returned from spider'
        }


def format_scrapy_results(results):
    """
    Format Scrapy results into numbered list format expected by frontend

    Args:
        results: Scrapy scraping results

    Returns:
        str: Numbered list of extracted items
    """
    items = []

    for page in results['items']:
        # Add page title
        if page['title']:
            items.append(f"Page: {page['title']}")

        # Add headings
        for heading in page['headings'][:3]:
            items.append(heading)

        # Add first meaningful paragraph
        if page['paragraphs']:
            items.append(page['paragraphs'][0][:200] + '...' if len(page['paragraphs'][0]) > 200 else page['paragraphs'][0])

    # Create numbered list
    numbered_items = [f"{i+1}. {item}" for i, item in enumerate(items[:10])]
    return '\n'.join(numbered_items)


if __name__ == '__main__':
    # Test the scraper
    test_url = 'https://example.com'
    print(f"Testing Scrapy scraper on {test_url}...")
    results = scrape_with_scrapy(test_url)
    print(f"Success: {results['success']}")
    print(f"Pages found: {results['pages_found']}")
    print(f"Items extracted: {len(results['items'])}")
    if results['success']:
        formatted = format_scrapy_results(results)
        print("\nFormatted output:")
        print(formatted)
