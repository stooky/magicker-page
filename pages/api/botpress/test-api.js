/**
 * Test endpoint to verify Botpress API token and explore available endpoints
 * Access at: /api/botpress/test-api
 */
export default async function handler(req, res) {
    const token = process.env.BOTPRESS_API_TOKEN;
    const workspaceId = process.env.BOTPRESS_CLIENT_ID;
    const botId = process.env.BOTPRESS_BOT_ID;

    if (!token) {
        return res.status(500).json({ error: 'BOTPRESS_API_TOKEN not configured' });
    }

    try {
        // Test 1: Get bot information
        const botResponse = await fetch(`https://api.botpress.cloud/v1/chat/bots/${botId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-workspace-id': workspaceId,
                'Content-Type': 'application/json'
            }
        });

        const botData = await botResponse.json();

        // Test 2: List files (Knowledge Base uses Files API)
        let filesResponse = null;
        try {
            const filesFetch = await fetch(`https://api.botpress.cloud/v1/files`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-workspace-id': workspaceId,
                    'x-bot-id': botId,
                    'Content-Type': 'application/json'
                }
            });
            filesResponse = {
                status: filesFetch.status,
                statusText: filesFetch.statusText,
                data: await filesFetch.json()
            };
        } catch (error) {
            filesResponse = { error: error.message };
        }

        // Test 3: Try to create a conversation (test session creation)
        let conversationResponse = null;
        try {
            const convFetch = await fetch(`https://api.botpress.cloud/v1/chat/conversations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-workspace-id': workspaceId,
                    'x-bot-id': botId,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    integrationName: 'webchat'
                })
            });
            conversationResponse = {
                status: convFetch.status,
                data: await convFetch.json()
            };
        } catch (error) {
            conversationResponse = { error: error.message };
        }

        res.status(200).json({
            success: true,
            tests: {
                botInfo: {
                    status: botResponse.status,
                    data: botData
                },
                filesAPI: filesResponse,
                conversationCreation: conversationResponse
            },
            config: {
                hasToken: !!token,
                workspaceId: workspaceId,
                botId: botId
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
}
