/**
 * Browser Pool Statistics API
 *
 * GET /api/pool-stats - Returns current browser pool statistics
 */
import { getStats, logStats } from '../../lib/browser-pool.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const stats = getStats();

        // Also log to console for server-side monitoring
        logStats();

        return res.status(200).json({
            success: true,
            stats: {
                uptime: stats.uptimeFormatted,
                browserConnected: stats.browserConnected,
                browserLaunches: stats.browserLaunches,
                browserCrashes: stats.browserCrashes,
                pool: {
                    current: stats.currentActive,
                    max: stats.config.MAX_PAGES,
                    peak: stats.peakConcurrent,
                    queueLength: stats.queuedRequests - stats.totalCompleted - stats.totalErrors
                },
                requests: {
                    total: stats.totalRequests,
                    completed: stats.totalCompleted,
                    errors: stats.totalErrors,
                    queued: stats.queuedRequests
                },
                timing: {
                    maxQueueWaitMs: stats.maxQueueWait,
                    avgQueueWaitMs: stats.avgQueueWaitMs
                },
                activePages: stats.activePageUrls
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
