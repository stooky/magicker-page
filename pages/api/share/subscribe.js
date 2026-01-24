// pages/api/share/subscribe.js
// Subscribe an email to receive the shareable link for an existing domain
const pool = require('../../../components/utils/database');
import { sendShareableLinkEmail, isEmailConfigured } from '../../../lib/emailService';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, domain, slug } = req.body;

    if (!email || !domain) {
        return res.status(400).json({
            success: false,
            error: 'Email and domain are required'
        });
    }

    // Normalize domain
    const normalizedDomain = domain
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/$/, '')
        .toLowerCase();

    console.log(`[subscribe] New subscription request: ${email} for ${normalizedDomain}`);

    try {
        // Insert subscriber (ON CONFLICT handles duplicates gracefully)
        const insertResult = await pool.query(
            `INSERT INTO domain_subscribers (domain, email)
             VALUES ($1, $2)
             ON CONFLICT (domain, email) DO UPDATE SET subscribed_at = NOW()
             RETURNING id, email_sent`,
            [normalizedDomain, email]
        );

        const subscriberId = insertResult.rows[0].id;
        const alreadySentEmail = insertResult.rows[0].email_sent;

        // If we already sent this person an email, don't send again
        if (alreadySentEmail) {
            console.log(`[subscribe] Email already sent to ${email} for ${normalizedDomain}`);
            return res.status(200).json({
                success: true,
                alreadySubscribed: true,
                message: 'You already received the shareable link for this domain'
            });
        }

        // Get the chatbot config for this domain to build the share URL
        const configResult = await pool.query(
            `SELECT slug, companyname, website
             FROM websitevisitors
             WHERE slug = $1
             LIMIT 1`,
            [slug]
        );

        if (configResult.rows.length === 0) {
            console.log(`[subscribe] No chatbot found for slug: ${slug}`);
            return res.status(404).json({
                success: false,
                error: 'Chatbot not found for this domain'
            });
        }

        const chatbot = configResult.rows[0];
        const shareUrl = `${process.env.SHARE_LINK_BASE_URL || 'https://mb.membies.com'}/${chatbot.slug}`;

        // Send the shareable link email
        if (isEmailConfigured()) {
            try {
                console.log(`[subscribe] Sending shareable link to ${email}`);

                await sendShareableLinkEmail({
                    to: email,
                    domain: normalizedDomain,
                    shareUrl: shareUrl,
                    companyName: chatbot.companyname
                });

                // Mark email as sent
                await pool.query(
                    `UPDATE domain_subscribers
                     SET email_sent = TRUE, email_sent_at = NOW()
                     WHERE id = $1`,
                    [subscriberId]
                );

                console.log(`[subscribe] Email sent successfully to ${email}`);

                return res.status(200).json({
                    success: true,
                    emailSent: true,
                    shareUrl: shareUrl,
                    message: 'Shareable link sent to your email!'
                });
            } catch (emailError) {
                console.error(`[subscribe] Failed to send email:`, emailError.message);
                // Still return success - they're subscribed, email just failed
                return res.status(200).json({
                    success: true,
                    emailSent: false,
                    shareUrl: shareUrl,
                    message: 'Subscribed, but email delivery failed. Here is your link.',
                    error: emailError.message
                });
            }
        } else {
            console.log(`[subscribe] Email not configured, returning share URL directly`);
            return res.status(200).json({
                success: true,
                emailSent: false,
                shareUrl: shareUrl,
                message: 'Email not configured. Here is your shareable link.'
            });
        }

    } catch (err) {
        console.error('[subscribe] Database error:', err.message);
        return res.status(200).json({
            success: false,
            error: 'Failed to subscribe'
        });
    }
}
