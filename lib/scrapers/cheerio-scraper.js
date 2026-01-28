/**
 * Cheerio-based web scraper (Node.js equivalent of Scrapy)
 * Fast multi-page crawling for static websites
 */
import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

/**
 * Fetch URL with exponential backoff retry.
 * @param {string} url - URL to fetch
 * @param {Object} config - Axios config
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @returns {Promise<Object>} Axios response
 */
async function fetchWithRetry(url, config, maxRetries = 3) {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await axios.get(url, config);
        } catch (err) {
            lastError = err;
            // Don't retry on 4xx errors (client errors)
            if (err.response && err.response.status >= 400 && err.response.status < 500) {
                throw err;
            }
            // Exponential backoff: 1s, 2s, 4s
            if (attempt < maxRetries - 1) {
                const delay = Math.pow(2, attempt) * 1000;
                console.log(`[cheerio] Retry ${attempt + 1}/${maxRetries} for ${url} after ${delay}ms`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }
    throw lastError;
}

/**
 * Scrape a website using Cheerio (like Scrapy)
 *
 * @param {string} url - Website URL to scrape
 * @param {Object} options - Scraping options
 * @param {number} options.maxPages - Maximum pages to scrape (default: 20)
 * @param {number} options.maxDepth - Maximum crawl depth (default: 2)
 * @param {number} options.timeout - Request timeout in ms (default: 15000)
 * @returns {Promise<Object>} Scraping results
 */
export async function scrapeWithCheerio(url, options = {}) {
    const {
        maxPages = 20,
        maxDepth = 2,
        timeout = 15000
    } = options;

    const results = {
        success: false,
        pagesFound: 0,
        items: [],
        error: null
    };

    try {
        const baseUrl = new URL(url);
        const visited = new Set();
        const toVisit = [{ url, depth: 0 }];

        while (toVisit.length > 0 && results.pagesFound < maxPages) {
            const { url: currentUrl, depth } = toVisit.shift();

            // Skip if already visited or too deep
            if (visited.has(currentUrl) || depth > maxDepth) {
                continue;
            }

            visited.add(currentUrl);

            try {
                // Fetch page with retry
                const response = await fetchWithRetry(currentUrl, {
                    timeout,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    },
                    maxRedirects: 5
                });

                // Parse with Cheerio
                const $ = cheerio.load(response.data);

                // Extract content
                const pageData = {
                    url: currentUrl,
                    title: $('title').text().trim() || '',
                    headings: [],
                    paragraphs: [],
                    lists: [],
                    links: []
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

                // Extract internal links for crawling
                if (depth < maxDepth) {
                    $('a[href]').each((i, elem) => {
                        try {
                            const href = $(elem).attr('href');
                            if (!href) return;

                            const absoluteUrl = new URL(href, currentUrl).href;
                            const linkUrl = new URL(absoluteUrl);

                            // Only follow same-domain links
                            if (linkUrl.hostname === baseUrl.hostname && !visited.has(absoluteUrl)) {
                                pageData.links.push(absoluteUrl);
                                toVisit.push({ url: absoluteUrl, depth: depth + 1 });
                            }
                        } catch (e) {
                            // Invalid URL, skip
                        }
                    });
                }

                results.items.push(pageData);
                results.pagesFound++;

            } catch (pageError) {
                console.warn(`Failed to scrape ${currentUrl}:`, pageError.message);
                // Continue with next page
            }
        }

        results.success = results.pagesFound > 0;
        return results;

    } catch (error) {
        results.error = error.message;
        return results;
    }
}

/**
 * Format Cheerio scraping results into numbered list
 *
 * @param {Object} results - Scraping results from scrapeWithCheerio
 * @returns {string} Formatted numbered list
 */
export function formatCheerioResults(results) {
    const items = [];

    for (const page of results.items) {
        // Add page title
        if (page.title) {
            items.push(`Page: ${page.title}`);
        }

        // Add headings (top 3)
        for (const heading of page.headings.slice(0, 3)) {
            if (!items.includes(heading)) {
                items.push(heading);
            }
        }

        // Add first meaningful paragraph
        if (page.paragraphs.length > 0) {
            const para = page.paragraphs[0];
            const shortPara = para.length > 200 ? para.substring(0, 200) + '...' : para;
            items.push(shortPara);
        }
    }

    // Create numbered list (limit to 10 items)
    const numberedItems = items.slice(0, 10).map((item, i) => `${i + 1}. ${item}`);
    return numberedItems.join('\n');
}
