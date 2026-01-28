import axios from 'axios';

/**
 * Webhook endpoint to receive events from Botpress
 * This can capture lead data, conversation events, and custom bot actions
 */

// Shared database connection pool (singleton)
const pool = require('../../../components/utils/database');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const event = req.body;

        console.log('Botpress webhook received:', JSON.stringify(event, null, 2));

        // Verify webhook secret if configured
        const webhookSecret = process.env.BOTPRESS_WEBHOOK_SECRET;
        if (webhookSecret && req.headers['x-botpress-signature'] !== webhookSecret) {
            console.warn('Invalid webhook signature');
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Handle different event types
        switch (event.type) {
            case 'bp_dialog_engine_before_session_timeout':
            case 'bp_dialog_engine_session_timeout':
                console.log('Session timeout event received');
                break;

            case 'custom':
                // Handle custom events sent from bot flows
                if (event.payload?.action === 'save_lead') {
                    await handleSaveLead(event.payload.data);
                }
                break;

            default:
                // Log all other events for debugging
                console.log('Unhandled event type:', event.type);
        }

        res.status(200).json({ success: true });

    } catch (error) {
        console.error('Error processing Botpress webhook:', error);
        res.status(500).json({
            error: 'Failed to process webhook',
            details: error.message
        });
    }
}

/**
 * Save lead data captured by the bot
 */
async function handleSaveLead(data) {
    const { sessionID, email, website, company, leadData } = data;

    try {
        // Update the database with lead information
        const updateQuery = `
            UPDATE websitevisitors
            SET
                email = COALESCE($1, email),
                website = COALESCE($2, website),
                companyname = COALESCE($3, companyname)
            WHERE sessionid = $4
        `;

        await pool.query(updateQuery, [email, website, company, sessionID]);

        console.log(`Lead data saved for sessionID: ${sessionID}`);

        // You can also send this data to your CRM, email service, etc.
        // await sendToCRM(data);

    } catch (error) {
        console.error('Error saving lead data:', error);
        throw error;
    }
}
