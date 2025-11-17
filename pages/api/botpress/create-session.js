/**
 * API endpoint to prepare Botpress session data
 * For Botpress Cloud, the webchat handles session creation automatically
 * We just log the data for now and return success
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, website, company, sessionID, scrapedContent, screenshot } = req.body;

    if (!email || !website || !sessionID) {
        return res.status(400).json({ error: 'Missing required fields: email, website, sessionID' });
    }

    const botId = process.env.BOTPRESS_BOT_ID;

    if (!botId) {
        console.error('BOTPRESS_BOT_ID is not configured in environment variables');
        return res.status(500).json({ error: 'Botpress is not configured' });
    }

    // Log session data for debugging
    console.log(`Botpress session prepared for sessionID: ${sessionID}`);
    console.log('Company:', company);
    console.log('Website:', website);
    console.log('Scraped items:', scrapedContent?.length || 0);

    // For Botpress Cloud, we'll pass this data via webchat config later
    // For now, just return success so the flow continues
    res.status(200).json({
        success: true,
        sessionID: sessionID,
        botId: botId,
        message: 'Session data prepared'
    });
}
