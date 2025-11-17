/**
 * Scraper Orchestrator
 * Tries Cheerio first, falls back to Playwright if needed
 * Uses OpenAI to extract meaningful snippets
 */
import { scrapeWithCheerio, formatCheerioResults } from './cheerio-scraper.js';
import { scrapeWithPlaywright, formatPlaywrightResults } from './playwright-scraper.js';
import { extractMeaningfulSnippets, formatSnippetsAsNumberedList } from './openai-extractor.js';

/**
 * Orchestrate web scraping: Try Cheerio first, fallback to Playwright
 *
 * Strategy:
 * 1. Try Cheerio first (faster, works for most sites)
 * 2. If Cheerio finds <= 1 page, use Playwright (handles JS-heavy sites)
 * 3. Use OpenAI to extract meaningful snippets
 *
 * @param {string} url - Website URL to scrape
 * @returns {Promise<Object>} Scraping results
 */
export async function scrapeWebsite(url) {
    console.log(`Starting scrape orchestration for: ${url}`);

    // Step 1: Try Cheerio first (fast crawling)
    console.log('Attempting Cheerio scrape...');
    const cheerioResults = await scrapeWithCheerio(url, {
        maxPages: 20,
        maxDepth: 2,
        timeout: 15000
    });

    // Check if Cheerio was successful and found enough pages
    if (cheerioResults.success && cheerioResults.pagesFound > 1) {
        console.log(`Cheerio succeeded! Found ${cheerioResults.pagesFound} pages`);

        // Try OpenAI extraction for intelligent snippet selection
        const useOpenAI = process.env.USE_OPENAI_EXTRACTION !== 'false';

        let formattedMessage;
        let methodUsed = 'cheerio';

        if (useOpenAI) {
            console.log('Attempting OpenAI extraction...');
            const openaiResult = await extractMeaningfulSnippets(cheerioResults.items, url);

            if (openaiResult.success && openaiResult.snippets.length > 0) {
                console.log(`OpenAI extraction successful! Extracted ${openaiResult.snippets.length} snippets`);
                formattedMessage = formatSnippetsAsNumberedList(openaiResult.snippets);
                methodUsed = 'cheerio + openai';
            } else {
                console.warn(`OpenAI extraction failed: ${openaiResult.error}, using fallback`);
                formattedMessage = formatCheerioResults(cheerioResults);
            }
        } else {
            formattedMessage = formatCheerioResults(cheerioResults);
        }

        return {
            status: 'success',
            message: formattedMessage,
            method_used: methodUsed,
            pages_found: cheerioResults.pagesFound,
            error_details: null
        };
    }

    // Step 2: Fallback to Playwright
    console.log(`Cheerio found ${cheerioResults.pagesFound} page(s). Falling back to Playwright...`);
    const playwrightResults = await scrapeWithPlaywright(url, {
        timeout: 30000
    });

    if (playwrightResults.success) {
        console.log('Playwright scraping succeeded!');

        // Try OpenAI extraction
        const useOpenAI = process.env.USE_OPENAI_EXTRACTION !== 'false';

        let formattedMessage;
        let methodUsed = 'playwright';

        if (useOpenAI) {
            console.log('Attempting OpenAI extraction...');
            const openaiResult = await extractMeaningfulSnippets(playwrightResults.items, url);

            if (openaiResult.success && openaiResult.snippets.length > 0) {
                console.log(`OpenAI extraction successful! Extracted ${openaiResult.snippets.length} snippets`);
                formattedMessage = formatSnippetsAsNumberedList(openaiResult.snippets);
                methodUsed = 'playwright + openai';
            } else {
                console.warn(`OpenAI extraction failed: ${openaiResult.error}, using fallback`);
                formattedMessage = formatPlaywrightResults(playwrightResults);
            }
        } else {
            formattedMessage = formatPlaywrightResults(playwrightResults);
        }

        return {
            status: 'success',
            message: formattedMessage,
            method_used: methodUsed,
            pages_found: playwrightResults.pagesFound,
            error_details: null
        };
    }

    // Step 3: Both methods failed
    console.error('Both Cheerio and Playwright failed');
    const errorMessage = `Cheerio error: ${cheerioResults.error}. Playwright error: ${playwrightResults.error}`;

    return {
        status: 'error',
        message: '1. Failed to scrape website content\n2. Please check if the URL is accessible',
        method_used: null,
        pages_found: 0,
        error_details: errorMessage
    };
}
