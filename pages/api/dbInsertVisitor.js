// pages/api/dbInsertVisitor.js
const pool = require('../../components/utils/database');
const { Resend } = require('resend');

// Initialize Resend (lazy - only if API key exists)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Fire-and-forget signup notification
async function notifySignup(email, website) {
    if (!resend) return;
    const notifyTo = process.env.NOTIFY_EMAIL;
    if (!notifyTo) {
        console.log('[EMAIL] NOTIFY_EMAIL not configured, skipping notification');
        return;
    }
    try {
        await resend.emails.send({
            from: process.env.EMAIL_FROM || 'Magic Page <noreply@membies.com>',
            to: notifyTo,
            subject: `New Magic Page Signup: ${website}`,
            text: `New signup!\n\nEmail: ${email}\nWebsite: ${website}\n\nTime: ${new Date().toISOString()}`
        });
        console.log('[EMAIL] Signup notification sent to', notifyTo, 'for:', email);
    } catch (err) {
        console.log('[EMAIL] Failed to send notification (non-critical):', err.message);
    }
}

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { sessionID, email, website, companyName, myListingUrl, screenshotUrl } = req.body;

        try {
            const query = `
                INSERT INTO websitevisitors (sessionid, email, website, companyname, mylistingurl, screenshoturl)
                VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
            `;
            const values = [sessionID, email, website, companyName, myListingUrl, screenshotUrl];
            const result = await pool.query(query, values);

            // Send signup notification (fire-and-forget, don't await)
            notifySignup(email, website);

            res.status(200).json({ message: 'Data inserted', data: result.rows[0] });
        } catch (err) {
            console.log('Database unavailable - visitor not saved:', err.message);
            // Return success even if database is unavailable (non-critical for UX)
            res.status(200).json({
                success: false,
                message: 'Database unavailable - visitor data not saved',
                note: 'Flow continues without database'
            });
        }
    } else {
        res.status(405).json({ message: 'Method not allowed' });
    }
}
