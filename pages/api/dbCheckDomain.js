// pages/api/dbCheckDomain.js
// Check if a domain has already been scraped
const pool = require('../../components/utils/database');

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const { website } = req.query;

        if (!website) {
            return res.status(400).json({ error: 'Website parameter is required' });
        }

        try {
            // Normalize the URL (remove protocol, www, trailing slash)
            const normalizedWebsite = website
                .replace(/^https?:\/\//, '')
                .replace(/^www\./, '')
                .replace(/\/$/, '');

            // Prefer records with valid bot config (mylistingurl is JSON, not EMPTY)
            // Convert screenshoturl from bytea to text if needed
            const query = `
                SELECT sessionid, email, website, companyname, mylistingurl, slug,
                    CASE
                        WHEN screenshoturl IS NULL THEN NULL
                        ELSE convert_from(screenshoturl::bytea, 'UTF8')
                    END as screenshoturl,
                    created_at
                FROM websitevisitors
                WHERE REPLACE(REPLACE(REPLACE(website, 'http://', ''), 'https://', ''), 'www.', '') LIKE $1
                ORDER BY
                    CASE WHEN mylistingurl IS NOT NULL AND mylistingurl != 'EMPTY' AND mylistingurl LIKE '{%' THEN 0 ELSE 1 END,
                    created_at DESC
                LIMIT 1;
            `;

            const result = await pool.query(query, [`%${normalizedWebsite}%`]);

            if (result.rows.length > 0) {
                // Domain exists - return the data
                res.status(200).json({
                    exists: true,
                    data: result.rows[0]
                });
            } else {
                // Domain is new
                res.status(200).json({
                    exists: false
                });
            }
        } catch (err) {
            console.log('Database unavailable - treating domain as new:', err.message);
            // Return exists: false if database is unavailable (graceful degradation)
            res.status(200).json({
                exists: false,
                note: 'Database unavailable - treating as new domain'
            });
        }
    } else {
        res.status(405).json({ message: 'Method not allowed' });
    }
}
