/**
 * Generate JWT authentication token for Botpress
 * Returns a signed JWT with domain in userData for context-aware bot responses
 *
 * POST /api/botpress/get-auth-token
 * Body: { domain, sessionID }
 */
import jwt from 'jsonwebtoken';
import { logInfo, logError } from '../../../lib/botpressLogger';
import { DEBUG_BOTPRESS_REQUESTS, DEBUG_OPTIONS, logBotpressRequest, logBotpressResponse } from '../../../configuration/debugConfig';

export default async function handler(req, res) {
    logInfo('JWT Auth Token Request', { domain: req.body.domain, sessionID: req.body.sessionID });
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { domain, sessionID } = req.body;

    if (!domain || !sessionID) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: domain, sessionID'
        });
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        console.error('JWT_SECRET not configured');
        return res.status(500).json({
            success: false,
            error: 'JWT secret not configured'
        });
    }

    try {
        // JWT payload with domain in userData
        const jwtPayload = {
            userData: {
                domain: domain,
                sessionID: sessionID
            }
        };

        const jwtOptions = { expiresIn: '1h' };

        // Debug log the JWT creation request
        if (DEBUG_BOTPRESS_REQUESTS && DEBUG_OPTIONS.LOG_JWT_REQUESTS) {
            logBotpressRequest('JWT', 'Generate authentication token', {
                payload: jwtPayload,
                options: jwtOptions,
                domain: domain,
                sessionID: sessionID
            });
        }

        // Generate JWT token with domain in userData
        // Botpress will expose this at event.userData.domain
        const token = jwt.sign(jwtPayload, jwtSecret, jwtOptions);

        // Debug log the JWT response (show decoded payload, not the secret)
        if (DEBUG_BOTPRESS_REQUESTS && DEBUG_OPTIONS.LOG_JWT_REQUESTS) {
            logBotpressResponse('JWT', 'Token generated', {
                tokenPreview: token.substring(0, 50) + '...',
                decodedPayload: jwt.decode(token),
                expiresIn: '1h'
            });
        }

        console.log(`Generated JWT for domain: ${domain}, sessionID: ${sessionID}`);

        res.status(200).json({
            success: true,
            authToken: token,
            domain: domain,
            expiresIn: '1h'
        });

    } catch (error) {
        console.error('Error generating JWT:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate auth token',
            details: error.message
        });
    }
}
