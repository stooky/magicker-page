/**
 * Browser Pool for Playwright
 *
 * Manages a shared Chromium browser instance with page pooling.
 * Prevents memory exhaustion from launching multiple browser instances.
 *
 * Features:
 * - Single browser instance shared across all requests
 * - Configurable max concurrent pages
 * - Queue system when pool is full
 * - Comprehensive monitoring and logging
 * - Auto-recovery on browser crash
 */
import { chromium } from 'playwright';

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    MAX_PAGES: 5,              // Max concurrent pages
    PAGE_TIMEOUT: 30000,       // 30 seconds page timeout
    QUEUE_TIMEOUT: 60000,      // 60 seconds max wait in queue
    BROWSER_ARGS: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',  // Prevents memory issues in Docker
        '--disable-gpu'
    ]
};

// ============================================
// STATE
// ============================================
let browser = null;
let browserContext = null;
let isLaunching = false;
const activePages = new Map();  // pageId -> { page, url, startTime }
const waitQueue = [];           // Waiting requests

// ============================================
// MONITORING STATS
// ============================================
const stats = {
    totalRequests: 0,
    totalCompleted: 0,
    totalErrors: 0,
    peakConcurrent: 0,
    currentActive: 0,
    browserLaunches: 0,
    browserCrashes: 0,
    queuedRequests: 0,
    maxQueueWait: 0,
    totalQueueWait: 0,
    startTime: Date.now()
};

// ============================================
// LOGGING
// ============================================
const log = (level, msg, data = null) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = `[${timestamp}] [BROWSER-POOL]`;

    const statsSnapshot = `[active:${stats.currentActive}/${CONFIG.MAX_PAGES} queue:${waitQueue.length} peak:${stats.peakConcurrent}]`;

    if (data) {
        console[level](`${prefix} ${statsSnapshot} ${msg}`, data);
    } else {
        console[level](`${prefix} ${statsSnapshot} ${msg}`);
    }
};

const logInfo = (msg, data) => log('log', msg, data);
const logWarn = (msg, data) => log('warn', `⚠️ ${msg}`, data);
const logError = (msg, data) => log('error', `❌ ${msg}`, data);

// ============================================
// BROWSER LIFECYCLE
// ============================================

/**
 * Get or create the shared browser instance
 */
