/**
 * API endpoint to create Botpress conversation session
 * Creates a real session via Botpress Cloud API
 */
import { DEBUG_BOTPRESS_REQUESTS, DEBUG_OPTIONS, logBotpressRequest, logBotpressResponse } from '../../../configuration/debugConfig';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, website, company, sessionID, fileId } = req.body;

    if (!website || !sessionID) {
        return res.status(400).json({ error: 'Missing required fields: website, sessionID' });
    }

    const token = process.env.BOTPRESS_API_TOKEN;
    const workspaceId = process.env.BOTPRESS_CLIENT_ID;
    const botId = process.env.BOTPRESS_BOT_ID;

    if (!token || !workspaceId || !botId) {
        console.error('Botpress configuration missing');
        return res.status(500).json({ error: 'Botpress is not configured' });
    }

    try {
        // Create Botpress conversation session
        console.log(`Creating Botpress session for sessionID: ${sessionID}`);
        console.log('Company:', company);
        console.log('Website:', website);
        console.log('KB File ID:', fileId);

        const conversationUrl = 'https://api.botpress.cloud/v1/chat/conversations';
        const conversationHeaders = {
            'Authorization': `Bearer ${token}`,
            'x-workspace-id': workspaceId,
            'x-bot-id': botId,
            'Content-Type': 'application/json'
        };
        const conversationBody = {
            channel: 'webchat',
            integrationAlias: 'webchat',
            tags: {
                sessionID: sessionID,
                website: website,
                company: company || 'Unknown Company',
                email: email || 'not-provided',
                kbFileId: fileId || 'none'
            }
        };

        // Debug log the request
        if (DEBUG_BOTPRESS_REQUESTS && DEBUG_OPTIONS.LOG_SESSION_REQUESTS) {
            logBotpressRequest('SESSION', 'Create conversation', {
                url: conversationUrl,
                method: 'POST',
                headers: { ...conversationHeaders, Authorization: '[REDACTED]' },
                body: conversationBody
            });
        }

        const sessionStartTime = Date.now();

        const conversationResponse = await fetch(conversationUrl, {
            method: 'POST',
            headers: conversationHeaders,
            body: JSON.stringify(conversationBody)
        });

        if (!conversationResponse.ok) {
            const errorData = await conversationResponse.json();
            console.error('Failed to create conversation:', errorData);

            if (DEBUG_BOTPRESS_REQUESTS && DEBUG_OPTIONS.LOG_SESSION_REQUESTS) {
                logBotpressResponse('SESSION', 'Create conversation FAILED', {
                    status: conversationResponse.status,
                    error: errorData
                }, Date.now() - sessionStartTime);
            }

            return res.status(conversationResponse.status).json({
                success: false,
                error: 'Failed to create Botpress session',
                details: errorData
            });
        }

        const conversationData = await conversationResponse.json();

        // Debug log the response
        if (DEBUG_BOTPRESS_REQUESTS && DEBUG_OPTIONS.LOG_SESSION_REQUESTS) {
            logBotpressResponse('SESSION', 'Conversation created', conversationData, Date.now() - sessionStartTime);
        }

        console.log('Botpress conversation created:', conversationData.id);

        res.status(200).json({
            success: true,
            sessionID: sessionID,
            botId: botId,
            conversationId: conversationData.id,
            message: 'Session data prepared',
            data: conversationData
        });

    } catch (error) {
        console.error('Error creating Botpress session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create session',
            details: error.message
        });
    }
}
