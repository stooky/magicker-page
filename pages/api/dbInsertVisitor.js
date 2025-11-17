// pages/api/dbInsertVisitor.js
const pool = require('../../components/utils/database');

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