async function getBrowser() {
    // Already have a browser
    if (browser && browser.isConnected()) {
        return browser;
    }

    // Another request is already launching - wait for it
    if (isLaunching) {
        logInfo('Browser launch in progress, waiting...');
        await new Promise(resolve => {
            const checkInterval = setInterval(() => {
                if (browser && browser.isConnected()) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });
        return browser;
    }

    // Launch new browser
    isLaunching = true;
    try {
        logInfo('🚀 Launching new browser instance...');
        const launchStart = Date.now();

        browser = await chromium.launch({
            headless: true,
            args: CONFIG.BROWSER_ARGS
        });

        // Create shared context
        browserContext = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        stats.browserLaunches++;
        logInfo(`✅ Browser launched in ${Date.now() - launchStart}ms (total launches: ${stats.browserLaunches})`);

        // Handle browser disconnect
        browser.on('disconnected', () => {
            logWarn('Browser disconnected unexpectedly');
            stats.browserCrashes++;
            browser = null;
            browserContext = null;

            // Clear active pages - they're all dead now
            activePages.clear();
            stats.currentActive = 0;
        });

        return browser;

    } catch (error) {
        logError('Failed to launch browser:', error.message);
        throw error;
    } finally {
        isLaunching = false;
    }
}

// ============================================
// PAGE POOL MANAGEMENT
// ============================================

/**
 * Acquire a page from the pool
 * Will wait in queue if pool is full
 *
 * @param {string} url - URL being scraped (for logging)
 * @returns {Promise<{page, pageId}>} Page and its ID for release
 */
export async function acquirePage(url) {
    stats.totalRequests++;
    const requestId = `req-${stats.totalRequests}`;
    const queueStart = Date.now();

    logInfo(`📥 Request ${requestId} for: ${url.substring(0, 50)}...`);

    // Check if we need to wait
    if (stats.currentActive >= CONFIG.MAX_PAGES) {
        logInfo(`⏳ Pool full, request ${requestId} queued...`);
        stats.queuedRequests++;

        // Wait for a slot
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                // Remove from queue
                const idx = waitQueue.indexOf(resolve);
                if (idx > -1) waitQueue.splice(idx, 1);
                reject(new Error(`Queue timeout after ${CONFIG.QUEUE_TIMEOUT}ms`));
            }, CONFIG.QUEUE_TIMEOUT);

            waitQueue.push(() => {
                clearTimeout(timeout);
                resolve();
            });
        });

        const waitTime = Date.now() - queueStart;
        stats.totalQueueWait += waitTime;
        if (waitTime > stats.maxQueueWait) {
            stats.maxQueueWait = waitTime;
        }
        logInfo(`✅ Request ${requestId} acquired slot after ${waitTime}ms wait`);
    }

    // Get browser
    await getBrowser();

    // Create new page
    const page = await browserContext.newPage();
    const pageId = `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Track active page
    activePages.set(pageId, {
        page,
        url,
        startTime: Date.now(),
        requestId
    });

    stats.currentActive = activePages.size;
    if (stats.currentActive > stats.peakConcurrent) {
        stats.peakConcurrent = stats.currentActive;
        logInfo(`📈 New peak concurrent pages: ${stats.peakConcurrent}`);
    }

    logInfo(`✅ Page ${pageId} created for ${requestId}`);

    return { page, pageId };
}

/**
 * Release a page back to the pool
 *
 * @param {string} pageId - Page ID returned from acquirePage
 */
export async function releasePage(pageId) {
    const pageInfo = activePages.get(pageId);

    if (!pageInfo) {
        logWarn(`Attempted to release unknown page: ${pageId}`);
        return;
    }

    const duration = Date.now() - pageInfo.startTime;

    try {
        await pageInfo.page.close();
    } catch (error) {
        logWarn(`Error closing page ${pageId}:`, error.message);
    }

    activePages.delete(pageId);
    stats.currentActive = activePages.size;
    stats.totalCompleted++;

    logInfo(`✅ Page ${pageId} released (duration: ${duration}ms, completed: ${stats.totalCompleted})`);

    // Wake up next in queue
    if (waitQueue.length > 0) {
        const next = waitQueue.shift();
        logInfo(`📤 Waking queued request (${waitQueue.length} still waiting)`);
        next();
    }
}

/**
 * Release page and record an error
 *
 * @param {string} pageId - Page ID
 * @param {Error} error - The error that occurred
 */
export async function releasePageWithError(pageId, error) {
    stats.totalErrors++;
    logError(`Page ${pageId} error:`, error.message);
    await releasePage(pageId);
}

// ============================================
// MONITORING & STATS
// ============================================

/**
 * Get current pool statistics
 */
export function getStats() {
    const uptime = Date.now() - stats.startTime;
    const avgQueueWait = stats.queuedRequests > 0
        ? Math.round(stats.totalQueueWait / stats.queuedRequests)
        : 0;

    return {
        ...stats,
        uptimeMs: uptime,
        uptimeFormatted: formatDuration(uptime),
        avgQueueWaitMs: avgQueueWait,
        browserConnected: browser?.isConnected() || false,
        config: CONFIG,
        activePageUrls: Array.from(activePages.values()).map(p => ({
            url: p.url,
            duration: Date.now() - p.startTime
        }))
    };
}

/**
 * Log current statistics
 */
export function logStats() {
    const s = getStats();
    console.log('\n' + '='.repeat(60));
    console.log('BROWSER POOL STATISTICS');
    console.log('='.repeat(60));
    console.log(`Uptime:              ${s.uptimeFormatted}`);
    console.log(`Browser connected:   ${s.browserConnected}`);
    console.log(`Browser launches:    ${s.browserLaunches}`);
    console.log(`Browser crashes:     ${s.browserCrashes}`);
    console.log('---');
    console.log(`Current active:      ${s.currentActive}/${CONFIG.MAX_PAGES}`);
    console.log(`Peak concurrent:     ${s.peakConcurrent}`);
    console.log(`Queue length:        ${waitQueue.length}`);
    console.log('---');
    console.log(`Total requests:      ${s.totalRequests}`);
    console.log(`Total completed:     ${s.totalCompleted}`);
    console.log(`Total errors:        ${s.totalErrors}`);
    console.log(`Queued requests:     ${s.queuedRequests}`);
    console.log(`Max queue wait:      ${s.maxQueueWait}ms`);
    console.log(`Avg queue wait:      ${s.avgQueueWaitMs}ms`);
    if (s.activePageUrls.length > 0) {
        console.log('---');
        console.log('Active pages:');
        s.activePageUrls.forEach((p, i) => {
            console.log(`  ${i + 1}. ${p.url.substring(0, 50)}... (${p.duration}ms)`);
        });
    }
    console.log('='.repeat(60) + '\n');
}

/**
 * Format milliseconds into human readable duration
 */
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

// ============================================
// CLEANUP
// ============================================

/**
 * Gracefully shutdown the browser pool
 */
export async function shutdown() {
    logInfo('🛑 Shutting down browser pool...');

    // Close all active pages
    for (const [pageId, pageInfo] of activePages) {
        try {
            await pageInfo.page.close();
            logInfo(`Closed page ${pageId}`);
        } catch (e) {
            // Ignore errors during shutdown
        }
    }
    activePages.clear();

    // Close browser
    if (browser) {
        try {
            await browser.close();
            logInfo('Browser closed');
        } catch (e) {
            // Ignore
        }
        browser = null;
        browserContext = null;
    }

    // Log final stats
    logStats();
    logInfo('✅ Browser pool shutdown complete');
}

// Handle process termination
if (typeof process !== 'undefined') {
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}
