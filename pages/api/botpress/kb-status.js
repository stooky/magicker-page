/**
 * Check Knowledge Base indexing status
 * Polls Botpress to see if KB file is indexed and ready
 *
 * GET /api/botpress/kb-status?fileId=xxx
 */
import { logInfo, logError, logDebug } from '../../../lib/botpressLogger';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { fileId } = req.query;

    logInfo('KB Status Check Request', { fileId });

    if (!fileId) {
        logError('KB Status: Missing fileId parameter');
        return res.status(400).json({
            success: false,
            error: 'Missing required parameter: fileId'
        });
    }

    const token = process.env.BOTPRESS_API_TOKEN;
    const workspaceId = process.env.BOTPRESS_CLIENT_ID;
    const botId = process.env.BOTPRESS_BOT_ID;

    if (!token || !workspaceId || !botId) {
        return res.status(500).json({
            success: false,
            error: 'Botpress configuration missing'
        });
    }

    try {
        logDebug('Fetching KB file status from Botpress', { fileId, workspaceId, botId });

        // Get file status from Botpress
        const fileResponse = await fetch(`https://api.botpress.cloud/v1/files/${fileId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-workspace-id': workspaceId,
                'x-bot-id': botId,
                'Content-Type': 'application/json'
            }
        });

        if (!fileResponse.ok) {
            const errorData = await fileResponse.json();
            logError('Failed to get file status from Botpress', { status: fileResponse.status, errorData });
            console.error('Failed to get file status:', errorData);
            return res.status(fileResponse.status).json({
                success: false,
                error: 'Failed to get file status',
                details: errorData
            });
        }

        const fileData = await fileResponse.json();

        // Log full response to debug
        console.log('=== FULL BOTPRESS FILE RESPONSE ===');
        console.log(JSON.stringify(fileData, null, 2));
        console.log('=== END RESPONSE ===');

        // Check indexing status
        const file = fileData.file || fileData;
        const isIndexed = file.index === true;
        const status = file.status || file.state || 'unknown';

        // If file has index=true and exists, consider it ready
        // Botpress indexes files very quickly, often immediately
        const ready = isIndexed && file.id;

        console.log(`KB Status for ${fileId}: indexed=${isIndexed}, status=${status}, ready=${ready}, hasId=${!!file.id}`);
        logInfo('KB Status Retrieved', { fileId, indexed: isIndexed, status, ready, hasId: !!file.id });

        res.status(200).json({
            success: true,
            ready: ready,
            indexed: isIndexed,
            status: status,
            fileId: fileId,
            data: fileData
        });

    } catch (error) {
        console.error('Error checking KB status:', error);
        logError('KB Status Check Failed', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check Knowledge Base status',
            details: error.message
        });
    }
}
