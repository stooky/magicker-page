// pages/api/dbInsertVisitor.js
const pool = require('../../components/utils/database');
const { Resend } = require('resend');

// Initialize Resend (lazy - only if API key exists)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Fire-and-forget signup notification
async function notifySignup(email, website) {
    console.log('[EMAIL] notifySignup called for:', email, website);
    console.log('[EMAIL] Resend configured:', !!resend);
    console.log('[EMAIL] NOTIFY_EMAIL:', process.env.NOTIFY_EMAIL || '(not set)');

    if (!resend) {
        console.log('[EMAIL] Resend not initialized (missing RESEND_API_KEY)');
        return;
    }
    const notifyTo = process.env.NOTIFY_EMAIL;
    if (!notifyTo) {
        console.log('[EMAIL] NOTIFY_EMAIL not configured, skipping notification');
        return;
    }
    try {
        console.log('[EMAIL] Sending to:', notifyTo);
        const result = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'Magic Page <noreply@membies.com>',
            to: notifyTo,
            subject: `New Magic Page Signup: ${website}`,
            text: `New signup!\n\nEmail: ${email}\nWebsite: ${website}\n\nTime: ${new Date().toISOString()}`
        });
        console.log('[EMAIL] Resend response:', JSON.stringify(result));
        console.log('[EMAIL] Signup notification sent to', notifyTo, 'for:', email);
    } catch (err) {
        console.log('[EMAIL] Failed to send notification:', err.message);
        console.log('[EMAIL] Full error:', JSON.stringify(err, null, 2));
    }
}

export default async function handler(req, res) {
    console.log('[dbInsertVisitor] Called with method:', req.method);

    if (req.method === 'POST') {
        const { sessionID, email, website, companyName, myListingUrl, screenshotUrl, slug } = req.body;
        console.log('[dbInsertVisitor] Inserting visitor:', { sessionID, email, website, slug });

        // Always try to send email notification (even if DB fails)
        notifySignup(email, website);

        try {
            const query = `
                INSERT INTO websitevisitors (sessionid, email, website, companyname, mylistingurl, screenshoturl, slug)
                VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
            `;
            const values = [sessionID, email, website, companyName, myListingUrl, screenshotUrl, slug];
            const result = await pool.query(query, values);
            console.log('[dbInsertVisitor] Insert successful, slug:', slug);

            res.status(200).json({ message: 'Data inserted', data: result.rows[0] });
        } catch (err) {
            console.log('[dbInsertVisitor] Database error:', err.message);
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
