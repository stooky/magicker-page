/**
 * Test Botpress Conversation via API
 * Creates a conversation with domain/fileId context and sends a test message
 * Returns the bot's response to verify KB is working
 *
 * POST /api/botpress/test-conversation
 * Body: { domain, fileId, message?, kbContext? }
 */

const BOTPRESS_TOKEN = process.env.BOTPRESS_API_TOKEN;
const BOTPRESS_WORKSPACE_ID = process.env.BOTPRESS_CLIENT_ID;  // Note: env var is misnamed
const BOTPRESS_BOT_ID = process.env.BOTPRESS_BOT_ID;

const API_BASE = 'https://api.botpress.cloud/v1';

const log = (msg, data) => {
    const ts = new Date().toISOString().split('T')[1].split('.')[0];
    if (data) {
        console.log(`[${ts}] [TEST-CONV] ${msg}`, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    } else {
        console.log(`[${ts}] [TEST-CONV] ${msg}`);
    }
};

async function apiCall(method, endpoint, body = null) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
        'Authorization': `Bearer ${BOTPRESS_TOKEN}`,
        'x-bot-id': BOTPRESS_BOT_ID,
        'Content-Type': 'application/json'
    };

    // Add workspace ID for certain endpoints
    if (endpoint.includes('/files')) {
        headers['x-workspace-id'] = BOTPRESS_WORKSPACE_ID;
    }

    const options = { method, headers };
    if (body) {
        options.body = JSON.stringify(body);
    }

    log(`API ${method} ${endpoint}`);
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
        log(`API ERROR ${response.status}:`, data);
        throw new Error(`API call failed: ${response.status} - ${JSON.stringify(data)}`);
    }

    return data;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { domain, fileId, message, kbContext } = req.body;

    if (!domain) {
        return res.status(400).json({ error: 'domain is required' });
    }

    log('--- TEST CONVERSATION START ---');
    log('Input:', { domain, fileId, message: message?.substring(0, 50), hasKbContext: !!kbContext });

    try {
        // Step 1: Create a user with domain context
        log('Step 1: Creating user...');
        const userKey = `test-user-${domain}-${Date.now()}`;

        const userResponse = await apiCall('POST', '/chat/users', {
            integrationName: 'messaging',
            tags: {
                domain: domain,
                fileId: fileId || '',
                source: 'api-test'
            },
            name: `Test User - ${domain}`
        });

        const userId = userResponse.user?.id;
        log('User created:', userId);

        // Step 2: Create a conversation with domain context
        log('Step 2: Creating conversation...');

        const conversationResponse = await apiCall('POST', '/chat/conversations', {
            integrationName: 'messaging',
            channel: 'channel',
            tags: {
                domain: domain,
                fileId: fileId || '',
                source: 'api-test',
                createdAt: new Date().toISOString()
            }
        });

        const conversationId = conversationResponse.conversation?.id;
        log('Conversation created:', conversationId);

        // Step 3: Send a message
        log('Step 3: Sending message...');

        const testMessage = message || `Tell me about ${domain}. What services do they offer?`;

        // Build payload - optionally include KB context directly
        const messagePayload = {
            type: 'text',
            text: testMessage
        };

        // If kbContext provided, include it in payload for direct access
        if (kbContext) {
            messagePayload.kbContext = kbContext;
            log('Including kbContext in payload:', kbContext.length + ' chars');
        }

        const messageResponse = await apiCall('POST', '/chat/messages', {
            integrationName: 'messaging',
            conversationId: conversationId,
            userId: userId,
            type: 'text',
            payload: messagePayload,
            tags: {
                domain: domain
            }
        });

        const messageId = messageResponse.message?.id;
        log('Message sent:', messageId);

        // Step 4: Poll for bot response
        log('Step 4: Waiting for bot response...');

        let botResponse = null;
        const maxAttempts = 30;
        const pollInterval = 1000;

        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(r => setTimeout(r, pollInterval));

            // Get messages in conversation
            const messagesResponse = await apiCall('GET', `/chat/messages?conversationId=${conversationId}`);
            const messages = messagesResponse.messages || [];

            // Find bot responses (messages not from our user)
            const botMessages = messages.filter(m => m.userId !== userId && m.direction === 'outgoing');

            if (botMessages.length > 0) {
                // Get the latest bot message
                botResponse = botMessages[botMessages.length - 1];
                log('Bot response received:', botResponse.payload?.text?.substring(0, 100) + '...');
                break;
            }

            log(`Polling... attempt ${i + 1}/${maxAttempts}`);
        }

        if (!botResponse) {
            log('WARNING: No bot response received after polling');
        }

        // Step 5: Return results
        log('--- TEST CONVERSATION COMPLETE ---');

        return res.status(200).json({
            success: true,
            userId,
            conversationId,
            messageId,
            userMessage: testMessage,
            botResponse: botResponse ? {
                id: botResponse.id,
                text: botResponse.payload?.text,
                createdAt: botResponse.createdAt
            } : null,
            debug: {
                domain,
                fileId,
                hadKbContext: !!kbContext
            }
        });

    } catch (error) {
        log('ERROR:', error.message);
        console.error(error);

        return res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
