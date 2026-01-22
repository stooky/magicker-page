// pages/api/share/trigger-email.js
// Trigger shareable link email after first chat message
const pool = require('../../../components/utils/database');
import { sendShareableLinkEmail, isEmailConfigured } from '../../../lib/emailService';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { sessionID, domain } = req.body;

    if (!sessionID) {
        return res.status(400).json({
            success: false,
            error: 'sessionID is required'
        });
    }

    // Check if email service is configured
    if (!isEmailConfigured()) {
        console.warn('[trigger-email] Resend API key not configured, skipping email');
        return res.status(200).json({
            success: false,
            error: 'Email service not configured',
            skipped: true
        });
    }

    try {
        // Get visitor record
        const query = `
            SELECT email, website, companyname, slug, share_email_sent
            FROM websitevisitors
            WHERE sessionid = $1
            LIMIT 1;
        `;
        const result = await pool.query(query, [sessionID]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Visitor not found'
            });
        }

        const visitor = result.rows[0];

        // Check if email already sent
        if (visitor.share_email_sent) {
            return res.status(200).json({
                success: true,
                alreadySent: true,
                message: 'Email was already sent'
            });
        }

        // Check if we have required data
        if (!visitor.email) {
            return res.status(200).json({
                success: false,
                error: 'No email address on record',
                skipped: true
            });
        }

        if (!visitor.slug) {
            return res.status(200).json({
                success: false,
                error: 'No shareable slug configured',
                skipped: true
            });
        }

        // Build share URL
        const baseUrl = process.env.SHARE_LINK_BASE_URL || 'https://mb.membies.com';
        const shareUrl = `${baseUrl}/${visitor.slug}`;

        // Extract domain from website
        let displayDomain = domain;
        if (!displayDomain && visitor.website) {
            try {
                const url = visitor.website.startsWith('http')
                    ? visitor.website
                    : `https://${visitor.website}`;
                displayDomain = new URL(url).hostname.replace(/^www\./, '');
            } catch {
                displayDomain = visitor.website;
            }
        }

        // Send email
        console.log(`[trigger-email] Sending shareable link to ${visitor.email} for ${displayDomain}`);

        const emailResult = await sendShareableLinkEmail({
            to: visitor.email,
            domain: displayDomain,
            shareUrl: shareUrl,
            companyName: visitor.companyname
        });

        // Update database to mark email as sent
        await pool.query(
            `UPDATE websitevisitors
             SET share_email_sent = TRUE, first_message_at = NOW()
             WHERE sessionid = $1`,
            [sessionID]
        );

        console.log(`[trigger-email] Email sent successfully to ${visitor.email}`);

        return res.status(200).json({
            success: true,
            emailSent: true,
            shareUrl: shareUrl,
            messageId: emailResult?.data?.id
        });

    } catch (err) {
        console.error('[trigger-email] Error:', err.message);

        // Don't fail the request - email is non-critical
        return res.status(200).json({
            success: false,
            error: err.message,
            skipped: true
        });
    }
}
