/**
 * Test script for scraper with contact info extraction
 */
import 'dotenv/config';
import { scrapeWebsite } from '../lib/scrapers/scraper-orchestrator.js';

const testUrl = process.argv[2] || 'https://flashfurnacerepair.com';
const domain = new URL(testUrl).hostname.replace('www.', '');

console.log('='.repeat(60));
console.log('SCRAPER TEST');
console.log('='.repeat(60));
console.log('URL:', testUrl);
console.log('Domain:', domain);
console.log('');

async function runTest() {
    try {
        const result = await scrapeWebsite(testUrl);

        console.log('\n' + '='.repeat(60));
        console.log('RESULTS');
        console.log('='.repeat(60));
        console.log('Status:', result.status);
        console.log('Method used:', result.method_used);
        console.log('Pages found:', result.pages_found || 'N/A');
        console.log('Full content length:', result.fullContent?.length || 0, 'chars');

        if (result.fullContent) {
            console.log('\n--- KB CONTENT PREVIEW (first 3000 chars) ---');
            console.log(result.fullContent.substring(0, 3000));
            console.log('\n...[truncated]...');
        }

        console.log('\n' + '='.repeat(60));
        console.log('TEST COMPLETE');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('ERROR:', error);
    }
}

runTest();
