// pages/api/screenshot/[id].js
// Serve screenshot files dynamically (production workaround)
import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
    const { id } = req.query;

    // Validate ID (alphanumeric only, prevent path traversal)
    if (!id || !/^[a-zA-Z0-9]+$/.test(id)) {
        return res.status(400).json({ error: 'Invalid screenshot ID' });
    }

    const screenshotPath = path.join(process.cwd(), 'public', 'screenshots', `${id}.png`);

    if (!fs.existsSync(screenshotPath)) {
        return res.status(404).json({ error: 'Screenshot not found' });
    }

    try {
        const file = fs.readFileSync(screenshotPath);
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        res.send(file);
    } catch (err) {
        console.error('Error serving screenshot:', err);
        res.status(500).json({ error: 'Failed to serve screenshot' });
    }
}
