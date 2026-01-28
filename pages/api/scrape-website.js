/**
 * Next.js API route to scrape websites
 * Uses Node.js scraping libraries (Cheerio/Playwright/OpenAI)
 * Replaces the Zapier webhook functionality
 */
import { scrapeWebsite } from '../../lib/scrapers/scraper-orchestrator.js';
const { isValidUrl } = require('../../lib/validation');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { url } = req.body;

    if (!url) {
        console.error("Website URL is required");
        return res.status(400).json({
            status: 'error',
            message: '1. Website URL is required'
        });
    }

    if (!isValidUrl(url)) {
        return res.status(400).json({
            status: 'error',
            message: '1. Invalid website URL format'
        });
    }

    console.log("Scraping website:", url);

    try {
        // Ensure URL has protocol
        const formattedUrl = url.startsWith('http') ? url : `http://${url}`;

        // Scrape using Node.js libraries (Cheerio -> Playwright -> OpenAI)
        const result = await scrapeWebsite(formattedUrl);

        console.log(`Scraping ${result.status}! Method: ${result.method_used}, Pages: ${result.pages_found}`);

        // Return in the format expected by frontend (same as Zapier)
        const statusCode = result.status === 'success' ? 200 : 500;
        return res.status(statusCode).json({
            status: result.status,
            message: result.message,      // Display snippets (numbered list)
            fullContent: result.fullContent, // Full page content for KB
            rawItems: result.rawItems,    // Original scraped data
            method_used: result.method_used,
            pages_found: result.pages_found
        });

    } catch (error) {
        console.error("Failed to scrape website:", error);
        return res.status(500).json({
            status: 'error',
            message: '1. Failed to scrape website\n2. Please ensure the URL is accessible',
            error_details: error.message
        });
    }
}
