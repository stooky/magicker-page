// pages/api/dbUpdateVisitor.js
const pool = require('../../components/utils/database');

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { sessionID, myListingUrl } = req.body;

        try {
            const query = `
                UPDATE websitevisitors SET mylistingurl = $1 WHERE sessionid = $2 RETURNING *;
            `;
            const values = [myListingUrl, sessionID];
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
