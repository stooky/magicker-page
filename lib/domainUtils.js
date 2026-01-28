/**
 * Domain extraction and normalization utilities.
 * Centralized to avoid duplicated regex across the codebase.
 */

/**
 * Extract normalized domain from a URL.
 * Strips protocol, www prefix, and trailing slashes.
 *
 * @param {string} url - URL or domain string
 * @returns {string} Normalized domain (e.g., "example.com")
 */
export function extractDomain(url) {
    if (!url || typeof url !== 'string') return url || '';
    try {
        const parsed = url.startsWith('http') ? new URL(url) : new URL(`https://${url}`);
        return parsed.hostname.replace(/^www\./, '');
    } catch {
        // Fallback for malformed URLs
        return url
            .replace(/^https?:\/\//i, '')
            .replace(/^www\./i, '')
            .split('/')[0]
            .toLowerCase();
    }
}

/**
 * Normalize a URL for database comparison.
 * Strips protocol, www prefix, and trailing slash.
 *
 * @param {string} url - URL string
 * @returns {string} Normalized URL for comparison
 */
export function normalizeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    return url
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .replace(/\/$/i, '')
        .toLowerCase();
}

/**
 * Check if two URLs point to the same domain.
 *
 * @param {string} url1 - First URL
 * @param {string} url2 - Second URL
 * @returns {boolean}
 */
export function isSameDomain(url1, url2) {
    return extractDomain(url1) === extractDomain(url2);
}

// CommonJS export for API routes that use require()
module.exports = { extractDomain, normalizeUrl, isSameDomain };
