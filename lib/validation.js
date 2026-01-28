/**
 * Shared input validation utilities for API routes.
 */

function isValidEmail(email) {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUrl(url) {
    if (typeof url !== 'string' || url.trim().length === 0) return false;
    try {
        new URL(url.startsWith('http') ? url : `https://${url}`);
        return true;
    } catch {
        return false;
    }
}

module.exports = { isValidEmail, isValidUrl };
