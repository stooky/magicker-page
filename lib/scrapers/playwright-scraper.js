/**
 * Playwright-based web scraper for Node.js
 * Handles JavaScript-heavy websites and single-page applications
 */
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

/**
 * Scrape a website using Playwright (handles JavaScript)
 *
 * @param {string} url - Website URL to scrape
 * @param {Object} options - Scraping options
 * @param {number} options.timeout - Page load timeout in ms (default: 30000)
 * @returns {Promise<Object>} Scraping results
 */
export async function scrapeWithPlaywright(url, options = {}) {
    const { timeout = 30000 } = options;

    const results = {
        success: false,
        pagesFound: 0,
        items: [],
        error: null
    };

    let browser = null;

    try {
        // Launch browser
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        const page = await context.newPage();

        console.log(`Navigating to ${url} with Playwright...`);

        // Navigate to the page
        try {
            await page.goto(url, {
                waitUntil: 'networkidle',
                timeout
            });
        } catch (timeoutError) {
            console.warn('Page load timeout, continuing with partial content...');
            await page.waitForTimeout(5000);
        }

        // Wait for dynamic content
        await page.waitForTimeout(2000);

        // Scroll to load lazy content
        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => window.scrollBy(0, window.innerHeight));
            await page.waitForTimeout(500);
        }

        // Get page content and title
        const content = await page.content();
        const pageTitle = await page.title();

        // Extract links
        const links = await page.$$eval('a[href]', anchors =>
            anchors.slice(0, 20).map(a => a.href).filter(href => href)
        );

        await browser.close();
        browser = null;

        // Parse with Cheerio
        const $ = cheerio.load(content);

        // Remove non-content elements
        $('script, style, nav, footer, header, aside, noscript').remove();

        // Extract content
        const pageData = {
            url,
            title: pageTitle,
            headings: [],
            paragraphs: [],
            lists: [],
            links
        };

        // Extract headings
        $('h1, h2, h3, h4').each((i, elem) => {
            const text = $(elem).text().trim();
            if (text && text.length > 3 && text.length < 200) {
                pageData.headings.push(text);
            }
        });

        // Extract paragraphs
        $('p').each((i, elem) => {
            const text = $(elem).text().trim();
            if (text && text.length > 20 && text.length < 500) {
                pageData.paragraphs.push(text);
            }
        });

        // Extract list items
        $('ul li, ol li').each((i, elem) => {
            const text = $(elem).text().trim();
            if (text && text.length > 5 && text.length < 300) {
                pageData.lists.push(text);
            }
        });

        results.items.push(pageData);
        results.pagesFound = 1;
        results.success = true;

        return results;

    } catch (error) {
        console.error('Playwright scraping error:', error);
        results.error = error.message;
        return results;

    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * Format Playwright scraping results into numbered list
 *
 * @param {Object} results - Scraping results from scrapeWithPlaywright
 * @returns {string} Formatted numbered list
 */
export function formatPlaywrightResults(results) {
    const items = [];

    for (const page of results.items) {
        // Add page title
        if (page.title) {
            items.push(`Website: ${page.title}`);
        }

        // Add unique headings (prioritize important ones)
        const uniqueHeadings = [...new Set(page.headings)];
        for (const heading of uniqueHeadings.slice(0, 5)) {
            items.push(heading);
        }

        // Add list items (often key features/services)
        for (const listItem of page.lists.slice(0, 8)) {
            if (!items.includes(listItem)) {
                items.push(listItem);
            }
        }

        // Add paragraphs if we don't have enough items
        if (items.length < 8) {
            for (const para of page.paragraphs.slice(0, 5)) {
                const shortPara = para.length > 150 ? para.substring(0, 150) + '...' : para;
                if (!items.includes(shortPara)) {
                    items.push(shortPara);
                }
            }
        }
    }

    // Create numbered list (limit to 10 items)
    const numberedItems = items.slice(0, 10).map((item, i) => `${i + 1}. ${item}`);
    return numberedItems.length > 0
        ? numberedItems.join('\n')
        : '1. Website content extracted successfully';
}
