// pages/api/dbUpdateVisitor.js
const pool = require('../../components/utils/database');

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { sessionID, myListingUrl, slug, botTheme, kbFileId } = req.body;

        try {
            // Build dynamic update query based on provided fields
            const updates = [];
            const values = [];
            let paramIndex = 1;

            if (myListingUrl !== undefined) {
                updates.push(`mylistingurl = $${paramIndex++}`);
                values.push(myListingUrl);
            }
            if (slug !== undefined) {
                updates.push(`slug = $${paramIndex++}`);
                values.push(slug);
            }
            if (botTheme !== undefined) {
                updates.push(`bot_theme = $${paramIndex++}::jsonb`);
                values.push(typeof botTheme === 'string' ? botTheme : JSON.stringify(botTheme));
            }
            if (kbFileId !== undefined) {
                updates.push(`kb_file_id = $${paramIndex++}`);
                values.push(kbFileId);
            }

            if (updates.length === 0) {
                return res.status(400).json({ message: 'No fields to update' });
            }

            values.push(sessionID);
            const query = `
                UPDATE websitevisitors
                SET ${updates.join(', ')}, updated_at = NOW()
                WHERE sessionid = $${paramIndex}
                RETURNING *;
            `;
            const result = await pool.query(query, values);

            if (result.rows.length > 0) {
                res.status(200).json({ message: 'Data updated', data: result.rows[0] });
            } else {
                res.status(404).json({ message: 'No data found to update' });
            }
        } catch (err) {
            console.log('Database unavailable - visitor not updated:', err.message);
            // Return success even if database is unavailable (non-critical for UX)
            res.status(200).json({
                success: false,
                message: 'Database unavailable - visitor data not updated',
                note: 'Flow continues without database'
            });
        }
    } else {
        res.status(405).json({ message: 'Method not allowed' });
    }
}
