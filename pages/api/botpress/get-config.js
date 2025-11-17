/**
 * API endpoint to get Botpress configuration
 * Returns the bot ID and webchat URL for the frontend
 */
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const botpressUrl = process.env.BOTPRESS_SERVER_URL || 'https://chat.botpress.cloud';
    const botId = process.env.BOTPRESS_BOT_ID;
    const webhookId = process.env.BOTPRESS_WEBHOOK_ID;
    const clientId = process.env.BOTPRESS_CLIENT_ID;

    if (!botId) {
        console.error('BOTPRESS_BOT_ID not found in environment variables');
        return res.status(500).json({
            success: false,
            error: 'Botpress is not configured. Please set BOTPRESS_BOT_ID in environment variables.'
        });
    }

    console.log('Returning Botpress config:', { botId, botpressUrl });

    res.status(200).json({
        success: true,
        botpressUrl: botpressUrl,
        botId: botId,
        webhookId: webhookId,
        clientId: clientId,
        // For Botpress Cloud, the webchat URL is different
        webchatUrl: `https://cdn.botpress.cloud/webchat/v1`,
    });
}
