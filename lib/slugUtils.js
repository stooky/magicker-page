/**
 * Convert a domain to a URL-safe slug
 *
 * Examples:
 *   gibbonheating.com -> gibbonheating-com
 *   www.example.co.uk -> example-co-uk
 *   sub.domain.org -> sub-domain-org
 *
 * @param {string} domain - The domain to convert
 * @returns {string} URL-safe slug
 */
export function domainToSlug(domain) {
    if (!domain) return '';

    return domain
        .toLowerCase()
        .replace(/^www\./, '')           // Remove www prefix
        .replace(/[^a-z0-9.-]/g, '')     // Keep only alphanumeric, dots, hyphens
        .replace(/\./g, '-')             // Replace dots with dashes
        .replace(/-+/g, '-')             // Collapse multiple dashes
        .replace(/^-|-$/g, '');          // Trim leading/trailing dashes
}

/**
 * Convert a slug back to a domain (best effort)
 * Note: This is lossy - we can't know if it was .com, .co.uk, etc.
 *
 * @param {string} slug - The slug to convert
 * @returns {string} Approximate domain
 */
export function slugToDomain(slug) {
    if (!slug) return '';

    // Replace last dash with dot for TLD, keep others as-is
    // This handles simple cases like gibbonheating-com -> gibbonheating.com
    return slug.replace(/-([a-z]{2,})$/, '.$1');
}

/**
 * Extract domain from a URL
 *
 * @param {string} url - Full URL or domain
 * @returns {string} Domain without protocol or path
 */
export function extractDomain(url) {
    if (!url) return '';

    try {
        // Add protocol if missing for URL parsing
        const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;
        const parsed = new URL(urlWithProtocol);
        return parsed.hostname;
    } catch {
        // If URL parsing fails, do basic extraction
        return url
            .replace(/^https?:\/\//, '')
            .replace(/\/.*$/, '')
            .toLowerCase();
    }
}
