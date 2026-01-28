import fs from 'fs';
import path from 'path';

// Ensure screenshots directory exists
const screenshotsDir = path.join(process.cwd(), 'public', 'screenshots');

// Cleanup old screenshots (runs periodically, non-blocking)
let lastCleanup = 0;
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // Run at most once per day
const MAX_SCREENSHOT_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

function cleanupOldScreenshots() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return; // Skip if ran recently
    lastCleanup = now;

    // Run cleanup async, don't block the request
    setImmediate(() => {
        try {
            if (!fs.existsSync(screenshotsDir)) return;

            const files = fs.readdirSync(screenshotsDir);
            let deletedCount = 0;

            for (const file of files) {
                try {
                    const filepath = path.join(screenshotsDir, file);
                    const stats = fs.statSync(filepath);
                    if (now - stats.mtimeMs > MAX_SCREENSHOT_AGE) {
                        fs.unlinkSync(filepath);
                        deletedCount++;
                    }
                } catch (e) {
                    // Skip files that can't be accessed
                }
            }

            if (deletedCount > 0) {
                console.log(`[screenshot-cleanup] Deleted ${deletedCount} old screenshots`);
            }
        } catch (err) {
            console.log('[screenshot-cleanup] Cleanup failed (non-critical):', err.message);
        }
    });
}

export default async function handler(req, res) {
    // Trigger periodic cleanup (non-blocking)
    cleanupOldScreenshots();

    const { url, sessionID } = req.query;

    if (!url) {
        console.error("Website URL is required");
        return res.status(400).json({ error: "Website URL is required" });
    }

    if (!sessionID) {
        console.error("sessionID is required");
        return res.status(400).json({ error: "sessionID is required" });
    }

    const token = process.env.SCREENSHOTAPI_TOKEN;

    // Debug: Log token value (first 8 chars only for security)
    console.log("Token loaded:", token ? `${token.substring(0, 8)}...` : 'UNDEFINED');
    console.log("All env vars with SCREENSHOT:", Object.keys(process.env).filter(k => k.includes('SCREENSHOT')));

    if (!token) {
        console.error("ScreenshotAPI token is not set");
        return res.status(500).json({ error: "ScreenshotAPI token is not set" });
    }

    console.log("Requesting screenshot for URL:", url);
    console.log("Using sessionID:", sessionID);

    try {
        const encodedUrl = encodeURIComponent(url);
        const apiUrl = `https://shot.screenshotapi.net/screenshot?token=${token}&url=${encodedUrl}&output=image&file_type=png&sessionID=${sessionID}`;
        console.log("API URL:", apiUrl);

        const response = await fetch(apiUrl);
        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            let errorData;

            if (contentType && contentType.includes('application/json')) {
                errorData = await response.json();
            } else {
                const errorText = await response.text();
                console.error("Screenshot API returned non-JSON error:", errorText.substring(0, 200));
                errorData = `API returned error: ${response.status} ${response.statusText}`;
            }

            console.error("Error fetching screenshot:", errorData);
            return res.status(500).json({ error: errorData });
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = buffer.toString('base64');
        const imageUrl = `data:image/png;base64,${base64Image}`;

        // Save screenshot to disk for persistence
        try {
            if (!fs.existsSync(screenshotsDir)) {
                fs.mkdirSync(screenshotsDir, { recursive: true });
            }
            const filename = `${sessionID}.png`;
            const filepath = path.join(screenshotsDir, filename);
            fs.writeFileSync(filepath, buffer);
            console.log("Screenshot saved to:", filepath);
        } catch (saveErr) {
            console.log("Failed to save screenshot to disk (non-critical):", saveErr.message);
        }

        // Return both the image and the sessionID for further processing
        console.log("Thumbnail successfully captured and generated.");
        return res.status(200).json({
            screenshotUrl: imageUrl,
            screenshotPath: `/screenshots/${sessionID}.png`,
            sessionID
        });
    } catch (error) {
        console.error("Failed to fetch screenshot:", error);
        return res.status(500).json({ error: "Failed to fetch screenshot" });
    }
}
