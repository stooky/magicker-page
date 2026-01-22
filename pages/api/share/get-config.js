// pages/api/share/get-config.js
// Load shareable chatbot config by slug
const pool = require('../../../components/utils/database');

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { slug } = req.query;

    if (!slug) {
        return res.status(400).json({
            success: false,
            error: 'Slug is required'
        });
    }

    try {
        // Query by slug
        const query = `
            SELECT
                sessionid,
                email,
                website,
                companyname,
                screenshoturl,
                bot_theme,
                kb_file_id,
                slug,
                created_at
            FROM websitevisitors
            WHERE slug = $1
            LIMIT 1;
        `;
        const result = await pool.query(query, [slug.toLowerCase()]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Chatbot not found'
            });
        }

        const row = result.rows[0];

        // Extract domain from website URL
        let domain = '';
        try {
            const url = row.website.startsWith('http') ? row.website : `https://${row.website}`;
            domain = new URL(url).hostname.replace(/^www\./, '');
        } catch {
            domain = row.website;
        }

        // Increment visit counter (fire and forget)
        pool.query(
            'UPDATE websitevisitors SET share_link_visits = COALESCE(share_link_visits, 0) + 1 WHERE slug = $1',
            [slug.toLowerCase()]
        ).catch(() => {}); // Ignore errors

        // Parse bot_theme if it's a string
        let botTheme = row.bot_theme;
        if (typeof botTheme === 'string') {
            try {
                botTheme = JSON.parse(botTheme);
            } catch {
                botTheme = null;
            }
        }

        return res.status(200).json({
            success: true,
            data: {
                sessionId: row.sessionid,
                domain: domain,
                website: row.website,
                companyName: row.companyname,
                screenshotUrl: row.screenshoturl,
                botTheme: botTheme,
                kbFileId: row.kb_file_id,
                slug: row.slug,
                createdAt: row.created_at
            }
        });
    } catch (err) {
        console.error('[get-config] Database error:', err.message);
        return res.status(500).json({
            success: false,
            error: 'Failed to load chatbot config'
        });
    }
}
