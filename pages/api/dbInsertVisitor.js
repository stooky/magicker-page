// pages/api/dbInsertVisitor.js
// Note: Signup notifications are handled by /api/notify-signup (called from frontend)
// This file only handles database insertion
const pool = require('../../components/utils/database');
const { isValidEmail, isValidUrl } = require('../../lib/validation');

export default async function handler(req, res) {
    console.log('[dbInsertVisitor] Called with method:', req.method);

    if (req.method === 'POST') {
        const { sessionID, email, website, companyName, myListingUrl, screenshotUrl, slug, botTheme, kbFileId } = req.body;

        if (email && !isValidEmail(email)) {
            return res.status(400).json({ success: false, error: 'Invalid email format' });
        }
        if (website && !isValidUrl(website)) {
            return res.status(400).json({ success: false, error: 'Invalid website URL' });
        }

        console.log('[dbInsertVisitor] Inserting visitor:', { sessionID, email, website, slug, hasTheme: !!botTheme });

        try {
            // Serialize botTheme to JSON string if provided
            const botThemeJson = botTheme ? (typeof botTheme === 'string' ? botTheme : JSON.stringify(botTheme)) : null;

            const query = `
                INSERT INTO websitevisitors (sessionid, email, website, companyname, mylistingurl, screenshoturl, slug, bot_theme, kb_file_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9) RETURNING *;
            `;
            const values = [sessionID, email, website, companyName, myListingUrl, screenshotUrl, slug, botThemeJson, kbFileId || null];
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
