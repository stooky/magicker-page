/**
 * Create Knowledge Base using Botpress SDK
 * Uploads scraped content with domain tagging for context-aware responses
 *
 * POST /api/botpress/kb-create
 * Body: { domain, fullContent, sessionID, website }
 */
import { Client } from '@botpress/client';
import { logInfo, logError, logDebug } from '../../../lib/botpressLogger';

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

        console.log(`Creating Knowledge Base for domain: ${domain}`);
        console.log(`File name: ${fileName}`);
        console.log(`Content length: ${fullContent.length} characters`);

        // Upload file using Botpress SDK
        const file = await bp.uploadFile({
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
        });

        console.log('Full uploadFile response:', JSON.stringify(file, null, 2));

        // Extract file ID from response (Botpress SDK returns { file: { id: "..." } })
        const fileId = file.file?.id || file.id;
        console.log('Knowledge Base file created with ID:', fileId);
        logInfo('KB Created Successfully', { fileId, domain, sessionID, fileName });

        // List all Knowledge Base files and dump to log
        try {
            logDebug('Fetching all KB files from Botpress', { botId });
            const allFiles = await bp.listFiles({});

            const filesList = allFiles.files?.map(f => ({
                id: f.id,
                key: f.key,
                tags: f.tags,
                index: f.index,
                createdAt: f.createdAt
            })) || [];

            logInfo('All KB Files in Botpress', {
                totalFiles: filesList.length,
                files: filesList,
                justCreatedFileId: fileId
            });

            console.log(`Total KB files in Botpress: ${filesList.length}`);
            console.log('All KB files:', JSON.stringify(filesList, null, 2));
        } catch (listError) {
            logError('Failed to list KB files', listError);
            console.error('Error listing KB files:', listError);
            // Don't fail the whole request if listing fails
        }

        // Return success with file info
        res.status(200).json({
            success: true,
            fileId: fileId,
            fileName: fileName,
            domain: domain,
            indexed: true,
            message: 'Knowledge Base created successfully',
            data: file
        });

    } catch (error) {
        console.error('Error creating Knowledge Base:', error);
        logError('KB Create Failed', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create Knowledge Base',
            details: error.message
        });
    }
}
