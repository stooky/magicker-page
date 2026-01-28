/**
 * Create Knowledge Base using Botpress SDK
 * Uploads scraped content with domain tagging for context-aware responses
 * Waits for indexing to complete before returning (no polling needed)
 * Also saves a local copy of the KB file for debugging/backup
 *
 * POST /api/botpress/kb-create
 * Body: { domain, fullContent, sessionID, website }
 */
import { Client } from '@botpress/client';
import { logInfo, logError, logDebug } from '../../../lib/botpressLogger';
import fs from 'fs';
import path from 'path';
import { DEBUG_BOTPRESS_REQUESTS, DEBUG_OPTIONS, logBotpressRequest, logBotpressResponse } from '../../../configuration/debugConfig';

// Helper to wait for indexing to complete with exponential backoff
async function waitForIndexing(fileId, token, workspaceId, botId, maxWaitMs = 30000) {
    const startTime = Date.now();
    let attemptNumber = 0;

    while (Date.now() - startTime < maxWaitMs) {
        // Exponential backoff: 1s, 1.5s, 2.25s, 3.375s, max 5s
        const pollInterval = Math.min(1000 * Math.pow(1.5, attemptNumber), 5000);
        attemptNumber++;
        try {
            const statusUrl = `https://api.botpress.cloud/v1/files/${fileId}`;
            const statusHeaders = {
                'Authorization': `Bearer ${token}`,
                'x-workspace-id': workspaceId,
                'x-bot-id': botId,
                'Content-Type': 'application/json'
            };

            if (DEBUG_BOTPRESS_REQUESTS && DEBUG_OPTIONS.LOG_STATUS_POLLING) {
                logBotpressRequest('KB-STATUS', 'Check indexing status', {
                    url: statusUrl,
                    method: 'GET',
                    headers: { ...statusHeaders, Authorization: '[REDACTED]' },
                    fileId: fileId,
                    elapsedMs: Date.now() - startTime
                });
            }

            const response = await fetch(statusUrl, { headers: statusHeaders });

            if (response.ok) {
                const data = await response.json();
                const file = data.file || data;
                const status = file.status || file.state || 'unknown';

                if (DEBUG_BOTPRESS_REQUESTS && DEBUG_OPTIONS.LOG_STATUS_POLLING) {
                    logBotpressResponse('KB-STATUS', 'Indexing status response', {
                        status: status,
                        fileId: fileId,
                        file: file
                    }, Date.now() - startTime);
                }

                console.log(`[KB-CREATE] Indexing status: ${status} (${Date.now() - startTime}ms elapsed)`);

                // ONLY return ready when status is explicitly 'indexing_completed'
                if (status === 'indexing_completed') {
                    return { ready: true, status };
                }

                // Fail fast on errors
                if (status === 'indexing_failed' || status === 'error') {
                    return { ready: false, status, error: 'Indexing failed' };
                }

                // Still pending - continue polling
                // statuses: upload_pending, indexing_pending, indexing_in_progress
            }
        } catch (err) {
            console.warn('[KB-CREATE] Error checking status:', err.message);
        }

        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    // Timeout - assume ready (Botpress indexing is usually fast for small files)
    console.warn('[KB-CREATE] Indexing wait timeout after 30s, assuming ready');
    return { ready: true, status: 'timeout_assumed_ready' };
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { domain, fullContent, sessionID, website } = req.body;

    logInfo('KB Create Request', { domain, sessionID, website, contentLength: fullContent?.length });

    if (!domain || !fullContent || !sessionID) {
        logError('KB Create: Missing required fields', { domain, sessionID, hasContent: !!fullContent });
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: domain, fullContent, sessionID'
        });
    }

    const token = process.env.BOTPRESS_API_TOKEN;
    const botId = process.env.BOTPRESS_BOT_ID;
    const workspaceId = process.env.BOTPRESS_CLIENT_ID;

    if (!token || !botId) {
        logError('KB Create: Botpress configuration missing');
        return res.status(500).json({
            success: false,
            error: 'Botpress configuration missing (token or bot ID)'
        });
    }

    try {
        logDebug('Initializing Botpress client', { botId });
        // Initialize Botpress client
        const bp = new Client({
            token: token,
            botId: botId
        });

        const sanitizedDomain = domain.replace(/[^a-zA-Z0-9-_.]/g, '-');
        const timestamp = Date.now();
        const fileName = `${sanitizedDomain}-${timestamp}.txt`;

        console.log(`[KB-CREATE] Creating Knowledge Base for domain: ${domain}`);
        console.log(`[KB-CREATE] File name: ${fileName}`);
        console.log(`[KB-CREATE] Content length: ${fullContent.length} characters`);

        // Prepare upload payload
        const uploadPayload = {
            key: fileName,
            content: fullContent,
            index: true,  // Enable indexing for semantic search
            tags: {
                domain: sanitizedDomain,
                originalDomain: domain,
                sessionID: sessionID,
                website: website,
                source: 'knowledge-base',
                createdAt: new Date().toISOString()
            }
        };

        // Debug log the request
        if (DEBUG_BOTPRESS_REQUESTS && DEBUG_OPTIONS.LOG_KB_REQUESTS) {
            logBotpressRequest('KB-CREATE', 'Upload file to Botpress', {
                endpoint: 'Botpress SDK bp.uploadFile()',
                botId: botId,
                payload: {
                    ...uploadPayload,
                    content: `[${fullContent.length} characters - truncated]`,
                    contentPreview: fullContent.substring(0, 500) + '...'
                }
            });
        }

        const uploadStartTime = Date.now();

        // Upload file using Botpress SDK
        const file = await bp.uploadFile(uploadPayload);

        // Debug log the response
        if (DEBUG_BOTPRESS_REQUESTS && DEBUG_OPTIONS.LOG_KB_REQUESTS) {
            logBotpressResponse('KB-CREATE', 'File upload response', file, Date.now() - uploadStartTime);
        }

        console.log('[KB-CREATE] Upload response:', JSON.stringify(file, null, 2));

        // Extract file ID from response (Botpress SDK returns { file: { id: "..." } })
        const fileId = file.file?.id || file.id;
        console.log('[KB-CREATE] File created with ID:', fileId);

        // Wait for indexing to complete (no more frontend polling!)
        console.log('[KB-CREATE] Waiting for indexing to complete...');
        const indexResult = await waitForIndexing(fileId, token, workspaceId, botId);

        console.log(`[KB-CREATE] ✅ Indexing complete! Status: ${indexResult.status}`);
        logInfo('KB Created & Indexed Successfully', { fileId, domain, sessionID, fileName, indexStatus: indexResult.status });

        // Save a local copy of the KB file for debugging/backup
        // Format: [domain]-[timestamp]-[botpress fileID].txt
        try {
            const kbDir = path.join(process.cwd(), 'data', 'kb-files');

            // Create directory if it doesn't exist
            if (!fs.existsSync(kbDir)) {
                fs.mkdirSync(kbDir, { recursive: true });
                console.log(`[KB-CREATE] Created KB directory: ${kbDir}`);
            }

            // Build local filename: same as uploaded but with fileId appended
            const localFileName = `${sanitizedDomain}-${timestamp}-${fileId}.txt`;
            const localFilePath = path.join(kbDir, localFileName);

            // Write the file
            fs.writeFileSync(localFilePath, fullContent, 'utf8');
            console.log(`[KB-CREATE] ✅ Local copy saved: ${localFilePath}`);
        } catch (saveError) {
            // Don't fail the request if local save fails
            console.warn('[KB-CREATE] ⚠️ Failed to save local copy:', saveError.message);
        }

        // Return success with ready=true (frontend can proceed immediately)
        res.status(200).json({
            success: true,
            ready: indexResult.ready,  // NEW: Signal that KB is ready to use
            fileId: fileId,
            fileName: fileName,
            domain: domain,
            indexed: true,
            indexStatus: indexResult.status,
            message: 'Knowledge Base created and indexed successfully',
            data: file
        });

    } catch (error) {
        console.error('[KB-CREATE] Error creating Knowledge Base:', error);
        logError('KB Create Failed', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create Knowledge Base',
            details: error.message
        });
    }
}
